'use client';

import { useState, useEffect } from 'react';
import { MessageSquareShare, X, Send, Check, Lightbulb, Bug } from 'lucide-react';

interface FeedbackButtonProps {
  inline?: boolean;
}

export function FeedbackButton({ inline = false }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'feature' | 'bug'>('feature');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [hasUnreadReply, setHasUnreadReply] = useState(false);

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
        const feedback = await res.json();
        const hasNewReply = feedback.some((f: { ownerReply: string | null; status: string }) => 
          f.ownerReply && f.status === 'replied'
        );
        setHasUnreadReply(hasNewReply);
      }
    } catch {
      // Silently fail
    }
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
        {hasUnreadReply && (
          <span className={`absolute ${inline ? '-top-0.5 -right-0.5 w-2 h-2' : '-top-1 -right-1 w-3 h-3'} bg-cyan-400 rounded-full animate-ping`} />
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Thanks!</h3>
                <p className="text-zinc-400 text-sm">Your feedback has been sent.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-white">Send Feedback</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
