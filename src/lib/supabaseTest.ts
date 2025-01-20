import { supabase } from './supabase'
import type { User } from '../types/database'
import { logger } from './logger'

export async function getAllUsers(): Promise<User[]> {
  logger.methodEntry('getAllUsers')
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error(error, 'getAllUsers')
      throw error
    }

    logger.info('Successfully fetched users', { count: data?.length })
    logger.methodExit('getAllUsers', { count: data?.length })
    return data || []
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error('Failed to fetch users'), 'getAllUsers')
    throw error
  }
}

export async function createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
  logger.methodEntry('createUser', { user })
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single()

    if (error) {
      logger.error(error, 'createUser')
      throw error
    }

    logger.info('Successfully created user', { user: data })
    logger.methodExit('createUser', { user: data })
    return data
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error('Failed to create user'), 'createUser')
    throw error
  }
}

export async function testUserOperations(): Promise<boolean> {
  logger.methodEntry('testUserOperations')
  try {
    // Test creating a user
    const newUser = await createUser({
      name: 'Test User',
      email: 'test@example.com'
    })
    logger.info('Created test user', { user: newUser })

    // Test fetching users
    const users = await getAllUsers()
    logger.info('Fetched all users', { count: users.length })

    // Test deleting the test user if it was created
    if (newUser) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id)

      if (error) {
        logger.error(error, 'testUserOperations.deleteUser')
      } else {
        logger.info('Deleted test user', { userId: newUser.id })
      }
    }

    logger.methodExit('testUserOperations', { success: true })
    return true
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error('Test operations failed'), 'testUserOperations')
    logger.methodExit('testUserOperations', { success: false, error })
    return false
  }
} 