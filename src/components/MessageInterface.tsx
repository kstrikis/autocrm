import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/database.types'

type DbMessage = Database['public']['Tables']['ticket_messages']['Row'] & {
  sender: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

interface MessageInterfaceProps {
  ticketId: string
  isServiceRep: boolean
  assignedTo: string | null
  onAssignmentChange?: () => void
}

interface Message {
  id: string
  content: string
  created_at: string
  is_internal: boolean
  sender: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

// Transform function to convert DB type to our component type
const transformDbMessage = (msg: DbMessage): Message => ({
  id: msg.id,
  content: msg.content,
  created_at: msg.created_at,
  is_internal: msg.is_internal,
  sender: msg.sender || {
    id: msg.sender_id,
    full_name: 'Unknown',
    avatar_url: null
  }
})

export default function MessageInterface({ 
  ticketId, 
  isServiceRep, 
  assignedTo,
  onAssignmentChange 
}: MessageInterfaceProps): React.ReactElement {
  logger.methodEntry('MessageInterface');

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  const canSendMessage = (): boolean => {
    if (!currentUser) return false
    if (!isServiceRep) return true // Customers can always send messages
    return assignedTo === currentUser // Service reps must be assigned
  }

  useEffect(() => {
    // Get current user ID
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user?.id ?? null)
    })
  }, [])

  useEffect((): (() => void) => {
    const loadMessages = async (): Promise<void> => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          id,
          content,
          created_at,
          is_internal,
          sender_id,
          ticket_id,
          attachments,
          sender:user_profiles!sender_id(id, full_name, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) {
        logger.error('Failed to load messages', { error })
        return
      }

      if (data) {
        const typedData = data as unknown as DbMessage[]
        // Filter out internal messages for non-service reps
        const filteredData = isServiceRep 
          ? typedData 
          : typedData.filter(msg => !msg.is_internal)
        setMessages(filteredData.map(transformDbMessage))
      }
    }

    void loadMessages()

    // Set up realtime subscription
    const channel = supabase
      .channel('ticket-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`
      }, async (payload): Promise<void> => {
        // Fetch the complete message with user profile data
        const { data: messageWithSender } = await supabase
          .from('ticket_messages')
          .select(`
            id,
            content,
            created_at,
            is_internal,
            sender_id,
            ticket_id,
            attachments,
            sender:user_profiles!sender_id(id, full_name, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single()

        if (messageWithSender) {
          const typedMessage = messageWithSender as unknown as DbMessage
          // Only add the message if it's not internal or if the user is a service rep
          if (!typedMessage.is_internal || isServiceRep) {
            setMessages(prev => [...prev, transformDbMessage(typedMessage)])
            logger.info('New message received')
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }
        }
      })
      .subscribe()

    return (): void => {
      void channel.unsubscribe()
    }
  }, [ticketId, isServiceRep])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    logger.methodEntry('MessageInterface.handleSubmit')

    if (!newMessage.trim() || !canSendMessage()) {
      return
    }

    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const { error: submitError } = await supabase.functions.invoke('message-create', {
        body: {
          content: newMessage.trim(),
          ticketId,
          isInternal,
          attachments: []
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (submitError) {
        setError('Failed to send message. Please try again.')
        logger.error('Message submission failed', { 
          error: submitError,
          ticketId,
          isInternal 
        })
        throw submitError
      }

      setNewMessage('')
      setIsInternal(false)
      logger.methodExit('MessageInterface.handleSubmit')

    } catch (error) {
      setError('Failed to send message. Please try again.')
      logger.error('Message submission failed', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ticketId,
        isInternal
      })
    }
  }

  const handleAssignToMe = async (): Promise<void> => {
    logger.methodEntry('handleAssignToMe')
    setIsAssigning(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ assigned_to: currentUser })
        .eq('id', ticketId)

      if (updateError) {
        setError('Failed to assign ticket. Please try again.')
        logger.error('Failed to assign ticket', { error: updateError })
        return
      }

      onAssignmentChange?.()
      logger.info('Successfully assigned ticket', { ticketId, userId: currentUser })
    } catch (err) {
      setError('Failed to assign ticket. Please try again.')
      logger.error('Error assigning ticket', { 
        error: err instanceof Error ? err.message : err 
      })
    } finally {
      setIsAssigning(false)
      logger.methodExit('handleAssignToMe')
    }
  }

  const result = (
    <div className="message-interface">
      <div className="message-list max-h-[500px] overflow-y-auto space-y-4 mb-4">
        {messages.map(message => (
          <div 
            key={message.id}
            className={`message p-4 rounded-lg ${
              message.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
            } ${
              message.sender?.id === currentUser ? 'ml-auto' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {message.sender?.avatar_url && (
                <img 
                  src={message.sender.avatar_url} 
                  alt={message.sender.full_name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{message.sender?.full_name}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                {message.is_internal && (
                  <Badge variant="outline" className="mt-2 bg-yellow-100">Internal Note</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        
        {!canSendMessage() && isServiceRep && (
          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded flex items-center justify-between">
            <span>You must be assigned to this ticket to send messages.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAssignToMe}
              disabled={isAssigning}
            >
              {isAssigning ? 'Assigning...' : 'Assign to Me'}
            </Button>
          </div>
        )}

        <textarea
          value={newMessage}
          onChange={(e): void => setNewMessage(e.target.value)}
          placeholder={canSendMessage() ? "Type your message..." : "You cannot send messages in this ticket"}
          className={`w-full min-h-[100px] p-3 border rounded-lg ${
            !canSendMessage() ? 'bg-gray-50 text-gray-500' : ''
          }`}
          maxLength={2000}
          disabled={!canSendMessage()}
        />

        <div className="flex justify-between items-center">
          {isServiceRep && (
            <label className={`flex items-center gap-2 ${!canSendMessage() ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e): void => setIsInternal(e.target.checked)}
                className="rounded border-gray-300"
                disabled={!canSendMessage()}
              />
              <span className="text-sm">Internal Note</span>
            </label>
          )}
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || !canSendMessage()}
            variant={canSendMessage() ? "default" : "secondary"}
            className={!canSendMessage() ? 'opacity-50' : ''}
          >
            {canSendMessage() ? 'Send Message' : 'Cannot Send'}
          </Button>
        </div>
      </form>
    </div>
  );

  logger.methodExit('MessageInterface');
  return result;
} 