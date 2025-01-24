import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { TicketStatus, TicketPriority, Ticket } from '@/types/ticket';
import { supabase } from '@/lib/supabase';

const ticketFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  status: z.enum(['new', 'open', 'pending_customer', 'pending_internal', 'resolved', 'closed'] as const),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface EditTicketFormProps {
  ticket: Ticket;
  onUpdate?: () => void;
  children?: React.ReactNode;
}

export function EditTicketForm({ ticket, onUpdate, children }: EditTicketFormProps): React.ReactElement {
  logger.methodEntry('EditTicketForm');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
    },
  });

  const onSubmit = async (values: TicketFormValues): Promise<void> => {
    logger.methodEntry('EditTicketForm.onSubmit');
    logger.info('Updating ticket', { ticketId: ticket.id, values });
    
    try {
      setIsSubmitting(true);
      
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        logger.error('EditTicketForm: Auth error', { error: authError });
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'Please try logging in again.',
        });
        throw authError;
      }

      if (!session?.user) {
        logger.error('EditTicketForm: No user session');
        toast({
          variant: 'destructive',
          title: 'Session Error',
          description: 'Your session has expired. Please log in again.',
        });
        throw new Error('No user session');
      }

      // Only allow customers to update their own tickets
      if (session.user.user_metadata.role === 'customer' && ticket.customerId !== session.user.id) {
        logger.error('EditTicketForm: Unauthorized update attempt', {
          userId: session.user.id,
          ticketCustomerId: ticket.customerId,
        });
        toast({
          variant: 'destructive',
          title: 'Unauthorized',
          description: 'You can only edit your own tickets.',
        });
        return;
      }

      const { error } = await supabase
        .from('tickets')
        .update({
          title: values.title,
          description: values.description,
          priority: values.priority,
          status: values.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (error) {
        logger.error('EditTicketForm: Error updating ticket', { error });
        toast({
          variant: 'destructive',
          title: 'Error Updating Ticket',
          description: 'There was a problem updating your ticket. Please try again.',
        });
        throw error;
      }

      logger.info('EditTicketForm: Ticket updated successfully', { ticketId: ticket.id });
      toast({
        title: 'Ticket Updated',
        description: 'Your support ticket has been updated successfully.',
      });
      setOpen(false);
      onUpdate?.();
    } catch (error) {
      logger.error('EditTicketForm: Error in submission', { error });
    } finally {
      setIsSubmitting(false);
      logger.methodExit('EditTicketForm.onSubmit');
    }
  };

  logger.methodExit('EditTicketForm');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" data-test="edit-ticket-button">
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Ticket</DialogTitle>
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
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-gray-900" data-test="status-select">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending_customer">Pending Customer</SelectItem>
                      <SelectItem value="pending_internal">Pending Internal</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Ticket'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 