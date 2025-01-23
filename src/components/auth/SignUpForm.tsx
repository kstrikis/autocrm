import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import zxcvbn from 'zxcvbn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { Progress } from '@/components/ui/progress';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .refine((password) => {
      const result = zxcvbn(password);
      return result.score >= 3;
    }, 'Password is too weak'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpForm(): React.ReactElement {
  logger.methodEntry('SignUpForm');
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [passwordStrength, setPasswordStrength] = React.useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  // Watch password field for strength calculation
  const password = watch('password');
  React.useEffect(() => {
    if (password) {
      const result = zxcvbn(password);
      setPasswordStrength(result.score * 25);
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  const onSubmit = async (data: SignUpFormData): Promise<void> => {
    logger.methodEntry('SignUpForm.onSubmit');
    try {
      await signUp(data.email, data.password, data.fullName);
      toast({
        title: 'Success',
        description: 'Your account has been created. Please check your email for verification.',
      });
      void navigate('/dashboard');
    } catch (error) {
      logger.error('Error signing up', { error });
      toast({
        title: 'Error',
        description: 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    }
    logger.methodExit('SignUpForm.onSubmit');
  };

  const result = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          type="text"
          placeholder="Full Name"
          {...register('fullName')}
          className="w-full"
        />
        {errors.fullName && (
          <p className="text-sm text-red-500">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          placeholder="Email"
          {...register('email')}
          className="w-full"
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          type="password"
          placeholder="Password"
          {...register('password')}
          className="w-full"
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
        {password && (
          <div className="space-y-2">
            <Progress value={passwordStrength} className="h-2" />
            <p className="text-sm text-gray-500">
              Password strength: {passwordStrength === 0 ? 'Very Weak' : 
                                passwordStrength <= 25 ? 'Weak' :
                                passwordStrength <= 50 ? 'Fair' :
                                passwordStrength <= 75 ? 'Strong' : 'Very Strong'}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          type="password"
          placeholder="Confirm Password"
          {...register('confirmPassword')}
          className="w-full"
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );

  logger.methodExit('SignUpForm');
  return result;
} 