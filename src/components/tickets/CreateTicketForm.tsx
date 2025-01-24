import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { TicketPriority, TicketStatus } from '@/types/ticket';
import { supabase } from '@/lib/supabase';

const ticketFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface CreateTicketFormProps {
  children?: React.ReactNode;
}

export function CreateTicketForm({ children }: CreateTicketFormProps): React.ReactElement {
  logger.methodEntry('CreateTicketForm');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
    },
  });

  const onSubmit = async (values: TicketFormValues): Promise<void> => {
    logger.methodEntry('CreateTicketForm.onSubmit');
    logger.info('Creating new ticket', { values });
    
    try {
      setIsSubmitting(true);
      
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        logger.error('CreateTicketForm: Auth error', { error: authError });
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'Please try logging in again.',
        });
        throw authError;
      }

      if (!session?.user) {
        logger.error('CreateTicketForm: No user session');
        toast({
          variant: 'destructive',
          title: 'Session Error',
          description: 'Your session has expired. Please log in again.',
        });
        throw new Error('No user session');
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert([
          {
            title: values.title,
            description: values.description,
            priority: values.priority,
            status: 'new' as TicketStatus,
            customer_id: session.user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        logger.error('CreateTicketForm: Error creating ticket', { error });
        toast({
          variant: 'destructive',
          title: 'Error Creating Ticket',
          description: 'There was a problem creating your ticket. Please try again.',
        });
        throw error;
      }

      logger.info('CreateTicketForm: Ticket created successfully', { ticket: data });
      toast({
        title: 'Ticket Created',
        description: 'Your support ticket has been created successfully.',
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      logger.error('CreateTicketForm: Error in submission', { error });
    } finally {
      setIsSubmitting(false);
      logger.methodExit('CreateTicketForm.onSubmit');
    }
  };

  logger.methodExit('CreateTicketForm');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="default" data-test="new-ticket-button">New Ticket</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the issue"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-gray-900" data-test="priority-select">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="text-gray-900"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 