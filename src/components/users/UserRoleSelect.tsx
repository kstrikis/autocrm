import { useState } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Database } from '@/lib/database.types';

type UserRole = Database['public']['Enums']['user_role'];

interface UserRoleSelectProps {
  userId: string;
  currentRole: UserRole;
  onRoleChange: (newRole: UserRole) => void;
}

export function UserRoleSelect({ userId, currentRole, onRoleChange }: UserRoleSelectProps): React.ReactElement {
  logger.methodEntry('UserRoleSelect');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (newRole: UserRole): Promise<void> => {
    logger.methodEntry('UserRoleSelect.handleRoleChange', { userId, newRole });
    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        logger.error('UserRoleSelect: Failed to update user role', { error });
        throw error;
      }

      logger.info('UserRoleSelect: Successfully updated user role', { userId, newRole });
      onRoleChange(newRole);
    } catch (error) {
      logger.error('UserRoleSelect: Error updating user role', { error });
    } finally {
      setLoading(false);
      logger.methodExit('UserRoleSelect.handleRoleChange');
    }
  };

  const result = (
    <Select
      value={currentRole}
      onValueChange={(value: UserRole) => void handleRoleChange(value)}
      disabled={loading}
    >
      <SelectTrigger className="w-[130px]">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="customer">Customer</SelectItem>
        <SelectItem value="service_rep">Service Rep</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );

  logger.methodExit('UserRoleSelect');
  return result;
}
