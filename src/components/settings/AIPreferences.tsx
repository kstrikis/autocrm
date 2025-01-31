import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import type { UserAIPreferences } from '@/lib/database.types';

export function AIPreferences(): JSX.Element {
  logger.methodEntry('AIPreferences');
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserAIPreferences>({
    requireApproval: true,
    enableVoiceInput: false,
    defaultNoteVisibility: 'internal'
  });

  useEffect(() => {
    logger.methodEntry('AIPreferences.useEffect');
    void fetchPreferences();
    logger.methodExit('AIPreferences.useEffect');
  }, []);

  const fetchPreferences = async (): Promise<void> => {
    logger.methodEntry('AIPreferences.fetchPreferences');
    try {
      logger.info('Fetching preferences for user:', { userId: user?.id });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('ai_preferences')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      logger.info('Fetched preferences:', { 
        raw: JSON.stringify(data?.ai_preferences, null, 2),
        userId: user?.id 
      });

      if (data?.ai_preferences) {
        setPreferences(data.ai_preferences as UserAIPreferences);
        logger.info('Updated preferences state:', { 
          preferences: data.ai_preferences,
          userId: user?.id 
        });
      } else {
        logger.info('No preferences found, using defaults:', { 
          defaults: preferences,
          userId: user?.id 
        });
      }
    } catch (error) {
      logger.error('Error fetching preferences:', { 
        error: JSON.stringify(error, null, 2),
        userId: user?.id
      });
      toast({
        title: 'Error',
        description: 'Failed to load preferences',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      logger.methodExit('AIPreferences.fetchPreferences');
    }
  };

  const updatePreference = async <K extends keyof UserAIPreferences>(
    key: K,
    value: UserAIPreferences[K]
  ): Promise<void> => {
    logger.methodEntry('AIPreferences.updatePreference');
    try {
      const newPreferences = {
        ...preferences,
        [key]: value
      };

      const { error } = await supabase
        .from('user_profiles')
        .update({ ai_preferences: newPreferences })
        .eq('id', user?.id);

      if (error) throw error;

      setPreferences(newPreferences);
      toast({
        title: 'Success',
        description: 'Preference updated successfully'
      });
    } catch (error) {
      logger.error('Error updating preference:', { error: JSON.stringify(error, null, 2) });
      toast({
        title: 'Error',
        description: 'Failed to update preference',
        variant: 'destructive'
      });
    }
    logger.methodExit('AIPreferences.updatePreference');
  };

  logger.methodExit('AIPreferences');

  if (isLoading) {
    return <div className="p-4">Loading preferences...</div>;
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium">AI Assistant Preferences</h3>
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Automatic AI Actions</div>
              <div className="text-sm text-muted-foreground">
                Allow AI to execute actions without requiring your approval
              </div>
            </div>
            <Switch
              checked={!preferences.requireApproval}
              onCheckedChange={(checked): Promise<void> => 
                updatePreference('requireApproval', !checked)
              }
            />
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Voice Input</div>
              <div className="text-sm text-muted-foreground">
                Enable voice input for AI interactions
              </div>
            </div>
            <Switch
              checked={preferences.enableVoiceInput}
              onCheckedChange={(checked): Promise<void> => 
                updatePreference('enableVoiceInput', checked)
              }
            />
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Default Note Visibility</div>
              <div className="text-sm text-muted-foreground">
                Set the default visibility for AI-generated notes
              </div>
            </div>
            <Select
              value={preferences.defaultNoteVisibility}
              onValueChange={(value): Promise<void> => 
                updatePreference('defaultNoteVisibility', value as 'internal' | 'customer')
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal Only</SelectItem>
                <SelectItem value="customer">Customer Visible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
} 