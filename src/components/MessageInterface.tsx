import { useEffect, useRef, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

interface MessageResponse {
  id: string
  ticket_id: string
  sender_id: string
  content: string
  created_at: string
  is_internal: boolean
  attachments: string[]
}

export default function MessageInterface({ 
  ticketId, 
  isServiceRep, 
  assignedTo,
  onAssignmentChange 
}: MessageInterfaceProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  const canSendMessage = useMemo(() => {
    if (!currentUser) return false
    if (!isServiceRep) return true // Customers can always send messages
    return assignedTo === currentUser // Service reps must be assigned
  }, [currentUser, isServiceRep, assignedTo])

  useEffect(() => {
    // Get current user ID
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    logger.methodEntry('MessageInterface')
    
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          id,
          content,
          created_at,
          is_internal,
          sender:user_profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) {
        logger.error('Failed to load messages', { error })
        return
      }

      setMessages(data)
      logger.methodExit('MessageInterface')
    }

    // Set up realtime subscription
    const channel = supabase
      .channel('ticket-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`
      }, async (payload) => {
        // Fetch the complete message with user profile data
        const { data: messageWithSender } = await supabase
          .from('ticket_messages')
          .select(`
            id,
            content,
            created_at,
            is_internal,
            sender:user_profiles (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (messageWithSender) {
          setMessages(prev => [...prev, messageWithSender])
          logger.info('New message received')
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      })
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      void channel.unsubscribe()
      logger.methodExit('MessageInterface')
    }
  }, [ticketId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    logger.methodEntry('MessageInterface')

    if (!newMessage.trim() || !canSendMessage) {
      return
    }

    try {
      setError(null)
      const { data, error } = await supabase.functions.invoke('message-create', {
        body: {
          content: newMessage.trim(),
          ticketId,
          isInternal,
          attachments: []
        }
      })

      if (error) {
        setError('Failed to send message. Please try again.')
        logger.error('Message submission failed', { 
          error,
          ticketId,
          isInternal 
        })
        throw error
      }

      setNewMessage('')
      setIsInternal(false)
      logger.methodExit('MessageInterface')

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

  const handleAssignToMe = async () => {
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

  // Add a helper function to get the message input status
  const getInputStatus = () => {
    if (!currentUser) return { message: "Loading...", canSend: false }
    if (!isServiceRep) return { message: "", canSend: true }
    if (assignedTo === currentUser) return { message: "", canSend: true }
    return { 
      message: "You must be assigned to this ticket to send messages. Please assign the ticket to yourself first.",
      canSend: false 
    }
  }

  const { message: statusMessage, canSend } = getInputStatus()

  return (
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
        
        {statusMessage && (
          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded flex items-center justify-between">
            <span>{statusMessage}</span>
            {isServiceRep && !canSend && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAssignToMe}
                disabled={isAssigning}
              >
                {isAssigning ? 'Assigning...' : 'Assign to Me'}
              </Button>
            )}
          </div>
        )}

        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={canSend ? "Type your message..." : "You cannot send messages in this ticket"}
          className={`w-full min-h-[100px] p-3 border rounded-lg ${
            !canSend ? 'bg-gray-50 text-gray-500' : ''
          }`}
          maxLength={2000}
          disabled={!canSend}
        />

        <div className="flex justify-between items-center">
          {isServiceRep && (
            <label className={`flex items-center gap-2 ${!canSend ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300"
                disabled={!canSend}
              />
              <span className="text-sm">Internal Note</span>
            </label>
          )}
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || !canSend}
            variant={canSend ? "default" : "secondary"}
            className={!canSend ? 'opacity-50' : ''}
          >
            {canSend ? 'Send Message' : 'Cannot Send'}
          </Button>
        </div>

        {uploadProgress > 0 && (
          <progress 
            value={uploadProgress} 
            max="100"
            className="w-full"
          />
        )}
      </form>
    </div>
  )
} 