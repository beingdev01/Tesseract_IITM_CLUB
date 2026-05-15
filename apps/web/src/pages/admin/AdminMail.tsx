import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mail,
  Send,
  Users,
  Globe,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Code,
  FileText,
  UserPlus,
  Hash,
  AtSign,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Markdown } from '@/components/ui/markdown';
import { api } from '@/lib/api';
import type { MailRecipient as Recipient } from '@/lib/api';

type BodyType = 'markdown' | 'html';
type Audience = 'all_users' | 'all_network' | 'specific';
type SearchType = 'users' | 'network';

export default function AdminMail() {
  const { token } = useAuth();

  // --- Audience ---
  const [audience, setAudience] = useState<Audience>('all_users');

  // --- Email composition ---
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState<BodyType>('markdown');
  const [showPreview, setShowPreview] = useState(false);

  // --- Send state ---
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  // --- Recipient search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('users');
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --- Manual email input ---
  const [manualEmail, setManualEmail] = useState('');

  // --- CC / BCC ---
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');

  // Refs to avoid stale closures
  const selectedRef = useRef(selectedRecipients);
  selectedRef.current = selectedRecipients;
  // Monotonic run id — newer searches discard older responses (replaces AbortController
  // since the typed client doesn't plumb signals).
  const latestRunIdRef = useRef(0);

  // --- Search function (stable — no deps on selectedRecipients) ---
  const doSearch = useCallback(async (query: string, type: SearchType) => {
    if (!token || query.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const runId = ++latestRunIdRef.current;
    setSearching(true);
    setHasSearched(false);

    try {
      const results = await api.getMailRecipients(query, type, token);
      if (runId !== latestRunIdRef.current) return;
      const selectedEmails = new Set(selectedRef.current.map(r => r.email));
      setSearchResults(results.filter(r => !selectedEmails.has(r.email)));
    } catch {
      if (runId === latestRunIdRef.current) setSearchResults([]);
    } finally {
      if (runId === latestRunIdRef.current) {
        setSearching(false);
        setHasSearched(true);
      }
    }
  }, [token]);

  // --- Debounced search triggering ---
  useEffect(() => {
    if (audience !== 'specific') return;

    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        doSearch(searchQuery, searchType);
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchType, audience, doSearch]);

  // Invalidate any in-flight search on unmount so its response is dropped.
  useEffect(() => () => { latestRunIdRef.current = -1; }, []);

  // --- Recipient management ---
  const addRecipient = (recipient: Recipient) => {
    if (selectedRecipients.some(r => r.email === recipient.email)) return; // dup guard
    setSelectedRecipients(prev => [...prev, recipient]);
    setSearchResults(prev => prev.filter(r => r.email !== recipient.email));
  };

  const removeRecipient = (email: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.email !== email));
  };

  const clearRecipients = () => {
    setSelectedRecipients([]);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setManualEmail('');
  };

  const addManualEmail = () => {
    const email = manualEmail.trim().toLowerCase();
    if (!email) return;
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (selectedRecipients.some(r => r.email === email)) {
      setError('This email is already added');
      return;
    }
    setSelectedRecipients(prev => [...prev, { id: `manual-${Date.now()}`, name: email, email }]);
    setManualEmail('');
    setError(null);
  };

  // --- CC/BCC helpers ---
  const addCcBccEmail = (type: 'cc' | 'bcc') => {
    const input = type === 'cc' ? ccInput : bccInput;
    const email = input.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    const list = type === 'cc' ? ccEmails : bccEmails;
    if (list.includes(email)) {
      setError('This email is already added');
      return;
    }
    if (list.length >= 50) {
      setError(`Maximum 50 ${type.toUpperCase()} recipients allowed`);
      return;
    }
    if (type === 'cc') { setCcEmails(prev => [...prev, email]); setCcInput(''); }
    else { setBccEmails(prev => [...prev, email]); setBccInput(''); }
    setError(null);
  };

  // --- Send handler ---
  const handleSend = async () => {
    if (!token) return;
    setError(null);

    if (!subject.trim()) { setError('Subject is required'); return; }
    if (!body.trim()) { setError('Email body is required'); return; }
    if (audience === 'specific' && selectedRecipients.length === 0) {
      setError('Please add at least one recipient');
      return;
    }

    setSending(true);
    setSuccess(null);

    try {
      const data = await api.sendMail({
        audience,
        emails: audience === 'specific' ? selectedRecipients.map(r => r.email) : undefined,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        bcc: bccEmails.length > 0 ? bccEmails : undefined,
        subject: subject.trim(),
        body: body.trim(),
        bodyType,
      }, token);

      setSuccess(data.message || `Email sent to ${data.recipientCount ?? 0} recipient(s)`);
      setConfirmSend(false);
      setSubject('');
      setBody('');
      setSelectedRecipients([]);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      setCcEmails([]);
      setBccEmails([]);
      setCcInput('');
      setBccInput('');
      setShowCcBcc(false);

      setTimeout(() => setSuccess(null), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // --- UI ---
  const audienceOptions: { value: Audience; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'all_users', label: 'All Users', desc: 'Every registered user', icon: <Users className="h-5 w-5" /> },
    { value: 'all_network', label: 'All Network', desc: 'Verified network members', icon: <Globe className="h-5 w-5" /> },
    { value: 'specific', label: 'Specific', desc: 'Pick individual recipients', icon: <UserPlus className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-amber-900">Send Mail</h1>
        <p className="text-gray-600 dark:text-zinc-400">Compose and send themed emails to your community</p>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-300"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto shrink-0">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Success */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 rounded-lg text-green-700 dark:text-green-300"
        >
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </motion.div>
      )}

      {/* ── Audience Selector ── */}
      <Card className="border-amber-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            Recipients
          </CardTitle>
          <CardDescription>Choose who receives this email</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {audienceOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setAudience(opt.value);
                  clearRecipients();
                }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  audience === opt.value
                    ? 'border-amber-500 bg-amber-50 shadow-sm'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-amber-300 hover:bg-amber-50/50'
                }`}
              >
                <div className={`mb-2 ${audience === opt.value ? 'text-amber-600' : 'text-gray-400 dark:text-zinc-500'}`}>
                  {opt.icon}
                </div>
                <p className={`font-medium text-sm ${audience === opt.value ? 'text-amber-900' : 'text-gray-700 dark:text-zinc-300'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* ── Specific Recipients Search ── */}
          {audience === 'specific' && (
            <div className="mt-4 space-y-4">
              {/* Manual email input */}
              <div className="space-y-2">
                <label htmlFor="admin-mail-manual-email" className="text-xs font-medium text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                  <AtSign className="h-3 w-3" />
                  Add email manually
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
                    <Input
                      id="admin-mail-manual-email"
                      value={manualEmail}
                      onChange={e => setManualEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManualEmail(); } }}
                      placeholder="someone@example.com"
                      className="pl-10"
                      type="email"
                    />
                  </div>
                  <Button
                    onClick={addManualEmail}
                    disabled={!manualEmail.trim()}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-surface-3" />
                <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium">or search registered members</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-surface-3" />
              </div>

              {/* Search type toggle */}
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Search in:</p>
                <div className="flex rounded-md border border-gray-200 dark:border-zinc-800 overflow-hidden text-xs">
                  <button
                    onClick={() => { setSearchType('users'); setSearchResults([]); setHasSearched(false); }}
                    className={`px-3 py-1 transition-colors ${
                      searchType === 'users' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-surface-1 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:bg-surface-1'
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => { setSearchType('network'); setSearchResults([]); setHasSearched(false); }}
                    className={`px-3 py-1 transition-colors ${
                      searchType === 'network' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-surface-1 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:bg-surface-1'
                    }`}
                  >
                    Network
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${searchType === 'network' ? 'network members' : 'users'} by name or email…`}
                  className="pl-10 pr-10"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-amber-500" />
                )}
                {!searching && searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setHasSearched(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:text-zinc-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y shadow-sm">
                  {searchResults.map(r => (
                    <button
                      key={r.id || r.email}
                      onClick={() => addRecipient(r)}
                      className="w-full px-4 py-2.5 text-left hover:bg-amber-50 transition-colors flex items-center justify-between text-sm group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                          {(r.name || r.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900 dark:text-zinc-100 truncate block">{r.name}</span>
                          <span className="text-gray-500 dark:text-zinc-400 text-xs truncate block">{r.email}</span>
                        </div>
                      </div>
                      <span className="text-amber-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        + Add
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* No results message */}
              {hasSearched && !searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                <p className="text-xs text-gray-500 dark:text-zinc-400 text-center py-2">
                  No {searchType === 'network' ? 'network members' : 'users'} found for "{searchQuery}"
                </p>
              )}

              {/* Selected recipients chips */}
              {selectedRecipients.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {selectedRecipients.length} recipient{selectedRecipients.length > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={clearRecipients}
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:text-red-300 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipients.map(r => (
                      <span
                        key={r.email}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium max-w-[200px]"
                        title={`${r.name} (${r.email})`}
                      >
                        <span className="truncate">{r.name || r.email}</span>
                        <button
                          onClick={() => removeRecipient(r.email)}
                          className="hover:text-red-600 dark:text-red-400 transition-colors shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Compose Email ── */}
      <Card className="border-amber-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-amber-600" />
            Compose
          </CardTitle>
          <CardDescription>Write your email using Markdown or raw HTML</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <label htmlFor="admin-mail-subject" className="text-sm font-medium text-gray-700 dark:text-zinc-300">Subject</label>
            <Input
              id="admin-mail-subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject line…"
              maxLength={200}
            />
            <p className="text-xs text-gray-400 dark:text-zinc-500 text-right">{subject.length}/200</p>
          </div>

          {/* CC / BCC toggle + inputs */}
          <div>
            <button
              type="button"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
            >
              {showCcBcc ? 'Hide CC/BCC' : '+ Add CC/BCC'}
              {(ccEmails.length > 0 || bccEmails.length > 0) && !showCcBcc && (
                <span className="ml-1 text-gray-500 dark:text-zinc-400">
                  ({[ccEmails.length > 0 ? `${ccEmails.length} CC` : '', bccEmails.length > 0 ? `${bccEmails.length} BCC` : ''].filter(Boolean).join(', ')})
                </span>
              )}
            </button>

            {showCcBcc && (
              <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-zinc-800">
                {/* CC */}
                <div className="space-y-1.5">
                  <label htmlFor="admin-mail-cc" className="text-xs font-medium text-gray-500 dark:text-zinc-400">CC</label>
                  <div className="flex gap-2">
                    <Input
                      id="admin-mail-cc"
                      value={ccInput}
                      onChange={e => setCcInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCcBccEmail('cc'); } }}
                      placeholder="cc@example.com"
                      type="email"
                      className="flex-1 h-8 text-sm"
                    />
                    <Button
                      onClick={() => addCcBccEmail('cc')}
                      disabled={!ccInput.trim()}
                      variant="outline"
                      size="sm"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {ccEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ccEmails.map(email => (
                        <span key={email} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                          <span className="truncate max-w-[160px]">{email}</span>
                          <button onClick={() => setCcEmails(prev => prev.filter(e => e !== email))} className="hover:text-red-600 dark:text-red-400 shrink-0">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* BCC */}
                <div className="space-y-1.5">
                  <label htmlFor="admin-mail-bcc" className="text-xs font-medium text-gray-500 dark:text-zinc-400">BCC</label>
                  <div className="flex gap-2">
                    <Input
                      id="admin-mail-bcc"
                      value={bccInput}
                      onChange={e => setBccInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCcBccEmail('bcc'); } }}
                      placeholder="bcc@example.com"
                      type="email"
                      className="flex-1 h-8 text-sm"
                    />
                    <Button
                      onClick={() => addCcBccEmail('bcc')}
                      disabled={!bccInput.trim()}
                      variant="outline"
                      size="sm"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {bccEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {bccEmails.map(email => (
                        <span key={email} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-surface-3 text-gray-700 dark:text-zinc-300 rounded-full text-xs font-medium">
                          <span className="truncate max-w-[160px]">{email}</span>
                          <button onClick={() => setBccEmails(prev => prev.filter(e => e !== email))} className="hover:text-red-600 dark:text-red-400 shrink-0">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label htmlFor="admin-mail-body" className="text-sm font-medium text-gray-700 dark:text-zinc-300">Body</label>
                <div className="flex rounded-md border border-gray-200 dark:border-zinc-800 overflow-hidden text-xs">
                  <button
                    onClick={() => { setBodyType('markdown'); setShowPreview(false); }}
                    className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                      bodyType === 'markdown' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-surface-1 text-gray-600 dark:text-zinc-400 hover:bg-amber-50'
                    }`}
                  >
                    <FileText className="h-3 w-3" /> MD
                  </button>
                  <button
                    onClick={() => { setBodyType('html'); setShowPreview(false); }}
                    className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                      bodyType === 'html' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-surface-1 text-gray-600 dark:text-zinc-400 hover:bg-amber-50'
                    }`}
                  >
                    <Code className="h-3 w-3" /> HTML
                  </button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs"
              >
                {showPreview ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
            </div>

            {showPreview ? (
              bodyType === 'html' ? (
                <div className="min-h-[200px] border rounded-lg overflow-hidden">
                  <iframe
                    title="HTML Preview"
                    srcDoc={body || '<p style="color:#aaa;padding:16px">Nothing to preview</p>'}
                    className="w-full h-64 border-0"
                    sandbox=""
                  />
                </div>
              ) : (
                <div className="min-h-[200px] p-4 border rounded-lg bg-gray-50 dark:bg-surface-1 prose prose-sm max-w-none">
                  {body ? <Markdown>{body}</Markdown> : <p className="text-gray-400 dark:text-zinc-500 italic">Nothing to preview</p>}
                </div>
              )
            ) : (
              <textarea
                id="admin-mail-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full min-h-[200px] px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono resize-y"
                placeholder={
                  bodyType === 'html'
                    ? '<h2>Hello!</h2>\n<p>Write your <strong>HTML</strong> email here.</p>'
                    : 'Write your email body in **Markdown**...\n\n- Use **bold** and *italic*\n- Add [links](https://example.com)'
                }
              />
            )}
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {bodyType === 'html'
                ? 'HTML will be sanitized before sending — scripts, iframes, and dangerous attributes are stripped.'
                : 'The email will be sent using the premium Tesseract dark theme template.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Send Actions ── */}
      <div className="flex items-center gap-3 justify-end">
        {!confirmSend ? (
          <Button
            onClick={() => setConfirmSend(true)}
            disabled={
              !subject.trim() ||
              !body.trim() ||
              (audience === 'specific' && selectedRecipients.length === 0)
            }
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">
              Send to{' '}
              {audience === 'specific'
                ? `${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''}`
                : audience === 'all_users'
                  ? 'all users'
                  : 'all network members'}
              {ccEmails.length > 0 ? ` + ${ccEmails.length} CC` : ''}
              {bccEmails.length > 0 ? ` + ${bccEmails.length} BCC` : ''}
              ?
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmSend(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              Confirm
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
