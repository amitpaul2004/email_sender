import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Send, 
  Mail, 
  BarChart2, 
  CheckCircle, 
  AlertCircle, 
  MousePointer, 
  TrendingUp, 
  Clock, 
  Plus, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { campaignService } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await campaignService.getAnalyticsSummary();
      setStats(data.summary);
      setChartData(data.chartData);

      const campaigns = await campaignService.getAll('', 'all');
      setRecentCampaigns(campaigns.slice(0, 5));
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard metrics. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Gathering campaign intelligence...</p>
      </div>
    );
  }

  const cardStyle = "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-gray-800 dark:text-gray-200 animate-fade-in">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Campaign Intelligence</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Real-time statistics and delivery performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/campaigns/new"
            className="flex items-center space-x-2 bg-purple-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-purple-500/20 hover:bg-purple-500 active:scale-98 transition-all duration-300 text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Delivery Rate Card */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Delivery Rate</span>
            <div className="bg-green-50 dark:bg-green-950/30 text-green-500 p-2.5 rounded-xl">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight">{stats?.deliveryRate || 0}%</span>
            <span className="text-xs font-semibold text-green-500 flex items-center bg-green-500/10 px-1.5 py-0.5 rounded">
              <TrendingUp className="h-3 w-3 mr-0.5" /> High
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {stats?.totalSent || 0} of {stats?.totalRecipients || 0} emails delivered
          </div>
        </div>

        {/* Open Rate Card */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Open Rate</span>
            <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-500 p-2.5 rounded-xl">
              <Mail className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight">{stats?.openRate || 0}%</span>
            <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
              {stats?.totalOpens || 0} unique opens
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Percentage of recipients who loaded images
          </div>
        </div>

        {/* Click Rate Card */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Click-Through</span>
            <div className="bg-purple-50 dark:bg-purple-950/30 text-purple-500 p-2.5 rounded-xl">
              <MousePointer className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight">{stats?.clickRate || 0}%</span>
            <span className="text-xs font-semibold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">
              {stats?.totalClicks || 0} total clicks
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Recipients clicking tracking links
          </div>
        </div>

        {/* Bounce Rate Card */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Bounce Rate</span>
            <div className="bg-red-50 dark:bg-red-950/30 text-red-500 p-2.5 rounded-xl">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight">{stats?.bounceRate || 0}%</span>
            <span className="text-xs font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
              {stats?.totalFailed || 0} failures
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Undelivered email address blocks
          </div>
        </div>
      </div>

      {/* Analytics Graph */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Delivery Performance Trend</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Emails dispatched, opened, and clicked over time</p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1">
              <span className="h-3 w-3 bg-purple-500 rounded-full"></span>
              <span>Dispatched</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="h-3 w-3 bg-blue-500 rounded-full"></span>
              <span>Opened</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="h-3 w-3 bg-green-500 rounded-full"></span>
              <span>Clicked</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorClicked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                    borderColor: '#374151',
                    borderRadius: '12px',
                    color: '#f9fafb'
                  }} 
                />
                <Area type="monotone" dataKey="sent" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" name="Sent" />
                <Area type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOpened)" name="Opened" />
                <Area type="monotone" dataKey="clicked" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorClicked)" name="Clicked" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <div className="text-center text-gray-500">
                <BarChart2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-semibold">No send trends yet</p>
                <p className="text-xs mt-1">Dispatched campaigns will display aggregate metrics here.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Campaigns History */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Recent Activities</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current status of recent campaign logs</p>
            </div>
            <Link to="/campaigns" className="text-xs font-semibold text-purple-600 hover:text-purple-500 flex items-center">
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentCampaigns.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3">Campaign Name</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Sent / Total</th>
                    <th className="pb-3">Created At</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                  {recentCampaigns.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                        {c.name}
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          c.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                          c.status === 'sending' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                          c.status === 'scheduled' ? 'bg-blue-500/10 text-blue-500' :
                          c.status === 'paused' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 font-medium">
                        {c.stats.sent} / {c.stats.total}
                      </td>
                      <td className="py-4 text-gray-500 dark:text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 text-right">
                        <Link to={`/campaigns/${c._id}`} className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-semibold">No recent campaigns</p>
                <p className="text-xs mt-1">Get started by creating your first recipient draft list.</p>
              </div>
            )}
          </div>
        </div>

        {/* Merge Tags & Instructions Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Email Personalization</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Merge tags match custom values dynamically per recipient.</p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 p-4 rounded-xl">
              <code className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                {"{{name}}"}
              </code>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2">Recipient Name</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Will resolve to the "Name" column in your CSV. Defaults to blank if missing.</p>
            </div>

            <div className="border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 p-4 rounded-xl">
              <code className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                {"{{email}}"}
              </code>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2">Email Address</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Will resolve to the recipient's email. Extremely useful for customized footers.</p>
            </div>

            <div className="border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 p-4 rounded-xl">
              <code className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">
                {"{{company}}"}
              </code>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2">Company/Organization</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Will resolve to the "Company" column in your CSV. Great for business-to-business bulk pitches.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
