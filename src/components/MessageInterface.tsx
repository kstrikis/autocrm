import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface MessageInterfaceProps {
  ticketId: string
  isServiceRep: boolean
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

export default function MessageInterface({ ticketId, isServiceRep }: MessageInterfaceProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

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

    void loadMessages()

    return () => {
      void channel.unsubscribe()
      logger.methodExit('MessageInterface')
    }
  }, [ticketId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    logger.methodEntry('MessageInterface')

    if (!newMessage.trim()) {
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('message-create', {
        body: {
          content: newMessage.trim(),
          ticketId,
          isInternal,
          attachments: [] // TODO: Implement file upload
        }
      })

      if (error) {
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
      logger.error('Message submission failed', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ticketId,
        isInternal
      })
    }
  }

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
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full min-h-[100px] p-3 border rounded-lg"
          maxLength={2000}
        />
        <div className="flex justify-between items-center">
          {isServiceRep && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Internal Note</span>
            </label>
          )}
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
          >
            Send Message
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