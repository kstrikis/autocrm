import { type Context, type AppSyncResolverHandler } from '@aws-lambda/powertools-alpha';
import { logger } from '@/lib/logger';

interface Arguments {
  userId: string;
  role: 'customer' | 'service_rep' | 'admin';
}

export const handler: AppSyncResolverHandler<Arguments> = async (event, context: Context) => {
  logger.methodEntry('updateUserRole.handler', { userId: event.arguments.userId, role: event.arguments.role });

  try {
    // Get the current user's role from the JWT claims
    const userRole = event.identity?.claims?.['custom:role'];
    if (userRole !== 'admin') {
      logger.error('updateUserRole: Unauthorized - not an admin', { userRole });
      throw new Error('Unauthorized - Admin role required');
    }

    // Get current admins to prevent removing last admin
    const { data: admins, error: adminsError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin');

    if (adminsError) {
      logger.error('updateUserRole: Error fetching admins', { error: adminsError });
      throw adminsError;
    }

    // If changing from admin to another role, ensure it's not the last admin
    if (event.arguments.role !== 'admin' && admins.length === 1 && admins[0].id === event.arguments.userId) {
      logger.error('updateUserRole: Cannot remove last admin', { userId: event.arguments.userId });
      throw new Error('Cannot remove last admin role');
    }

    // Update the user's role in a transaction
    const { data: updatedUser, error: updateError } = await supabase
      .rpc('update_user_role', {
        p_user_id: event.arguments.userId,
        p_role: event.arguments.role
      });

    if (updateError) {
      logger.error('updateUserRole: Error updating role', { error: updateError });
      throw updateError;
    }

    logger.info('updateUserRole: Successfully updated role', { 
      userId: event.arguments.userId, 
      newRole: event.arguments.role 
    });

    return updatedUser;
  } catch (error) {
    logger.error('updateUserRole: Unexpected error', { error });
    throw error;
  } finally {
    logger.methodExit('updateUserRole.handler');
  }
};
