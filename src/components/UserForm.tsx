import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type FormData = z.infer<typeof formSchema>

interface Props {
  onSubmit: (data: FormData) => Promise<void>
  submitText: string
}

export function UserForm({ onSubmit, submitText }: Props): React.ReactElement {
  logger.methodEntry('UserForm')
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleSubmit = async (data: FormData): Promise<void> => {
    logger.methodEntry('UserForm.handleSubmit')
    try {
      await onSubmit(data)
    } catch (error) {
      logger.error('Form submission failed', { error })
      form.setError('root', { message: 'Failed to submit form' })
    }
    logger.methodExit('UserForm.handleSubmit')
  }

  const result = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {submitText}
        </Button>
      </form>
    </Form>
  )

  logger.methodExit('UserForm')
  return result
} 