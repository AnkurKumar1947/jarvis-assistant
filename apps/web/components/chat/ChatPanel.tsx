'use client';

import { useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages?: Message[];
  onSendMessage?: (message: string) => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  isListening?: boolean;
  isTyping?: boolean;
  className?: string;
}

const defaultMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Good evening, sir. I am JARVIS, your personal assistant. How may I help you today?',
    timestamp: new Date(),
  },
];

export function ChatPanel({
  messages: externalMessages,
  onSendMessage: externalOnSend,
  onStartListening,
  onStopListening,
  isListening = false,
  isTyping: externalIsTyping,
  className,
}: ChatPanelProps) {
  const [internalMessages, setInternalMessages] = useState<Message[]>(defaultMessages);
  const [internalIsTyping, setInternalIsTyping] = useState(false);

  const messages = externalMessages ?? internalMessages;
  const isTyping = externalIsTyping ?? internalIsTyping;

  const handleSend = (content: string) => {
    if (externalOnSend) {
      externalOnSend(content);
      return;
    }

    // Internal handling (demo mode)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setInternalMessages((prev) => [...prev, userMessage]);
    setInternalIsTyping(true);

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `You said: "${content}". I'm currently in demo mode. Connect to the backend server for full functionality.`,
        timestamp: new Date(),
      };
      setInternalMessages((prev) => [...prev, assistantMessage]);
      setInternalIsTyping(false);
    }, 1500);
  };

  const handleClear = () => {
    setInternalMessages(defaultMessages);
  };

  return (
    <Card glass className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <CardHeader className="pb-3 border-b border-border flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Conversation
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full flex flex-col">
          <MessageList
            messages={messages}
            isTyping={isTyping}
            className="flex-1 px-4"
          />

          {/* Input */}
          <div className="p-4 border-t border-border">
            <ChatInput
              onSend={handleSend}
              onStartListening={onStartListening}
              onStopListening={onStopListening}
              isListening={isListening}
              placeholder="Type a message..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

