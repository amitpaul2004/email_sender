import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Trash2, 
  Copy, 
  Eye, 
  Send, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Play,
  Plus,
  RefreshCw
} from 'lucide-react';
import { campaignService } from '../services/api';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await campaignService.getAll(search, statusFilter);
      setCampaigns(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch campaign logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  // Debounced search trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCampaigns();
  };

  const handleDuplicate = async (id) => {
    try {
      setError('');
      setSuccess('');
      const newCampaign = await campaignService.duplicate(id);
      setSuccess(`Duplicated campaign successfully: ${newCampaign.name}`);
      fetchCampaigns();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to duplicate campaign.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign history entry permanently?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await campaignService.delete(id);
      setSuccess('Campaign removed successfully.');
      setCampaigns(campaigns.filter(c => c._id !== id));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to remove campaign log.');
    }
  };

  const getStatusBadge = (status) => {
    const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ";
    switch (status) {
      case 'completed':
        return <span className={base + "bg-green-500/10 text-green-500"}><CheckCircle className="h-3 w-3 mr-1" /> Completed</span>;
      case 'sending':
        return <span className={base + "bg-yellow-500/10 text-yellow-500 animate-pulse"}><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Sending</span>;
      case 'paused':
        return <span className={base + "bg-orange-500/10 text-orange-500"}><Clock className="h-3 w-3 mr-1" /> Paused</span>;
      case 'scheduled':
        return <span className={base + "bg-blue-500/10 text-blue-500"}><Calendar className="h-3 w-3 mr-1" /> Scheduled</span>;
      case 'failed':
        return <span className={base + "bg-red-500/10 text-red-500"}><AlertTriangle className="h-3 w-3 mr-1" /> Failed</span>;
      default:
        return <span className={base + "bg-gray-500/10 text-gray-500"}><Clock className="h-3 w-3 mr-1" /> Draft</span>;
    }
  };

  const getProgressPercentage = (stats) => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.sent / stats.total) * 100);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-gray-800 dark:text-gray-200 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Campaign History</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Manage, track progress, and inspect past dispatches.</p>
        </div>
        <Link
          to="/campaigns/new"
          className="flex items-center justify-center space-x-2 bg-purple-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-purple-500/20 hover:bg-purple-500 active:scale-98 transition-all duration-300 text-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-sm"
          />
        </form>

        {/* Status filters */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {['all', 'draft', 'scheduled', 'sending', 'completed', 'failed', 'paused'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all duration-300 cursor-pointer ${
                statusFilter === status
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/10'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Fetching history...</p>
        </div>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c) => {
            const progress = getProgressPercentage(c.stats);
            return (
              <div
                key={c._id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    {getStatusBadge(c.status)}
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">
                      {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Header Title / Subject */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-950 dark:text-white truncate" title={c.name}>
                      {c.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      Subject: {c.subject}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-500">Delivery Status</span>
                      <span>{c.stats.sent} / {c.stats.total} ({progress}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          c.status === 'completed' ? 'bg-green-500' :
                          c.status === 'failed' ? 'bg-red-500' :
                          c.status === 'sending' ? 'bg-yellow-500 animate-pulse' :
                          'bg-purple-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats snippet */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs border-t border-gray-100 dark:border-gray-850 pt-3">
                    <div>
                      <span className="text-gray-400 block font-semibold uppercase text-[9px]">Opened</span>
                      <span className="font-extrabold text-blue-500">{c.stats.opens || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold uppercase text-[9px]">Clicked</span>
                      <span className="font-extrabold text-green-500">{c.stats.clicks || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold uppercase text-[9px]">Bounced</span>
                      <span className="font-extrabold text-red-500">{c.stats.failed || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center space-x-2 border-t border-gray-100 dark:border-gray-850 pt-4 mt-6">
                  {/* View Details */}
                  <Link
                    to={`/campaigns/${c._id}`}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/40 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Logs</span>
                  </Link>

                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicate(c._id)}
                    className="p-2 border border-gray-200 dark:border-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl transition-all cursor-pointer"
                    title="Duplicate Campaign"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="p-2 border border-gray-200 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-950/35 hover:border-red-200 dark:hover:border-red-900/30 text-red-500 rounded-xl transition-all cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xl">
          <Clock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No campaigns found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-md mx-auto">
            Get started by composing your first message list and scheduling a bulk email sending task.
          </p>
          <Link
            to="/campaigns/new"
            className="inline-flex items-center space-x-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg mt-6 hover:bg-purple-500 transition-all text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </Link>
        </div>
      )}
    </div>
  );
}
