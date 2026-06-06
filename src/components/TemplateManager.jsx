import React, { useEffect, useState } from 'react';
import { 
  FileCode, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  Sparkles,
  HelpCircle,
  Bold,
  Italic,
  Link2,
  List,
  CheckCircle
} from 'lucide-react';
import { templateService } from '../services/api';

export default function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [detectedVars, setDetectedVars] = useState([]);

  // Editor drawer
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await templateService.getAll();
      setTemplates(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Monitor subject/body for merge tags variable detection
  useEffect(() => {
    const combined = subject + ' ' + body;
    const matches = combined.match(/\{\{([^}]+)\}\}/g) || [];
    const vars = [...new Set(matches.map(v => v.replace(/\{\{|\}\}/g, '').trim().toLowerCase()))];
    setDetectedVars(vars);
  }, [subject, body]);

  const handleEditClick = (template) => {
    setError('');
    setEditId(template._id);
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditId(null);
    setName('');
    setSubject('');
    setBody('');
    setIsFormOpen(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Template title name is required.');
      return;
    }
    if (!subject.trim()) {
      setError('Default subject line is required.');
      return;
    }
    if (!body.trim()) {
      setError('Email body code content is required.');
      return;
    }

    try {
      const payload = {
        name,
        subject,
        body,
        variables: detectedVars
      };

      if (editId) {
        await templateService.update(editId, payload);
        setSuccess('Template saved successfully!');
      } else {
        await templateService.create(payload);
        setSuccess('Template created successfully!');
      }

      handleCancel();
      fetchTemplates();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving template settings.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template permanently? Campaign history will not be affected.')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await templateService.delete(id);
      setSuccess('Template removed.');
      setTemplates(templates.filter(t => t._id !== id));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete template.');
    }
  };

  // HTML format helper
  const insertFormatting = (tagOpen, tagClose = '') => {
    const textarea = document.getElementById('template-body-textarea');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-gray-800 dark:text-gray-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Email Templates</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Create and save rich layouts with merge tags for instant scheduling.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-center space-x-2 bg-purple-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-purple-500/20 hover:bg-purple-500 active:scale-98 transition-all duration-300 text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Template</span>
          </button>
        )}
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

      {/* Editor drawer */}
      {isFormOpen && (
        <div className="bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-950 shadow-2xl rounded-2xl p-6 relative">
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center space-x-2">
            <FileCode className="h-5 w-5 text-purple-600" />
            <span>{editId ? 'Edit Layout Template' : 'Compose New Template'}</span>
          </h2>

          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left compose form */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Black Friday Promotional Sale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Subject Default</label>
                <input
                  type="text"
                  placeholder="Hi {{name}}, we have an update for you!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase text-gray-400">Email Body HTML Code</label>
                  
                  {/* Rich text formatting tools */}
                  <div className="flex items-center space-x-1 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => insertFormatting('<strong>', '</strong>')}
                      className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-205 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Bold text"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<em>', '</em>')}
                      className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-205 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Italic text"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<a href="https://example.com" target="_blank">', '</a>')}
                      className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-205 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Insert hyperlink"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                      className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-205 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Bullet list"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    {/* Injectors */}
                    <button
                      type="button"
                      onClick={() => insertFormatting('{{name}}')}
                      className="text-[10px] px-1 text-purple-600 font-bold hover:bg-purple-100 dark:hover:bg-purple-950/40 rounded transition-colors"
                    >
                      {"{Name}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('{{company}}')}
                      className="text-[10px] px-1 text-indigo-600 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-950/40 rounded transition-colors"
                    >
                      {"{Company}"}
                    </button>
                  </div>
                </div>

                <textarea
                  id="template-body-textarea"
                  placeholder="<h2>Greeting</h2>\n<p>Write email details here...</p>"
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-mono"
                />
              </div>
            </div>

            {/* Right details variables detector */}
            <div className="space-y-4 text-sm bg-gray-50 dark:bg-gray-950 p-5 rounded-2xl border border-gray-100 dark:border-gray-850">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Variables Detected</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Placeholders found in subject and body editor text:</p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {detectedVars.length > 0 ? (
                  detectedVars.map((v) => (
                    <span key={v} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600">
                      {`{{${v}}}`}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No variables detected. Add merge tags like {"{{name}}"} to auto-detect.</span>
                )}
              </div>

              {/* Guide */}
              <div className="text-xs border-t border-gray-100 dark:border-gray-850 pt-4 space-y-2 text-gray-500">
                <span className="font-bold text-gray-400 uppercase tracking-wider block text-[10px]">Editor Tips</span>
                <p>1. Formatting helpers will write standard HTML markup into the editor.</p>
                <p>2. Merge tags are replaced on the fly at dispatch. Match them with CSV header names.</p>
              </div>

              <div className="flex items-center space-x-2 pt-6 border-t border-gray-100 dark:border-gray-850">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 text-white font-bold py-2.5 rounded-xl hover:bg-purple-500 transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Template</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Fetching templates...</p>
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <div
              key={t._id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="bg-purple-500/10 text-purple-600 p-2.5 rounded-xl">
                    <FileCode className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-950 dark:text-white truncate" title={t.name}>
                    {t.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    Subject: {t.subject}
                  </p>
                </div>

                {/* Variables tag summary */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Merge tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {t.variables && t.variables.length > 0 ? (
                      t.variables.map((v) => (
                        <span key={v} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono text-gray-600 dark:text-gray-300 font-semibold uppercase">
                          {v}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 border-t border-gray-100 dark:border-gray-850 pt-4 mt-6">
                <button
                  onClick={() => handleEditClick(t)}
                  className="flex-1 flex items-center justify-center space-x-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(t._id)}
                  className="p-2 border border-gray-200 dark:border-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer"
                  title="Delete Template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xl">
          <FileCode className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No layouts saved</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-md mx-auto">
            Design reusable rich text templates once and deploy them across any future recipient campaigns.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center space-x-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg mt-6 hover:bg-purple-500 transition-all text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Template</span>
          </button>
        </div>
      )}
    </div>
  );
}
