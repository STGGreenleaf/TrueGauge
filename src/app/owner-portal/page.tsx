'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { 
  MessageSquare, 
  Users, 
  Store, 
  Activity, 
  Check, 
  X, 
  Reply, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  type: string;
  message: string;
  status: string;
  ownerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: { email: string; name: string | null; avatarUrl: string | null };
  organization: { name: string };
}

interface Analytics {
  healthMetrics: {
    totalStores: number;
    totalUsers: number;
    avgUsersPerStore: number;
    storesWithData: number;
    storesInactive: number;
  };
  storeDetails: Array<{
    id: string;
    name: string;
    monthlyNut: number;
    userCount: number;
    users: Array<{ email: string; name: string | null; role: string }>;
    dayEntries: number;
    expenses: number;
    createdAt: string;
  }>;
  feedbackStats: { unread: number; total: number };
  userActivity: { activeUsers30d: number; totalActions30d: number };
}

export default function OwnerPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'analytics' | 'stores'>('inbox');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [feedbackRes, analyticsRes] = await Promise.all([
        fetch('/api/feedback'),
        fetch('/api/owner/analytics'),
      ]);

      if (feedbackRes.status === 401 || analyticsRes.status === 401) {
        router.push('/');
        return;
      }

      if (feedbackRes.ok) {
        setFeedback(await feedbackRes.json());
      }
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (feedbackId: string, quickReply?: string) => {
    const reply = quickReply || replyText;
    if (!reply.trim()) return;

    setReplying(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feedbackId, ownerReply: reply, status: 'replied' }),
      });
      if (res.ok) {
        setReplyText('');
        setExpandedFeedback(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error replying:', error);
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (feedbackId: string, status: string) => {
    try {
      await fetch('/api/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feedbackId, status }),
      });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (feedbackId: string) => {
    try {
      await fetch(`/api/feedback?id=${feedbackId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-xs tracking-widest text-zinc-600">LOADING OWNER PORTAL...</div>
      </div>
    );
  }

  const unreadCount = feedback.filter(f => f.status === 'unread').length;

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      
      <div className="max-w-6xl mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Owner Portal</h1>
          <p className="text-zinc-500 text-sm mt-1">Platform analytics and user feedback</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'inbox' 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Inbox
            {unreadCount > 0 && (
              <span className="bg-cyan-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'stores' 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Store className="w-4 h-4" />
            Stores
          </button>
        </div>

        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <div className="space-y-4">
            {feedback.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No feedback yet</p>
              </div>
            ) : (
              feedback.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    item.status === 'unread' 
                      ? 'border-cyan-500/50 bg-cyan-500/5' 
                      : 'border-zinc-800 bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {item.user.avatarUrl ? (
                        <img src={item.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                          {item.user.email[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.user.name || item.user.email}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {item.type}
                          </span>
                          {item.status === 'unread' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-400 text-xs mt-0.5">{item.organization.name}</p>
                        <p className="text-zinc-300 text-sm mt-2">{item.message}</p>
                        
                        {item.ownerReply && (
                          <div className="mt-3 p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Your Reply</p>
                            <p className="text-sm text-emerald-300">{item.ownerReply}</p>
                          </div>
                        )}

                        <p className="text-[10px] text-zinc-600 mt-2">
                          {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandedFeedback(expandedFeedback === item.id ? null : item.id)}
                        className="p-2 rounded hover:bg-zinc-800 text-zinc-500 hover:text-cyan-400"
                        title="Reply"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                      {item.status !== 'fixed' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'fixed')}
                          className="p-2 rounded hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400"
                          title="Mark as Fixed"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Reply Section */}
                  {expandedFeedback === item.id && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => handleReply(item.id, 'Thanks for the suggestion! We\'ll look into it.')}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        >
                          Thanks for the suggestion!
                        </button>
                        <button
                          onClick={() => handleReply(item.id, 'Fixed! Thanks for reporting.')}
                          className="text-xs px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                        >
                          Fixed! Thanks.
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Custom reply..."
                          className="flex-1 px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500"
                        />
                        <button
                          onClick={() => handleReply(item.id)}
                          disabled={replying || !replyText.trim()}
                          className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {replying ? '...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Total Stores</div>
                <div className="text-3xl font-bold text-cyan-400">{analytics.healthMetrics.totalStores}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Total Users</div>
                <div className="text-3xl font-bold text-emerald-400">{analytics.healthMetrics.totalUsers}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Active (30d)</div>
                <div className="text-3xl font-bold text-amber-400">{analytics.userActivity.activeUsers30d}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Unread Messages</div>
                <div className="text-3xl font-bold text-red-400">{analytics.feedbackStats.unread}</div>
              </div>
            </div>

            {/* Store Health */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
                Store Health
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Stores with Data</div>
                  <div className="text-2xl font-bold text-emerald-400">{analytics.healthMetrics.storesWithData}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Inactive Stores</div>
                  <div className="text-2xl font-bold text-zinc-500">{analytics.healthMetrics.storesInactive}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Avg Users/Store</div>
                  <div className="text-2xl font-bold text-cyan-400">{analytics.healthMetrics.avgUsersPerStore}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Total Actions (30d)</div>
                  <div className="text-2xl font-bold text-amber-400">{analytics.userActivity.totalActions30d}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stores Tab */}
        {activeTab === 'stores' && analytics && (
          <div className="space-y-4">
            {analytics.storeDetails.map((store) => (
              <div key={store.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-zinc-200">{store.name}</h3>
                    <p className="text-xs text-zinc-500">
                      Created {new Date(store.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-cyan-400">{store.userCount} users</div>
                    <div className="text-xs text-zinc-500">
                      {store.dayEntries} entries • {store.expenses} expenses
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {store.users.map((user, idx) => (
                    <div 
                      key={idx}
                      className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      {user.email}
                      <span className={`text-[9px] ${user.role === 'owner' ? 'text-amber-400' : 'text-zinc-500'}`}>
                        ({user.role})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
