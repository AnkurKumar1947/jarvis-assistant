'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Mic, MicOff, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  isListening?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSend,
  onStartListening,
  onStopListening,
  isListening = false,
  disabled = false,
  placeholder = 'Type a message...',
  className,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      onStopListening?.();
    } else {
      onStartListening?.();
    }
  };

  return (
    <div className={cn('flex items-end gap-2', className)}>
      {/* Voice button */}
      {(onStartListening || onStopListening) && (
        <Button
          variant={isListening ? 'success' : 'outline'}
          size="icon"
          onClick={handleToggleListening}
          disabled={disabled}
          className={cn(
            'shrink-0 transition-all',
            isListening && 'glow-success'
          )}
        >
          {isListening ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </Button>
      )}

      {/* Input */}
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'w-full bg-card border border-border rounded-xl px-4 py-3 pr-12 text-sm',
            'resize-none overflow-hidden min-h-[48px] max-h-[120px]',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'placeholder:text-muted-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all'
          )}
          style={{
            height: 'auto',
            minHeight: '48px',
          }}
        />
        
        {/* Send button (inside input) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="absolute right-1 bottom-1 h-10 w-10"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>

      {/* Send button (outside - for larger screens) */}
      <Button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="shrink-0 hidden sm:flex"
      >
        <Send className="w-4 h-4 mr-2" />
        Send
      </Button>
    </div>
  );
}

