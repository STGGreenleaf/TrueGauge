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
  AlertCircle,
  Zap,
  BarChart3,
  Timer,
  UserCheck,
  Flame,
  Calendar,
  MousePointer,
  Eye
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
    users: Array<{ id: string; email: string; name: string | null; role: string }>;
    dayEntries: number;
    expenses: number;
    createdAt: string;
  }>;
  feedbackStats: { unread: number; total: number };
  userActivity: { 
    activeUsers30d: number; 
    totalActions30d: number;
    totalSessions30d: number;
    avgSessionDuration: number;
    avgPagesPerSession: number;
  };
  heatmapData: number[][];
  pagePopularity: Array<{ page: string; count: number }>;
  actionFrequency: Array<{ action: string; count: number }>;
  userEngagement: Array<{
    id: string;
    email: string;
    name: string | null;
    orgName: string;
    activityCount: number;
    lastSeen: string | null;
    daysSinceActive: number;
    status: 'active' | 'moderate' | 'dormant' | 'inactive';
    score: number;
  }>;
  weeklyRetention: Array<{ week: string; users: number; retained: number }>;
  storeHealth: Array<{
    id: string;
    name: string;
    consistency: number;
    streak: number;
    totalEntries: number;
    totalExpenses: number;
  }>;
  featureAdoption: Array<{ feature: string; count: number }>;
}

// Tooltip component
const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-xs text-zinc-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-zinc-700">
      {text}
    </div>
  </div>
);

