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

export function AIInput() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!inputText.trim() || isProcessing) return;

    logger.methodEntry('AIInput.handleSubmit');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-ai-action', {
        body: {
          input_text: inputText.trim(),
          user_id: user?.id
        }
      });

      if (error) throw error;

      setInputText('');
      toast.success('Input processed successfully');

      // If action requires approval, show info toast
      if (data.requires_approval) {
        toast.info('Action pending approval. Check AI Actions dashboard.');
      }

    } catch (error) {
      logger.error('Error processing AI input:', error);
      toast.error('Failed to process input. Please try again.');
    } finally {
      setIsProcessing(false);
      logger.methodExit('AIInput.handleSubmit');
    }
  };

  const startRecording = async () => {
    logger.methodEntry('AIInput.startRecording');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob);

        try {
          setIsProcessing(true);
          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
            },
            body: formData
          });

          const data = await response.json();
          if (data.text) {
            setInputText(data.text);
          }
        } catch (error) {
          logger.error('Error transcribing audio:', error);
          toast.error('Failed to transcribe audio. Please try again.');
        } finally {
          setIsProcessing(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      logger.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
    logger.methodExit('AIInput.startRecording');
  };

  const stopRecording = () => {
    logger.methodEntry('AIInput.stopRecording');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    logger.methodExit('AIInput.stopRecording');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Textarea
          placeholder="Type your note or press the mic button to record..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="min-h-[100px]"
          disabled={isProcessing}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          <Mic className={isRecording ? 'text-red-500' : ''} />
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!inputText.trim() || isProcessing}
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