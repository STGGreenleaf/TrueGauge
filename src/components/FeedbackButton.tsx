'use client';

import { useState, useEffect } from 'react';
import { MessageSquareShare, X, Send, Check, Lightbulb, Bug, Mail, Plus } from 'lucide-react';
import { PulseIndicator } from '@/components/PulseIndicator';

interface FeedbackButtonProps {
  inline?: boolean;
}

interface FeedbackMessage {
  id: string;
  type: string;
  message: string;
  status: string;
  ownerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export function FeedbackButton({ inline = false }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'inbox' | 'send'>('inbox');
  const [type, setType] = useState<'feature' | 'bug'>('feature');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [hasUnreadReply, setHasUnreadReply] = useState(false);
  const [myMessages, setMyMessages] = useState<FeedbackMessage[]>([]);

  useEffect(() => {
    checkForReplies();
    // Poll for new replies every 30 seconds
    const interval = setInterval(checkForReplies, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkForReplies = async () => {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const feedback: FeedbackMessage[] = await res.json();
        setMyMessages(feedback);
        const hasNewReply = feedback.some(f => f.ownerReply && f.status === 'replied');
        setHasUnreadReply(hasNewReply);
      }
    } catch {
      // Silently fail
    }
  };

  const markAsRead = async (id: string) => {
    // User acknowledges the reply - we'll mark it as 'read' status
    try {
      await fetch('/api/feedback/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      checkForReplies();
    } catch {
      // Silently fail
    }
  };

  const markAllAsRead = async () => {
    // Mark all replied messages as read when closing inbox
    const unreadMessages = myMessages.filter(m => m.ownerReply && m.status === 'replied');
    for (const msg of unreadMessages) {
      try {
        await fetch('/api/feedback/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: msg.id }),
        });
      } catch {
        // Silently fail
      }
    }
    setHasUnreadReply(false);
  };

  const handleClose = () => {
    // If viewing inbox with unread replies, mark them as read
    if (viewMode === 'inbox' && hasUnreadReply) {
      markAllAsRead();
    }
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      });

      // Close regardless of response - user sees "sent" confirmation
      setSent(true);
      setMessage('');
      setType('feature');
      setTimeout(() => {
        setSent(false);
        setIsOpen(false);
      }, 800);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still close on error
      setIsOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Inline or Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={inline 
          ? `relative p-2 rounded transition-colors ${
              hasUnreadReply 
                ? 'text-cyan-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`
          : `fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
              hasUnreadReply 
                ? 'bg-cyan-500 text-black animate-pulse' 
                : 'bg-zinc-800 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700'
            }`
        }
        title="Send Feedback"
      >
        <MessageSquareShare className={inline ? "w-4 h-4" : "w-5 h-5"} />
        <PulseIndicator 
          show={hasUnreadReply} 
          size={inline ? 'sm' : 'md'} 
          className={`absolute ${inline ? '-top-0.5 -right-0.5' : '-top-1 -right-1'}`} 
        />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl max-h-[70vh] overflow-y-auto">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Thanks!</h3>
                <p className="text-zinc-400 text-sm">Your feedback has been sent.</p>
              </div>
            ) : viewMode === 'inbox' && myMessages.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    My Messages
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('send')}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400"
                      title="New Message"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleClose}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages List */}
                <div className="space-y-3">
                  {myMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`rounded-lg border p-3 ${
                        msg.ownerReply && msg.status === 'replied'
                          ? 'border-cyan-500/50 bg-cyan-500/5'
                          : 'border-zinc-700 bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          msg.type === 'bug' ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {msg.type === 'bug' ? 'BUG' : 'FEATURE'}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                        {msg.ownerReply && msg.status === 'replied' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            REPLY
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-300 mb-2">{msg.message}</p>
                      
                      {msg.ownerReply && (
                        <div className="mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Developer Reply</p>
                          <p className="text-sm text-emerald-300">{msg.ownerReply}</p>
                          {msg.status === 'replied' && (
                            <button
                              onClick={() => markAsRead(msg.id)}
                              className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Mark as Read
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-white">Send Feedback</h2>
                  <div className="flex items-center gap-2">
                    {myMessages.length > 0 && (
                      <button
                        onClick={() => setViewMode('inbox')}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400"
                        title="My Messages"
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Type Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setType('feature')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      type === 'feature'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Feature Request
                  </button>
                  <button
                    onClick={() => setType('bug')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      type === 'bug'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <Bug className="w-4 h-4" />
                    Bug Report
                  </button>
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={type === 'feature' 
                    ? "What feature would make TrueGauge better for you?" 
                    : "Describe the bug you encountered..."}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm resize-y min-h-[100px] max-h-[300px] focus:outline-none focus:border-cyan-500"
                />

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={sending || !message.trim()}
                  className="w-full mt-4 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Feedback
                    </>
                  )}
                </button>

                <p className="text-[10px] text-zinc-600 text-center mt-3">
                  Your message goes directly to the developer.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
