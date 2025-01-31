import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function AIInput(): JSX.Element {
  logger.methodEntry('AIInput');

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (): Promise<void> => {
    logger.methodEntry('AIInput.handleSubmit');

    // If already processing, don't do anything
    if (isProcessing) return;

    // Trim the input text
    const trimmedInput = inputText.trim();

    // If empty after trimming, show a toast and return
    if (!trimmedInput) {
      toast({
        title: "Empty Input",
        description: "Please enter some text to process.",
        variant: "default"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-ai-action', {
        body: {
          input_text: trimmedInput,
          user_id: user?.id
        }
      });

      if (error) throw error;

      setInputText('');
      toast({
        title: "Success",
        description: data.parsed_result || "Input processed successfully",
        duration: 5000
      });

      // If action requires approval, show info toast
      if (data.requires_approval) {
        toast({
          title: "Action Pending",
          description: "Action pending approval. Check AI Actions dashboard.",
          variant: "default"
        });
      }

    } catch (error) {
      logger.error('Error processing AI input:', { error: error instanceof Error ? error.message : String(error) });
      toast({
        title: "Error",
        description: "Failed to process input. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      logger.methodExit('AIInput.handleSubmit');
    }
  };

  const startRecording = async (): Promise<void> => {
    logger.methodEntry('AIInput.startRecording');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = handleMediaRecorderDataAvailable;
      mediaRecorder.onstop = handleMediaRecorderStop;

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      logger.error('Error starting recording:', { error: error instanceof Error ? error.message : String(error) });
      toast({
        title: "Error",
        description: "Failed to start recording. Please check microphone permissions.",
        variant: "destructive"
      });
    }
    logger.methodExit('AIInput.startRecording');
  };

  const stopRecording = (): void => {
    logger.methodEntry('AIInput.stopRecording');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    logger.methodExit('AIInput.stopRecording');
  };

  const handleMediaRecorderDataAvailable = (event: BlobEvent): void => {
    logger.methodEntry('AIInput.handleMediaRecorderDataAvailable');
    if (event.data.size > 0) {
      chunksRef.current.push(event.data);
    }
    logger.methodExit('AIInput.handleMediaRecorderDataAvailable');
  };

  const handleMediaRecorderStop = async (): Promise<void> => {
    logger.methodEntry('AIInput.handleMediaRecorderStop');
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];

    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audio_base64: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = (): void => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(audioBlob);
          })
        }
      });

      if (error) throw error;

      if (data.text) {
        setInputText(data.text);
      }
    } catch (error) {
      logger.error('Error transcribing audio:', { error: error instanceof Error ? error.message : String(error) });
      toast({
        title: "Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }

    logger.methodExit('AIInput.handleMediaRecorderStop');
  };

  logger.methodExit('AIInput');

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Textarea
          data-testid="ai-input-textarea"
          placeholder="Type your note or press the mic button to record..."
          value={inputText}
          onChange={(e): void => setInputText(e.target.value)}
          className="min-h-[100px]"
          disabled={isProcessing}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={(): void => isRecording ? stopRecording() : void startRecording()}
          disabled={isProcessing}
        >
          <Mic className={isRecording ? 'text-red-500' : ''} />
        </Button>
        <Button
          data-testid="ai-input-process"
          onClick={(): Promise<void> => handleSubmit()}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Process
        </Button>
      </div>
    </div>
  );
} 