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
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => {
      const result = zxcvbn(password);
      return result.score >= 3;
    }, 'Password is too weak. Try adding numbers, symbols, or making it longer.'),
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
  const [passwordFeedback, setPasswordFeedback] = React.useState('');

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
      setPasswordFeedback(result.feedback.warning || result.feedback.suggestions[0] || '');
    } else {
      setPasswordStrength(0);
      setPasswordFeedback('');
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
          id="fullName"
          name="fullName"
          type="text"
          placeholder="Enter your full name"
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-sm text-red-500">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          autoComplete="new-password"
          {...register('password')}
        />
        {password && (
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
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          {...register('confirmPassword')}
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