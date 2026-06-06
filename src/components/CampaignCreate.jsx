import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Code, 
  Sliders, 
  Calendar,
  Layers,
  Save,
  Send,
  HelpCircle,
  Bold,
  Italic,
  Link2,
  List,
  Sparkles,
  Server
} from 'lucide-react';
import { campaignService, templateService } from '../services/api';

export default function CampaignCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Campaign State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [rateLimit, setRateLimit] = useState(1);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  
  // Custom SMTP State
  const [smtpService, setSmtpService] = useState('custom');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [useCustomSmtp, setUseCustomSmtp] = useState(false);

  // Recipients State
  const [recipients, setRecipients] = useState([]);
  const [recipientsSummary, setRecipientsSummary] = useState({ total: 0, valid: 0, invalid: 0 });
  const [csvFileName, setCsvFileName] = useState('');

  // UI States
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load Templates & Campaign if Editing
  useEffect(() => {
    const loadData = async () => {
      try {
        const templatesList = await templateService.getAll();
        setTemplates(templatesList);

        if (id) {
          setLoading(true);
          const campaign = await campaignService.getById(id);
          setName(campaign.name);
          setSubject(campaign.subject);
          setBody(campaign.body);
          setRateLimit(campaign.rateLimit || 1);
          if (campaign.scheduledAt) {
            setScheduled(true);
            // Format to local date time input format: YYYY-MM-DDThh:mm
            const date = new Date(campaign.scheduledAt);
            const formattedDate = date.toISOString().slice(0, 16);
            setScheduledAt(formattedDate);
          }
          if (campaign.recipients && campaign.recipients.length > 0) {
            setRecipients(campaign.recipients);
            const valid = campaign.recipients.filter(r => r.status !== 'failed').length; // simple approximation
            const total = campaign.recipients.length;
            setRecipientsSummary({ total, valid, invalid: total - valid });
            setCsvFileName('Imported Recipients List');
          }
          if (campaign.smtpConfig && campaign.smtpConfig.auth?.user) {
            setUseCustomSmtp(true);
            setSmtpService(campaign.smtpConfig.service || 'custom');
            setSmtpHost(campaign.smtpConfig.host || '');
            setSmtpPort(campaign.smtpConfig.port || 587);
            setSmtpSecure(campaign.smtpConfig.secure || false);
            setSmtpUser(campaign.smtpConfig.auth.user || '');
            setSmtpPass(campaign.smtpConfig.auth.pass || '');
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch template or campaign settings.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Handle template selection
  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = templates.find(t => t._id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setSuccessMsg(`Loaded template "${template.name}" successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleCSVFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleCSVFile(files[0]);
    }
  };

  const handleCSVFile = async (file) => {
    setError('');
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file (.csv).');
      return;
    }

    try {
      setLoading(true);
      setCsvFileName(file.name);
      const data = await campaignService.uploadCSV(file);
      setRecipients(data.recipients);
      setRecipientsSummary({
        total: data.totalDetected,
        valid: data.validCount,
        invalid: data.invalidCount
      });
      setSuccessMsg(`Successfully parsed ${data.totalDetected} recipients!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error parsing CSV recipient file.');
    } finally {
      setLoading(false);
    }
  };

  // Text Formatting Handlers (HTML manipulation)
  const insertFormatting = (tagOpen, tagClose = '') => {
    const textarea = document.getElementById('campaign-body-editor');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = body.substring(start, end);

    const replacement = tagOpen + (selection || tagClose ? selection : 'Text') + (tagClose || tagOpen);
    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + (selection || 'Text').length);
    }, 50);
  };

  // Render a personalized email preview (replaces merge tags with the first recipient's info)
  const getPersonalizedPreview = (text) => {
    if (!text) return '';
    const sampleRecipient = recipients.find(r => r.isValid) || {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'ABC Ltd'
    };

    return text
      .replace(/\{\{name\}\}/gi, sampleRecipient.name || '<span class="text-purple-600 bg-purple-100 dark:bg-purple-950/40 px-1 rounded font-mono">John Doe</span>')
      .replace(/\{\{email\}\}/gi, sampleRecipient.email || '<span class="text-purple-600 bg-purple-100 dark:bg-purple-950/40 px-1 rounded font-mono">john@example.com</span>')
      .replace(/\{\{company\}\}/gi, sampleRecipient.company || '<span class="text-purple-600 bg-purple-100 dark:bg-purple-950/40 px-1 rounded font-mono">ABC Ltd</span>');
  };

  // Submit / Save Campaign Action
  const handleSave = async (sendImmediately = false) => {
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('Please provide a campaign title.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject line is required.');
      return;
    }
    if (!body.trim()) {
      setError('Email body content cannot be empty.');
      return;
    }
    if (recipients.length === 0) {
      setError('Please upload a recipient CSV list.');
      return;
    }

    setLoading(true);

    const smtpConfig = useCustomSmtp ? {
      service: smtpService,
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass }
    } : null;

    const payload = {
      name,
      subject,
      body,
      recipients,
      rateLimit,
      smtpConfig,
      scheduledAt: scheduled && scheduledAt ? new Date(scheduledAt) : null
    };

    try {
      let campaign;
      if (id) {
        campaign = await campaignService.update(id, payload);
      } else {
        campaign = await campaignService.create(payload);
      }

      if (sendImmediately) {
        await campaignService.send(campaign._id);
        navigate(`/campaigns/${campaign._id}`);
      } else {
        setSuccessMsg(id ? 'Campaign updated successfully!' : 'Campaign draft saved successfully!');
        setTimeout(() => {
          navigate('/campaigns');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred while saving campaign settings.');
      setLoading(false);
    }
  };

  const sampleBodyPreview = getPersonalizedPreview(body);
  const sampleSubjectPreview = getPersonalizedPreview(subject);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-gray-800 dark:text-gray-200 animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/campaigns"
          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {id ? 'Edit Campaign' : 'Create Campaign'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Configure templates, personalize, validate and deploy bulk campaigns.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Campaign Composer */}
        <div className="lg:col-span-2 space-y-6">
          {/* General info */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold tracking-tight">Compose Email</h2>
            
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Campaign Name</label>
              <input
                type="text"
                placeholder="e.g. Q3 Product Announcement"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-sm"
              />
            </div>

            {/* Template select */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5 flex items-center justify-between">
                <span>Select Template</span>
                <span className="text-gray-500 normal-case font-normal">(Optional load template)</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-sm"
              >
                <option value="">-- Choose template --</option>
                {templates.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Subject Line</label>
              <input
                type="text"
                placeholder="Hello {{name}}, check out our latest offers!"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-sm"
              />
            </div>

            {/* Editor body with Formatting Toolbar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase text-gray-400">Email Body (HTML/Text)</label>
                
                {/* Format buttons */}
                <div className="flex items-center space-x-1.5 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => insertFormatting('<strong>', '</strong>')}
                    className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<a href="https://example.com" target="_blank">', '</a>')}
                    className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Insert Link"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                    className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="List"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                  {/* Merge tag injectors */}
                  <button
                    type="button"
                    onClick={() => insertFormatting('{{name}}')}
                    className="text-xs px-1.5 py-0.5 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950/40 rounded font-semibold transition-colors"
                    title="Insert Recipient Name Tag"
                  >
                    {"{Name}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('{{company}}')}
                    className="text-xs px-1.5 py-0.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 rounded font-semibold transition-colors"
                    title="Insert Company Tag"
                  >
                    {"{Company}"}
                  </button>
                </div>
              </div>

              <textarea
                id="campaign-body-editor"
                placeholder="Write your email here. Supports HTML. Use merge tags like {{name}} or {{company}} to personalize."
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-sm font-mono"
              />
            </div>

            {/* Live Preview Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="flex items-center space-x-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>{previewOpen ? 'Hide Preview' : 'Show Live Preview'}</span>
              </button>
            </div>

            {/* Personalized Live Preview Card */}
            {previewOpen && (
              <div className="border border-purple-200 dark:border-purple-900/60 bg-purple-500/5 dark:bg-purple-500/2 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-purple-600">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-bold">Personalized Live Preview</span>
                  </div>
                  <span className="text-xs text-gray-400">Showing sample data from the first recipient.</span>
                </div>
                
                <div className="border-b border-gray-100 dark:border-gray-800/80 pb-2">
                  <span className="text-xs font-semibold text-gray-400 block uppercase">Subject Line</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white" dangerouslySetInnerHTML={{ __html: sampleSubjectPreview || '<i>No Subject</i>' }} />
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-400 block uppercase mb-1">Body Preview</span>
                  <div 
                    className="text-sm bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-4 rounded-lg prose max-w-none min-h-[100px] text-gray-800 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: sampleBodyPreview || '<i>Write body text to preview it here...</i>' }}
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Settings & CSV */}
        <div className="space-y-6">
          {/* CSV File Upload */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold tracking-tight">Recipients List</h2>
            
            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center space-y-2 ${
                isDragOver 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-gray-200 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20'
              }`}
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Drag & Drop Recipient CSV</span>
              <span className="text-xs text-gray-400">or click to browse local files</span>
              <a 
                href="/example.csv" 
                download 
                onClick={(e) => e.stopPropagation()} 
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1.5 font-semibold block"
              >
                Download sample CSV template
              </a>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {csvFileName && (
              <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 p-3 rounded-xl">
                <span className="font-semibold truncate max-w-[150px]">{csvFileName}</span>
                <button 
                  type="button" 
                  onClick={() => {
                    setCsvFileName('');
                    setRecipients([]);
                    setRecipientsSummary({ total: 0, valid: 0, invalid: 0 });
                  }} 
                  className="text-xs text-red-500 hover:underline font-semibold"
                >
                  Clear list
                </button>
              </div>
            )}

            {/* Validation Counts summary */}
            {recipientsSummary.total > 0 && (
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850 p-2.5 rounded-xl">
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Total</span>
                  <span className="text-lg font-extrabold">{recipientsSummary.total}</span>
                </div>
                <div className="border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850 p-2.5 rounded-xl">
                  <span className="text-xs text-green-500 font-semibold block uppercase">Valid</span>
                  <span className="text-lg font-extrabold text-green-500">{recipientsSummary.valid}</span>
                </div>
                <div className="border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850 p-2.5 rounded-xl">
                  <span className="text-xs text-red-500 font-semibold block uppercase">Invalid</span>
                  <span className="text-lg font-extrabold text-red-500">{recipientsSummary.invalid}</span>
                </div>
              </div>
            )}

            {/* Invalid emails highlighter */}
            {recipientsSummary.invalid > 0 && (
              <div className="border border-red-200 dark:border-red-900/40 bg-red-500/5 p-4 rounded-xl space-y-2">
                <div className="flex items-center text-red-600 dark:text-red-400 space-x-1.5 text-xs font-bold uppercase">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Invalid Entries Highlighted ({recipientsSummary.invalid})</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-xs">
                  {recipients.filter(r => !r.isValid).map((r, idx) => (
                    <div key={idx} className="flex justify-between text-red-500/90 font-medium">
                      <span className="truncate max-w-[130px]">{r.name || '(No Name)'}</span>
                      <span className="underline">{r.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sending Settings */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold tracking-tight">Delivery Controls</h2>

            {/* Rate Limiting */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-bold uppercase text-gray-400">
                <span className="flex items-center"><Sliders className="h-3.5 w-3.5 mr-1" /> Rate Limit</span>
                <span className="text-purple-600 dark:text-purple-400 normal-case font-semibold">{rateLimit} sec / email</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={rateLimit}
                onChange={(e) => setRateLimit(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <p className="text-[10px] text-gray-400">Delay between individual mail dispatches to prevent spam detection filters.</p>
            </div>

            {/* Scheduling */}
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-850">
              <div className="flex items-center justify-between">
                <label className="flex items-center text-xs font-bold uppercase text-gray-400">
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule campaign
                </label>
                <input
                  type="checkbox"
                  checked={scheduled}
                  onChange={(e) => setScheduled(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-800 text-purple-600 focus:ring-purple-500 h-4.5 w-4.5"
                />
              </div>

              {scheduled && (
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400">Choose date and time for future delivery:</span>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
              )}
            </div>

            {/* SMTP Service Options toggle */}
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-850">
              <div className="flex items-center justify-between">
                <label className="flex items-center text-xs font-bold uppercase text-gray-400">
                  <Server className="h-3.5 w-3.5 mr-1" /> Custom SMTP service
                </label>
                <input
                  type="checkbox"
                  checked={useCustomSmtp}
                  onChange={(e) => setUseCustomSmtp(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-800 text-purple-600 focus:ring-purple-500 h-4.5 w-4.5"
                />
              </div>

              {useCustomSmtp && (
                <div className="space-y-3.5 text-sm bg-gray-50 dark:bg-gray-950 p-4 border border-gray-100 dark:border-gray-850 rounded-xl">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">Service Type</label>
                    <select
                      value={smtpService}
                      onChange={(e) => setSmtpService(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2 rounded-lg text-xs"
                    >
                      <option value="custom">Custom SMTP Server</option>
                      <option value="gmail">Gmail SMTP</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="mailgun">Mailgun</option>
                      <option value="ses">Amazon SES</option>
                    </select>
                  </div>

                  {smtpService === 'custom' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Host Name</label>
                        <input
                          type="text"
                          placeholder="smtp.domain.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1.5 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Port</label>
                        <input
                          type="number"
                          placeholder="587"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(parseInt(e.target.value))}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1.5 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">SMTP Username</label>
                    <input
                      type="text"
                      placeholder="smtp_user@example.com"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">SMTP Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="flex-1 bg-white dark:bg-gray-900 hover:bg-gray-50 border border-gray-200 dark:border-gray-850 py-3 rounded-xl text-gray-700 dark:text-gray-200 font-bold transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/25 hover:bg-purple-500 active:scale-98 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Send Now</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
