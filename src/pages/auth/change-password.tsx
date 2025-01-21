import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import zxcvbn from 'zxcvbn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => {
      const result = zxcvbn(password);
      return result.score >= 3;
    }, 'Password is too weak. Try adding numbers, symbols, or making it longer.'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function ChangePassword(): React.ReactElement {
  logger.methodEntry('ChangePassword');
  const { toast } = useToast();
  const [passwordStrength, setPasswordStrength] = React.useState(0);
  const [passwordFeedback, setPasswordFeedback] = React.useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // Watch password field for strength calculation
  const newPassword = watch('newPassword');
  React.useEffect(() => {
    if (newPassword) {
      const result = zxcvbn(newPassword);
      setPasswordStrength(result.score * 25);
      setPasswordFeedback(result.feedback.warning || result.feedback.suggestions[0] || '');
    } else {
      setPasswordStrength(0);
      setPasswordFeedback('');
    }
  }, [newPassword]);

  const onSubmit = async (data: ChangePasswordFormData): Promise<void> => {
    logger.methodEntry('ChangePassword.onSubmit');
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) {
        logger.error(error, 'handleSubmit');
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Your password has been updated successfully.',
      });
      reset();
    } catch (err) {
      logger.error('Failed to update password', { error: err });
      toast({
        title: 'Error',
        description: 'Failed to update password. Please try again.',
        variant: 'destructive',
      });
    }
    logger.methodExit('ChangePassword.onSubmit');
  };

  const result = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          placeholder="Enter your current password"
          {...register('currentPassword')}
        />
        {errors.currentPassword && (
          <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="Enter your new password"
          {...register('newPassword')}
        />
        {newPassword && (
          <div className="space-y-2">
            <Progress value={passwordStrength} className="h-2" />
            <p className="text-sm text-gray-500">
              Password strength: {passwordStrength === 0 ? 'Very Weak' : 
                                passwordStrength <= 25 ? 'Weak' :
                                passwordStrength <= 50 ? 'Fair' :
                                passwordStrength <= 75 ? 'Strong' : 'Very Strong'}
            </p>
            {passwordFeedback && (
              <p className="text-sm text-amber-500">{passwordFeedback}</p>
            )}
          </div>
        )}
        {errors.newPassword && (
          <p className="text-sm text-red-500">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
        <Input
          id="confirmNewPassword"
          type="password"
          placeholder="Confirm your new password"
          {...register('confirmNewPassword')}
        />
        {errors.confirmNewPassword && (
          <p className="text-sm text-red-500">{errors.confirmNewPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Updating Password...' : 'Update Password'}
      </Button>
    </form>
  );

  logger.methodExit('ChangePassword');
  return result;
} 