export default function OwnerPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'analytics' | 'stores'>('analytics');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
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
                          onClick={() => setReplyText('Thanks for the suggestion! We\'ll look into it.')}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        >
                          Thanks for the suggestion!
                        </button>
                        <button
                          onClick={() => setReplyText('Fixed! Thanks for reporting.')}
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
          <div className="space-y-4">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tooltip text="Total registered stores on platform">
                <button
                  onClick={() => setExpandedWidget(expandedWidget === 'stores' ? null : 'stores')}
                  className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Store className="w-4 h-4 text-cyan-500" />
                    <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${expandedWidget === 'stores' ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="text-3xl font-bold text-cyan-400 mt-2">{analytics.healthMetrics.totalStores}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Total Stores</div>
                </button>
              </Tooltip>
              
              <Tooltip text="Total registered users across all stores">
                <button
                  onClick={() => setExpandedWidget(expandedWidget === 'users' ? null : 'users')}
                  className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${expandedWidget === 'users' ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="text-3xl font-bold text-emerald-400 mt-2">{analytics.healthMetrics.totalUsers}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Total Users</div>
                </button>
              </Tooltip>
              
              <Tooltip text="Users with activity in last 30 days">
                <button
                  onClick={() => setExpandedWidget(expandedWidget === 'active' ? null : 'active')}
                  className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Activity className="w-4 h-4 text-amber-500" />
                    <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${expandedWidget === 'active' ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="text-3xl font-bold text-amber-400 mt-2">{analytics.userActivity.activeUsers30d}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Active (30d)</div>
                </button>
              </Tooltip>
              
              <Tooltip text="Unread feedback messages">
                <button
                  onClick={() => { setActiveTab('inbox'); setExpandedWidget(null); }}
                  className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <MessageSquare className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-zinc-500">→</span>
                  </div>
                  <div className="text-3xl font-bold text-red-400 mt-2">{analytics.feedbackStats.unread}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Unread Messages</div>
                </button>
              </Tooltip>
            </div>

            {/* Expanded: Stores List */}
            {expandedWidget === 'stores' && (
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
                <div className="text-xs font-medium text-cyan-400 mb-3">All Stores</div>
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {analytics.storeDetails.map(store => (
                    <div key={store.id} className="flex items-center justify-between py-2 px-3 rounded bg-zinc-800/50">
                      <span className="text-sm text-zinc-200">{store.name}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-500">{store.userCount} users</span>
                        <span className={store.dayEntries > 0 ? 'text-emerald-400' : 'text-zinc-600'}>
                          {store.dayEntries > 0 ? `${store.dayEntries} entries` : 'No data'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded: Users List */}
            {expandedWidget === 'users' && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="text-xs font-medium text-emerald-400 mb-3">All Users by Engagement</div>
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {analytics.userEngagement.map(user => (
                    <div key={user.id} className="flex items-center justify-between py-2 px-3 rounded bg-zinc-800/50">
                      <div>
                        <span className="text-sm text-zinc-200">{user.email}</span>
                        <span className="text-xs text-zinc-500 ml-2">{user.orgName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                          user.status === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                          user.status === 'dormant' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-zinc-700 text-zinc-500'
                        }`}>
                          {user.status}
                        </span>
                        <span className="text-xs text-zinc-500">{user.daysSinceActive}d ago</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded: Active Users Detail */}
            {expandedWidget === 'active' && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="text-xs font-medium text-amber-400 mb-3">Activity Summary (30 days)</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-zinc-800/50 rounded p-3">
                    <div className="text-2xl font-bold text-amber-400">{analytics.userActivity.totalActions30d}</div>
                    <div className="text-xs text-zinc-500">Total Actions</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-3">
                    <div className="text-2xl font-bold text-cyan-400">{analytics.userActivity.totalSessions30d}</div>
                    <div className="text-xs text-zinc-500">Sessions</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-3">
                    <div className="text-2xl font-bold text-emerald-400">{analytics.userActivity.avgSessionDuration}s</div>
                    <div className="text-xs text-zinc-500">Avg Duration</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-3">
                    <div className="text-2xl font-bold text-violet-400">{analytics.userActivity.avgPagesPerSession}</div>
                    <div className="text-xs text-zinc-500">Pages/Session</div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Heatmap */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <Tooltip text="User activity patterns by day and hour (last 7 days)">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2 cursor-help">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Activity Heatmap
                </h3>
              </Tooltip>
              <div className="grid gap-1">
                <div className="flex gap-1 text-[8px] text-zinc-600 ml-8">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="w-3 text-center">{i}</div>
                  ))}
                </div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIdx) => (
                  <div key={day} className="flex items-center gap-1">
                    <div className="w-7 text-[9px] text-zinc-500">{day}</div>
                    <div className="flex gap-0.5">
                      {analytics.heatmapData[dayIdx]?.map((count, hourIdx) => {
                        const maxCount = Math.max(...analytics.heatmapData.flat());
                        const intensity = maxCount > 0 ? count / maxCount : 0;
                        return (
                          <Tooltip key={hourIdx} text={`${day} ${hourIdx}:00 - ${count} actions`}>
                            <div
                              className="w-3 h-3 rounded-sm cursor-pointer transition-all hover:scale-125"
                              style={{
                                backgroundColor: intensity > 0 
                                  ? `rgba(34, 211, 238, ${0.1 + intensity * 0.8})` 
                                  : 'rgba(63, 63, 70, 0.3)'
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Page Popularity */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <Tooltip text="Most visited pages in last 30 days">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2 cursor-help">
                    <Eye className="w-4 h-4 text-violet-500" />
                    Page Popularity
                  </h3>
                </Tooltip>
                <div className="space-y-2">
                  {analytics.pagePopularity.slice(0, 6).map((page, i) => {
                    const maxCount = analytics.pagePopularity[0]?.count || 1;
                    const width = (page.count / maxCount) * 100;
                    return (
                      <div key={i} className="relative">
                        <div className="absolute inset-0 bg-violet-500/10 rounded" style={{ width: `${width}%` }} />
                        <div className="relative flex justify-between py-1.5 px-2">
                          <span className="text-xs text-zinc-300 capitalize">{page.page.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-zinc-500">{page.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Frequency */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <Tooltip text="Most common user actions in last 30 days">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2 cursor-help">
                    <MousePointer className="w-4 h-4 text-cyan-500" />
                    Top Actions
                  </h3>
                </Tooltip>
                <div className="space-y-2">
                  {analytics.actionFrequency.slice(0, 6).map((action, i) => {
                    const maxCount = analytics.actionFrequency[0]?.count || 1;
                    const width = (action.count / maxCount) * 100;
                    return (
                      <div key={i} className="relative">
                        <div className="absolute inset-0 bg-cyan-500/10 rounded" style={{ width: `${width}%` }} />
                        <div className="relative flex justify-between py-1.5 px-2">
                          <span className="text-xs text-zinc-300">{action.action.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-zinc-500">{action.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* User Engagement Scores */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <Tooltip text="User health scores based on activity frequency and recency">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2 cursor-help">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  User Engagement Scores
                </h3>
              </Tooltip>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {analytics.userEngagement.slice(0, 10).map(user => (
                  <div key={user.id} className="flex items-center gap-3 py-2 px-3 rounded bg-zinc-800/30">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: `conic-gradient(${
                          user.status === 'active' ? '#10b981' :
                          user.status === 'moderate' ? '#f59e0b' :
                          user.status === 'dormant' ? '#f97316' : '#52525b'
                        } ${user.score}%, transparent 0)`,
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-xs">
                        {user.score}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-200 truncate">{user.name || user.email}</div>
                      <div className="text-xs text-zinc-500">{user.orgName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">{user.activityCount} actions</div>
                      <div className="text-[10px] text-zinc-600">
                        {user.lastSeen ? `${user.daysSinceActive}d ago` : 'Never'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Retention */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <Tooltip text="Week-over-week user retention rates">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2 cursor-help">
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                  Weekly Retention
                </h3>
              </Tooltip>
              <div className="flex items-end gap-4 h-32">
                {analytics.weeklyRetention.map((week, i) => {
                  const retentionRate = week.users > 0 ? (week.retained / week.users) * 100 : 0;
                  return (
                    <Tooltip key={i} text={`${week.users} users → ${week.retained} retained (${retentionRate.toFixed(0)}%)`}>
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-zinc-800 rounded-t relative" style={{ height: '80px' }}>
                          <div 
                            className="absolute bottom-0 w-full bg-cyan-500/30 rounded-t transition-all"
                            style={{ height: `${retentionRate}%` }}
                          />
                          <div 
                            className="absolute bottom-0 w-full bg-cyan-500 rounded-t transition-all"
                            style={{ height: `${(week.retained / Math.max(...analytics.weeklyRetention.map(w => w.users), 1)) * 100}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-500">{week.week}</div>
                        <div className="text-xs font-medium text-cyan-400">{retentionRate.toFixed(0)}%</div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* Store Data Health */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <Tooltip text="Data entry consistency and streaks per store">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2 cursor-help">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Store Data Health
                </h3>
              </Tooltip>
              <div className="grid gap-2">
                {analytics.storeHealth.map(store => (
                  <div key={store.id} className="flex items-center gap-3 py-2 px-3 rounded bg-zinc-800/30">
                    <div className="flex-1">
                      <div className="text-sm text-zinc-200">{store.name}</div>
                      <div className="text-xs text-zinc-500">{store.totalEntries} entries · {store.totalExpenses} expenses</div>
                    </div>
                    <Tooltip text={`${store.consistency}% of last 30 days have entries`}>
                      <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            store.consistency >= 80 ? 'bg-emerald-500' :
                            store.consistency >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${store.consistency}%` }}
                        />
                      </div>
                    </Tooltip>
                    <Tooltip text={`${store.streak} day streak`}>
                      <div className="flex items-center gap-1 text-xs">
                        <Flame className={`w-3 h-3 ${store.streak > 0 ? 'text-orange-500' : 'text-zinc-600'}`} />
                        <span className={store.streak > 0 ? 'text-orange-400' : 'text-zinc-600'}>{store.streak}</span>
                      </div>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Adoption */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <Tooltip text="Feature usage breakdown in last 30 days">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2 cursor-help">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Feature Adoption
                </h3>
              </Tooltip>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {analytics.featureAdoption.map(feature => {
                  const maxCount = Math.max(...analytics.featureAdoption.map(f => f.count), 1);
                  const intensity = feature.count / maxCount;
                  return (
                    <Tooltip key={feature.feature} text={`${feature.count} uses in 30 days`}>
                      <div 
                        className="relative overflow-hidden rounded-lg p-3 border border-white/5 cursor-pointer hover:border-white/20 transition-all"
                        style={{ backgroundColor: `rgba(234, 179, 8, ${0.05 + intensity * 0.15})` }}
                      >
                        <div className="text-lg font-bold text-yellow-400">{feature.count}</div>
                        <div className="text-xs text-zinc-400 capitalize">{feature.feature.replace(/_/g, ' ')}</div>
                      </div>
                    </Tooltip>
                  );
                })}
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
