'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Send,
  Radio,
  Users2,
  User,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  channel: string;
}

const CHANNELS = [
  { id: 'broadcast', label: 'Broadcast', icon: Radio, color: '#ef4444' },
  { id: 'security', label: 'Security Team', icon: Users2, color: '#8b5cf6' },
  { id: 'medical', label: 'Medical Team', icon: Users2, color: '#3b82f6' },
  { id: 'direct', label: 'Direct Message', icon: User, color: '#22c55e' },
];

export default function CommunicationHub() {
  const [activeChannel, setActiveChannel] = useState('broadcast');
  const [messages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // In production: call sendMessage() API + emit socket event
    setInputValue('');
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 h-full flex flex-col shadow-xl">
      <div className="flex items-end justify-between mb-4 pb-4 border-b border-outline-variant/10">
        <h2 className="font-headline text-lg font-bold tracking-widest text-on-surface uppercase flex items-center gap-2">
          <MessageSquare size={18} className="text-secondary" />
          Communications
        </h2>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-surface-variant scrollbar-track-transparent">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-label text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border border-transparent',
              activeChannel === ch.id
                ? 'bg-surface-variant text-on-surface border-outline-variant/30 font-bold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50',
            )}
          >
            <ch.icon size={14} style={{ color: ch.color }} />
            {ch.label}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0 pr-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full font-body text-sm text-on-surface-variant/70">
            No communications on this frequency
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-surface-container-highest/40 border border-outline-variant/10"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-headline text-xs font-bold uppercase tracking-wider text-primary">{msg.sender}</span>
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/50">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="font-body text-sm text-on-surface">{msg.content}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Transmit on ${activeChannel.toUpperCase()} frequency...`}
          className="flex-1 bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          onClick={handleSend}
          className="px-6 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-md shadow-primary/20"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
