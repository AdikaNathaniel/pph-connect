import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type ChatMessage = {
  id: string;
  author: 'bot' | 'worker' | 'agent';
  content: string;
  createdAt: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    author: 'bot',
    content: 'Hi! I am Atlas, your 24/7 assistant. Ask me anything about tasks, payments, or tools.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'msg-2',
    author: 'bot',
    content: 'Need a human? Tap “Escalate to a person” and I will connect you with the support queue.',
    createdAt: new Date().toISOString(),
  },
];

const BOT_RESPONSES = [
  'I can help with troubleshooting steps. Could you share any screenshots or error codes?',
  'Thanks for the details! I am running diagnostics and will follow up shortly.',
  'I just logged your request. Keep the chat open for updates.',
];

const LiveChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [escalated, setEscalated] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const latestBotResponse = useMemo(() => BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)], []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = (content: string, author: ChatMessage['author']) => {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author,
        content,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft.trim(), 'worker');
    setDraft('');
    setTimeout(() => {
      sendMessage(latestBotResponse, 'bot');
    }, 800);
  };

  const handleEscalate = () => {
    setEscalated(true);
    sendMessage(
      'I have escalated this conversation to a live agent. Expect a response within a few minutes.',
      'bot'
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50" data-testid="live-chat-widget">
      {isOpen ? (
        <div className="w-80 rounded-xl border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Atlas Live Chat</p>
              <p className="text-xs text-muted-foreground">24/7 assistant • escalate anytime</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={escalated ? 'default' : 'secondary'}>
                {escalated ? 'Human agent' : 'Virtual agent'}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-72 space-y-3 overflow-y-auto px-4 py-3 text-sm"
            data-testid="live-chat-window"
          >
            {messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {message.author === 'bot'
                    ? 'Atlas Bot'
                    : message.author === 'agent'
                      ? 'Support Agent'
                      : 'You'}{' '}
                  <span className="font-normal">
                    • {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <div
                  className={`rounded-lg px-3 py-2 ${
                    message.author === 'worker'
                      ? 'bg-primary text-primary-foreground'
                      : message.author === 'agent'
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted text-foreground'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button type="button" size="icon" onClick={handleSend}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs"
              data-testid="live-chat-escalate"
              disabled={escalated}
              onClick={handleEscalate}
            >
              {escalated ? 'Escalated to human agent' : 'Escalate to a person'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="lg"
          className="shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Live chat
        </Button>
      )}
    </div>
  );
};

export default LiveChatWidget;
