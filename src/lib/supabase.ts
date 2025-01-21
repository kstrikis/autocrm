import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { v4 as uuidv4 } from 'uuid'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

logger.info('Initializing Supabase client', { url: supabaseUrl })
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

const ANIMAL_NAMES = [
  'Aardvark', 'Bear', 'Cheetah', 'Dolphin', 'Elephant',
  'Fox', 'Giraffe', 'Hippo', 'Iguana', 'Jaguar',
  'Kangaroo', 'Lion', 'Monkey', 'Narwhal', 'Octopus',
  'Penguin', 'Quokka', 'Raccoon', 'Sloth', 'Tiger',
  'Unicorn', 'Vulture', 'Walrus', 'Xenops', 'Yak',
  'Zebra'
]

export function generateAnonymousName(): string {
  const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)]
  return `Anonymous ${randomAnimal}`
}

// Interface matching GraphQL schema (using camelCase as defined in schema directives)
export interface User {
  id: string
  name: string
  isGuest: boolean
  status: 'online' | 'away' | 'offline'
  createdAt: string
  lastSeen: string
}

export async function findOrCreateUser(name: string): Promise<User> {
  logger.methodEntry('findOrCreateUser', { name })
  try {
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .single()

    if (findError && findError.code !== 'PGRST116') {
      throw findError
    }

    if (existingUser) {
      logger.methodExit('findOrCreateUser', { existingUser })
      return existingUser as User
    }

    const newUserData = {
      name,
      isGuest: true,
      status: 'online' as const
    }

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([newUserData])
      .select()
      .single()

    if (createError) {
      throw createError
    }

    // Ensure general channel exists
    const generalChannelId = 'c0d46316-9e1d-4e8b-a7e7-b0a46c17c58c'
    const { data: generalChannel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', generalChannelId)
      .single()

    if (channelError && channelError.code !== 'PGRST116') {
      throw channelError
    }

    // Create general channel if it doesn't exist
    if (!generalChannel) {
      const { error: createChannelError } = await supabase
        .from('channels')
        .insert([{
          id: generalChannelId,
          name: 'general',
          description: 'Team-wide discussions and updates',
          type: 'public'
        }])

      if (createChannelError) {
        throw createChannelError
      }
    }

    // Join the general channel
    const channelMemberData = {
      channelId: generalChannelId,
      userId: newUser.id
    }

    const { error: joinError } = await supabase
      .from('channel_members')
      .insert([channelMemberData])

    if (joinError) {
      throw joinError
    }

    logger.methodExit('findOrCreateUser', { newUser })
    return newUser as User
  } catch (error) {
    logger.error(error as Error, 'findOrCreateUser')
    throw error
  }
}

export async function updateUserStatus(
  userId: string,
  status: 'online' | 'away' | 'offline'
): Promise<void> {
  try {
    const updateData = {
      status,
      lastSeen: new Date().toISOString()
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      throw error
    }
  } catch (error) {
    logger.error(error as Error, 'updateUserStatus')
    throw error
  }
}

export interface RealtimeChangePayload<T = any> {
  new: T | null
  old: T | null
  errors: any[] | null
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
}

export function subscribeToUsers(callback: (payload: RealtimeChangePayload) => void): { unsubscribe: () => void } {
  const subscription = supabase
    .channel('public:users')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public',
      table: 'users'
    }, callback)
    .subscribe()

  return subscription
}

export const unsubscribe = (subscription: { unsubscribe: () => void }): void => {
  void subscription.unsubscribe()
}

export async function createChannel(name: string, description: string): Promise<Channel> {
  logger.methodEntry('createChannel', { name, description })

  const channelId = name === 'general' ? 'c0d46316-9e1d-4e8b-a7e7-b0a46c17c58c' : uuidv4()

  const { data, error } = await supabase
    .from('channels')
    .insert([{ id: channelId, name, description }])
    .select()
    .single()

  if (error) {
    logger.error(error, 'createChannel')
    throw error
  }

  logger.methodExit('createChannel', { channel: data })
  return data as Channel
}

export interface Channel {
  id: string
  name: string
  description: string
  type: string
  unreadCount: number
  createdAt: Date
  updatedAt: Date
} 