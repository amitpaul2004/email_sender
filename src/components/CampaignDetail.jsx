import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info,
  Terminal,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { campaignService } from '../services/api';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const logsEndRef = useRef(null);

  // States
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  const fetchCampaignDetail = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const data = await campaignService.getById(id);
      setCampaign(data);
      
      // Activate polling if the campaign status is actively sending
      if (data.status === 'sending') {
        setPollingActive(true);
      } else {
        setPollingActive(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch campaign details.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignDetail(true);
  }, [id]);

  // Polling hook
  useEffect(() => {
    let intervalId;
    if (pollingActive) {
      intervalId = setInterval(() => {
        fetchCampaignDetail(false);
      }, 1500); // Poll every 1.5 seconds for live updates
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollingActive]);

  // Auto scroll logs panel to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [campaign?.logs]);

  const handleSend = async () => {
    try {
      setActionLoading(true);
      setError('');
      await campaignService.send(id);
      setPollingActive(true);
      await fetchCampaignDetail(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to trigger bulk send.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setActionLoading(true);
      setError('');
      await campaignService.pause(id);
      setPollingActive(false);
      await fetchCampaignDetail(false);
    } catch (err) {
      setError('Failed to pause campaign dispatch.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    if (!campaign) return;
    const downloadUrl = campaignService.exportCSVUrl(id);
    window.open(downloadUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Loading campaign diagnostics...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Campaign not found</h2>
        <Link to="/campaigns" className="text-purple-600 hover:underline mt-4 inline-block font-semibold">
          Return to list
        </Link>
      </div>
    );
  }

  // Calculate statistics percentages
  const progressPercent = campaign.stats.total > 0 
    ? Math.round((campaign.stats.sent / campaign.stats.total) * 100) 
    : 0;

  const getLogTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400 font-bold';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  const cardStyle = "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:shadow-2xl";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-gray-800 dark:text-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Link
            to="/campaigns"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate max-w-sm sm:max-w-md">{campaign.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                campaign.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                campaign.status === 'sending' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                campaign.status === 'scheduled' ? 'bg-blue-500/10 text-blue-500' :
                campaign.status === 'paused' ? 'bg-orange-500/10 text-orange-500' :
                'bg-gray-500/10 text-gray-500'
              }`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Subject: <span className="font-medium text-gray-800 dark:text-gray-200">{campaign.subject}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchCampaignDetail(false)}
            className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${pollingActive ? 'animate-spin' : ''}`} />
          </button>

          {/* Pause / Send Controls */}
          {campaign.status === 'sending' ? (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-orange-500/20 active:scale-98 transition-all text-sm cursor-pointer"
            >
              <Pause className="h-4 w-4" />
              <span>Pause Campaign</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={actionLoading || campaign.status === 'completed'}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-400 text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-purple-500/20 active:scale-98 transition-all text-sm disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>{campaign.status === 'paused' ? 'Resume Sending' : 'Start Sending'}</span>
            </button>
          )}

          {/* Export CSV Report */}
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer"
            title="Export full campaign recipient report"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Recipients */}
        <div className={cardStyle}>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total List</span>
          <span className="text-3xl font-extrabold block mt-2 text-gray-900 dark:text-white">{campaign.stats.total}</span>
          <span className="text-[10px] text-gray-500 mt-1 block">Uploaded CSV rows</span>
        </div>

        {/* Sent successfully */}
        <div className={cardStyle}>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Delivered</span>
          <span className="text-3xl font-extrabold block mt-2 text-green-500">{campaign.stats.sent}</span>
          <span className="text-[10px] text-gray-500 mt-1 block">Emails dispatched</span>
        </div>

        {/* Failed */}
        <div className={cardStyle}>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Failed</span>
          <span className="text-3xl font-extrabold block mt-2 text-red-500">{campaign.stats.failed}</span>
          <span className="text-[10px] text-gray-500 mt-1 block">Blocked / Error status</span>
        </div>

        {/* Remaining */}
        <div className={cardStyle}>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Remaining</span>
          <span className="text-3xl font-extrabold block mt-2 text-gray-600 dark:text-gray-300">{campaign.stats.remaining}</span>
          <span className="text-[10px] text-gray-500 mt-1 block">Pending in queue</span>
        </div>

        {/* Opens */}
        <div className={cardStyle}>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Opens</span>
          <span className="text-3xl font-extrabold block mt-2 text-blue-500">{campaign.stats.opens || 0}</span>
          <span className="text-[10px] text-gray-500 mt-1 block">Pixel detections</span>
        </div>

        {/* Clicks */}
        <div className={cardStyle}>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Clicks</span>
          <span className="text-3xl font-extrabold block mt-2 text-purple-500">{campaign.stats.clicks || 0}</span>
          <span className="text-[10px] text-gray-500 mt-1 block">Link redirections</span>
        </div>
      </div>

      {/* Progress & Body Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Progress tracker details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress gauge card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Dispatch Progress</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Sending Completion</span>
                <span className="text-purple-600 dark:text-purple-400">{progressPercent}%</span>
              </div>
              
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-4 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-gray-100 dark:border-gray-850">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-400 font-semibold block uppercase text-[9px]">Created On</span>
                  <span>{new Date(campaign.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {campaign.sentAt && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <div>
                    <span className="text-gray-400 font-semibold block uppercase text-[9px]">Execution Started</span>
                    <span>{new Date(campaign.sentAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Logs Terminal Panel */}
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <div className="flex items-center space-x-2 text-purple-400 font-mono text-sm">
                <Terminal className="h-4 w-4" />
                <span className="font-bold">Live Delivery Status Log Console</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${pollingActive ? 'bg-green-500 animate-ping' : 'bg-gray-500'}`}></span>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">{pollingActive ? 'Receiving Live Streams' : 'Disconnected'}</span>
              </div>
            </div>

            {/* Term container */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs select-text">
              {campaign.logs && campaign.logs.length > 0 ? (
                campaign.logs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-purple-500/80 font-semibold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={getLogTypeColor(log.type)}>
                      {log.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-20">
                  <span>- Console awaiting execution triggers -</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Right Side: Message body static preview */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Email Configuration</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SMTP settings and template preview configured for this dispatch</p>
          </div>

          <div className="space-y-4">
            {/* SMTP config info */}
            <div className="border border-gray-100 dark:border-gray-850 p-4 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-gray-400 uppercase tracking-wider block">SMTP Server</span>
              {campaign.smtpConfig && campaign.smtpConfig.auth?.user ? (
                <div className="space-y-1 font-medium">
                  <p>Type: <span className="capitalize font-bold text-purple-600 dark:text-purple-400">{campaign.smtpConfig.service}</span></p>
                  {campaign.smtpConfig.service === 'custom' && (
                    <p>Host: <span className="font-bold">{campaign.smtpConfig.host}:{campaign.smtpConfig.port}</span></p>
                  )}
                  <p>User: <span className="font-bold">{campaign.smtpConfig.auth.user}</span></p>
                </div>
              ) : (
                <p className="text-gray-500 font-semibold">Using global system default SMTP configuration.</p>
              )}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-850">
                <span className="text-gray-400 block font-semibold uppercase text-[9px]">Rate Limiting Delay</span>
                <span className="font-bold">{campaign.rateLimit || 1} seconds per recipient</span>
              </div>
            </div>

            {/* Campaign body content preview */}
            <div className="space-y-2">
              <span className="font-bold text-gray-400 uppercase tracking-wider text-xs block">Message Content Preview</span>
              <div 
                className="text-xs bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-3 rounded-lg overflow-y-auto max-h-[200px] prose dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: campaign.body }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
