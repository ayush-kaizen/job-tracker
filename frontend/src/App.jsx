import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Building2, Plus, Search, X, ExternalLink,
  Trash2, ChevronDown, ChevronRight, MapPin, BarChart3,
  ArrowRight, AlertCircle, TrendingUp, LayoutGrid, List, Clock,
  Users, Linkedin, Mail, Phone, Edit2
} from 'lucide-react';
import * as api from './api.js';

// ── Constants ───────────────────────────────────────────────────────────────

const ROLE_TYPES = ['full-time', 'internship', 'contract', 'part-time', 'other'];
const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

const ROLE_COLORS = {
  'full-time': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  internship: 'bg-violet-50 text-violet-700 border-violet-200',
  contract: 'bg-amber-50 text-amber-700 border-amber-200',
  'part-time': 'bg-sky-50 text-sky-700 border-sky-200',
  other: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const STATUS_CONFIG = {
  saved:        { label: 'Saved',        color: 'bg-zinc-100 text-zinc-700 border-zinc-300',    dot: 'bg-zinc-400' },
  applied:      { label: 'Applied',      color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  interviewing: { label: 'Interviewing', color: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
  offer:        { label: 'Offer',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rejected:     { label: 'Rejected',     color: 'bg-red-50 text-red-600 border-red-200',        dot: 'bg-red-400' },
};

// ── Small Components ────────────────────────────────────────────────────────

function Badge({ type, config }) {
  const c = config || ROLE_COLORS[type] || ROLE_COLORS.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${c}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status, onClick }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.saved;
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:shadow-sm ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      <ChevronDown className="w-3 h-3 opacity-50" />
    </button>
  );
}

function StatusDropdown({ currentStatus, onSelect, onClose }) {
  return (
    <div className="absolute z-40 mt-1 bg-white rounded-xl border border-zinc-200 shadow-xl py-1 w-44">
      {STATUSES.map((s) => {
        const cfg = STATUS_CONFIG[s];
        return (
          <button key={s} onClick={() => { onSelect(s); onClose(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors ${s === currentStatus ? 'font-medium' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
            {s === currentStatus && <span className="ml-auto text-xs text-zinc-400">current</span>}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-zinc-900 mb-1">{title}</p>
      <p className="text-sm text-zinc-500 mb-4">{subtitle}</p>
      {action}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Add Company Modal ───────────────────────────────────────────────────────

function AddCompanyModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Company name is required');
    setLoading(true); setError('');
    try {
      await api.createCompany({ name: name.trim(), career_page_url: url.trim() || null });
      onCreated(); setName(''); setUrl(''); onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Company">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Company Name *</label>
          <input className="input-field" placeholder="e.g. McKinsey & Company" value={name}
            onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Career Page URL</label>
          <input className="input-field" placeholder="https://careers.mckinsey.com" value={url}
            onChange={(e) => setUrl(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding…' : 'Add Company'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Job Modal ───────────────────────────────────────────────────────────

function AddJobModal({ open, onClose, onCreated, companies }) {
  const [form, setForm] = useState({
    company_id: '', title: '', location: '', role_type: 'full-time',
    salary_range: '', job_url: '', date_posted: '', status: 'saved', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.company_id) return setError('Select a company');
    if (!form.title.trim()) return setError('Job title is required');
    setLoading(true); setError('');
    try {
      await api.createJob({
        ...form, company_id: Number(form.company_id),
        location: form.location || null, salary_range: form.salary_range || null,
        job_url: form.job_url || null, date_posted: form.date_posted || null,
        notes: form.notes || null,
      });
      onCreated();
      setForm({ company_id: '', title: '', location: '', role_type: 'full-time', salary_range: '', job_url: '', date_posted: '', status: 'saved', notes: '' });
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Job Opportunity">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Company *</label>
          <select className="select-field w-full" value={form.company_id} onChange={set('company_id')}>
            <option value="">Select company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Job Title *</label>
          <input className="input-field" placeholder="e.g. Associate Consultant" value={form.title} onChange={set('title')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1.5">Location</label>
            <input className="input-field" placeholder="e.g. New York, NY" value={form.location} onChange={set('location')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1.5">Role Type</label>
            <select className="select-field w-full" value={form.role_type} onChange={set('role_type')}>
              {ROLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1.5">Salary Range</label>
            <input className="input-field" placeholder="e.g. $120k–$150k" value={form.salary_range} onChange={set('salary_range')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1.5">Date Posted</label>
            <input className="input-field" type="date" value={form.date_posted} onChange={set('date_posted')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Job URL</label>
          <input className="input-field" placeholder="https://careers.example.com/job/123" value={form.job_url} onChange={set('job_url')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Initial Status</label>
          <select className="select-field w-full" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Notes</label>
          <textarea className="input-field min-h-[80px] resize-y" placeholder="e.g. Referred by Sarah, apply before March 15…"
            value={form.notes} onChange={set('notes')} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding…' : 'Add Job'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Contact Modal ───────────────────────────────────────────────────────

function AddContactModal({ open, onClose, onCreated, companies }) {
  const [form, setForm] = useState({
    company_id: '', name: '', title: '', linkedin_url: '', email: '', phone: '', notes: '', last_contacted: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.company_id) return setError('Select a company');
    if (!form.name.trim()) return setError('Contact name is required');
    setLoading(true); setError('');
    try {
      await api.createContact({
        ...form, company_id: Number(form.company_id),
        title: form.title || null, linkedin_url: form.linkedin_url || null,
        email: form.email || null, phone: form.phone || null,
        notes: form.notes || null, last_contacted: form.last_contacted || null,
      });
      onCreated();
      setForm({ company_id: '', name: '', title: '', linkedin_url: '', email: '', phone: '', notes: '', last_contacted: '' });
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Contact">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Company *</label>
          <select className="select-field w-full" value={form.company_id} onChange={set('company_id')}>
            <option value="">Select company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1.5">Full Name *</label>
            <input className="input-field" placeholder="e.g. Sarah Johnson" value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1.5">Job Title</label>
            <input className="input-field" placeholder="e.g. VP of Strategy" value={form.title} onChange={set('title')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">LinkedIn Profile URL</label>
          <input className="input-field" placeholder="https://linkedin.com/in/sarahjohnson" value={form.linkedin_url} onChange={set('linkedin_url')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1.5">Email</label>
            <input className="input-field" type="email" placeholder="sarah@company.com" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1.5">Phone</label>
            <input className="input-field" type="tel" placeholder="+1 (555) 123-4567" value={form.phone} onChange={set('phone')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Last Contacted</label>
          <input className="input-field" type="date" value={form.last_contacted} onChange={set('last_contacted')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900 mb-1.5">Notes</label>
          <textarea className="input-field min-h-[80px] resize-y" placeholder="e.g. Met at MBA networking event, interested in referring…"
            value={form.notes} onChange={set('notes')} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding…' : 'Add Contact'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Contacts Table ──────────────────────────────────────────────────────────

function ContactsTable({ contacts, onDelete, onMarkContacted }) {
  const getDaysSince = (dateStr) => {
    if (!dateStr) return -1;
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Company</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Contact Info</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">LinkedIn</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Last Contacted</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Notes</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((ct) => {
              const daysSince = getDaysSince(ct.last_contacted);
              const needsFollowUp = daysSince === -1 || daysSince >= 14;
              return (
              <tr key={ct.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
                      {ct.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-zinc-900">{ct.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500">{ct.title || <span className="text-zinc-300">—</span>}</td>
                <td className="px-4 py-3 text-zinc-500">{ct.company_name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {ct.email && (
                      <a href={`mailto:${ct.email}`} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 transition-colors" title={ct.email}>
                        <Mail className="w-3.5 h-3.5" /> {ct.email}
                      </a>
                    )}
                    {ct.phone && (
                      <a href={`tel:${ct.phone}`} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 transition-colors" title={ct.phone}>
                        <Phone className="w-3.5 h-3.5" /> {ct.phone}
                      </a>
                    )}
                    {!ct.email && !ct.phone && <span className="text-zinc-300 text-xs">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {ct.linkedin_url ? (
                    <a href={ct.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                      <Linkedin className="w-3.5 h-3.5" /> Profile
                    </a>
                  ) : <span className="text-zinc-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {needsFollowUp ? (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {daysSince === -1 ? 'Never contacted' : `${daysSince}d ago`}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">{daysSince}d ago</span>
                    )}
                    <button onClick={() => onMarkContacted(ct.id)}
                      className="text-xs text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      Mark today
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  {ct.notes ? (
                    <p className="text-xs text-zinc-500 truncate" title={ct.notes}>{ct.notes}</p>
                  ) : <span className="text-zinc-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onDelete(ct.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
        {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ── Pipeline Stats Bar ──────────────────────────────────────────────────────

function PipelineBar({ jobs }) {
  const counts = {};
  STATUSES.forEach(s => counts[s] = 0);
  jobs.forEach(j => { counts[j.status] = (counts[j.status] || 0) + 1; });

  return (
    <div className="grid grid-cols-5 gap-3">
      {STATUSES.map((s) => {
        const cfg = STATUS_CONFIG[s];
        return (
          <div key={s} className="bg-white rounded-xl border border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{cfg.label}</p>
            </div>
            <p className="text-2xl font-semibold">{counts[s]}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Kanban Board ────────────────────────────────────────────────────────────

function KanbanBoard({ jobs, onStatusChange, onDelete }) {
  const columns = {};
  STATUSES.forEach(s => columns[s] = []);
  jobs.forEach(j => {
    if (columns[j.status]) columns[j.status].push(j);
  });

  return (
    <div className="grid grid-cols-5 gap-4 min-h-[400px]">
      {STATUSES.map((status) => {
        const cfg = STATUS_CONFIG[status];
        const items = columns[status];
        return (
          <div key={status} className="flex flex-col">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className="text-sm font-semibold text-zinc-700">{cfg.label}</span>
              <span className="text-xs text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">{items.length}</span>
            </div>
            {/* Cards */}
            <div className="flex-1 space-y-2">
              {items.map((job) => (
                <KanbanCard key={job.id} job={job} status={status} onStatusChange={onStatusChange} onDelete={onDelete} />
              ))}
              {items.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-zinc-200 flex items-center justify-center py-8 text-xs text-zinc-400">
                  No jobs
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ job, status, onStatusChange, onDelete }) {
  const [showMove, setShowMove] = useState(false);
  const nextStatuses = STATUSES.filter(s => s !== status);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-3 hover:shadow-md transition-shadow group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 truncate">{job.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{job.company_name}</p>
        </div>
        {job.job_url && (
          <a href={job.job_url} target="_blank" rel="noopener noreferrer"
            className="text-zinc-300 hover:text-blue-600 transition-colors shrink-0">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {job.location && (
          <span className="flex items-center gap-0.5 text-xs text-zinc-400">
            <MapPin className="w-3 h-3" /> {job.location}
          </span>
        )}
        <Badge type={job.role_type} />
      </div>

      {job.notes && (
        <p className="text-xs text-zinc-400 mt-2 line-clamp-2 italic" title={job.notes}>{job.notes}</p>
      )}

      {/* Move & Delete actions */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100">
        <div className="relative">
          <button onClick={() => setShowMove(!showMove)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 transition-colors font-medium">
            <ArrowRight className="w-3 h-3" /> Move
          </button>
          {showMove && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMove(false)} />
              <div className="absolute bottom-full left-0 mb-1 z-40 bg-white rounded-lg border border-zinc-200 shadow-lg py-1 w-36">
                {nextStatuses.map(s => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button key={s} onClick={() => { onStatusChange(job.id, s); setShowMove(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <button onClick={() => onDelete(job.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Analytics Dashboard ─────────────────────────────────────────────────────

function AnalyticsDashboard({ analytics }) {
  if (!analytics) return <div className="text-center py-12 text-zinc-400">Loading analytics…</div>;

  const { funnel, by_company, by_role, stale_jobs, stale_contacts, pipeline } = analytics;
  const total = funnel.saved || 0;

  return (
    <div className="space-y-6">
      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" /> Conversion Funnel
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Total Tracked', value: funnel.saved, pct: 100 },
            { label: 'Applied', value: funnel.applied, pct: total > 0 ? (funnel.applied / total * 100) : 0 },
            { label: 'Interviewing', value: funnel.interviewing, pct: total > 0 ? (funnel.interviewing / total * 100) : 0 },
            { label: 'Offers', value: funnel.offers, pct: total > 0 ? (funnel.offers / total * 100) : 0 },
          ].map((step, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-zinc-600">{step.label}</span>
                <span className="font-medium">{step.value} <span className="text-zinc-400 font-normal">({step.pct.toFixed(0)}%)</span></span>
              </div>
              <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(step.pct, step.value > 0 ? 2 : 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-zinc-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{funnel.conversion_rate}%</p>
            <p className="text-xs text-zinc-500">Apply Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-500">{funnel.interview_rate}%</p>
            <p className="text-xs text-zinc-500">Interview Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{funnel.offer_rate}%</p>
            <p className="text-xs text-zinc-500">Offer Rate</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By Company */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> By Company
          </h3>
          {by_company.length === 0 ? (
            <p className="text-sm text-zinc-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {by_company.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 truncate flex-1">{c.name}</span>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    {c.offers > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 rounded">{c.offers} offer</span>}
                    {c.interviewing > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded">{c.interviewing} int.</span>}
                    {c.applied > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">{c.applied} app.</span>}
                    <span className="text-xs text-zinc-400 w-8 text-right">{c.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Role Type */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" /> By Role Type
          </h3>
          {by_role.length === 0 ? (
            <p className="text-sm text-zinc-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {by_role.map((r) => {
                const pct = total > 0 ? (r.total / total * 100) : 0;
                return (
                  <div key={r.role_type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <Badge type={r.role_type} />
                      <span className="text-zinc-600">{r.total} jobs <span className="text-zinc-400">({r.active} active)</span></span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stale Jobs */}
      {stale_jobs.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Needs Attention — Saved but not applied
          </h3>
          <div className="space-y-2">
            {stale_jobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-900">{j.title} <span className="text-amber-600">at {j.company_name}</span></span>
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {j.days_stale} days ago
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stale Contacts */}
      {(stale_contacts || []).length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Follow Up — Contacts needing outreach
          </h3>
          <div className="space-y-2">
            {stale_contacts.map((ct) => (
              <div key={ct.id} className="flex items-center justify-between text-sm">
                <span className="text-blue-900">{ct.name} {ct.title && <span className="text-blue-600">({ct.title})</span>} <span className="text-blue-500">at {ct.company_name}</span></span>
                <span className="text-xs text-blue-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {ct.days_since_contact === -1 ? 'Never contacted' : `${ct.days_since_contact}d since last contact`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Jobs Table (updated with status) ────────────────────────────────────────

function JobsTable({ jobs, onStatusChange, onDelete }) {
  const [openDropdown, setOpenDropdown] = useState(null);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Company</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Location</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Salary</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Date</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{job.title}</span>
                    {job.job_url && (
                      <a href={job.job_url} target="_blank" rel="noopener noreferrer"
                        className="text-zinc-300 hover:text-blue-600 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500">{job.company_name}</td>
                <td className="px-4 py-3">
                  {job.location ? (
                    <span className="flex items-center gap-1 text-zinc-500">
                      <MapPin className="w-3 h-3" /> {job.location}
                    </span>
                  ) : <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-4 py-3"><Badge type={job.role_type} /></td>
                <td className="px-4 py-3 relative">
                  <StatusBadge status={job.status} onClick={() => setOpenDropdown(openDropdown === job.id ? null : job.id)} />
                  {openDropdown === job.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setOpenDropdown(null)} />
                      <StatusDropdown currentStatus={job.status}
                        onSelect={(s) => onStatusChange(job.id, s)}
                        onClose={() => setOpenDropdown(null)} />
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                  {job.salary_range || <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {job.date_posted || job.date_added?.split('T')[0] || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onDelete(job.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
        Showing {jobs.length} jobs
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCompany, setFilterCompany] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactCompanyFilter, setContactCompanyFilter] = useState('');

  // Modals
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  // Active tab
  const [tab, setTab] = useState('pipeline');
  // Jobs sub-view
  const [jobsView, setJobsView] = useState('table');

  const fetchData = useCallback(async () => {
    try {
      const [c, j, ct, a] = await Promise.all([
        api.getCompanies(), api.getJobs(), api.getContacts(), api.getAnalytics()
      ]);
      setCompanies(c);
      setJobs(j);
      setContacts(ct);
      setAnalytics(a);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredJobs = jobs.filter((j) => {
    if (filterCompany && j.company_id !== Number(filterCompany)) return false;
    if (filterRole && j.role_type !== filterRole) return false;
    if (filterStatus && j.status !== filterStatus) return false;
    if (filterLocation && !j.location?.toLowerCase().includes(filterLocation.toLowerCase())) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return j.title.toLowerCase().includes(q) || j.company_name.toLowerCase().includes(q);
    }
    return true;
  });

  const hasActiveFilters = filterCompany || filterRole || filterLocation || filterStatus || searchQuery;
  const clearFilters = () => { setFilterCompany(''); setFilterRole(''); setFilterLocation(''); setFilterStatus(''); setSearchQuery(''); };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await api.updateJobStatus(jobId, newStatus);
      fetchData();
    } catch (e) { console.error('Status update failed:', e); }
  };

  const handleDeleteJob = async (id) => {
    if (!confirm('Delete this job listing?')) return;
    await api.deleteJob(id);
    fetchData();
  };

  const handleDeleteCompany = async (id) => {
    const company = companies.find(c => c.id === id);
    if (!confirm(`Delete "${company?.name}" and all its job listings?`)) return;
    await api.deleteCompany(id);
    fetchData();
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await api.deleteContact(id);
    fetchData();
  };

  const handleMarkContacted = async (id) => {
    try {
      await api.updateContact(id, { last_contacted: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (e) { console.error('Failed to mark contacted:', e); }
  };

  const filteredContacts = contacts.filter((ct) => {
    if (contactCompanyFilter && ct.company_id !== Number(contactCompanyFilter)) return false;
    if (contactSearch) {
      const q = contactSearch.toLowerCase();
      return ct.name.toLowerCase().includes(q) || ct.title?.toLowerCase().includes(q) || ct.company_name.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-base">JobTracker</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost" onClick={() => setShowAddCompany(true)}>
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Company</span>
              </button>
              <button className="btn-ghost" onClick={() => setShowAddContact(true)}>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Contact</span>
              </button>
              <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowAddJob(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Job
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Pipeline Summary ────────────────────────────────────────── */}
        <PipelineBar jobs={jobs} />

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-zinc-200">
          {[
            { key: 'pipeline', label: 'Pipeline', icon: LayoutGrid },
            { key: 'jobs', label: `All Jobs (${jobs.length})`, icon: List },
            { key: 'analytics', label: 'Analytics', icon: BarChart3 },
            { key: 'contacts', label: `Contacts (${contacts.length})`, icon: Users },
            { key: 'companies', label: `Companies (${companies.length})`, icon: Building2 },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* ── Pipeline Tab (Kanban) ───────────────────────────────────── */}
        {tab === 'pipeline' && (
          jobs.length === 0 ? (
            <EmptyState icon={LayoutGrid} title="Your pipeline is empty"
              subtitle="Add job opportunities and track them through your application process"
              action={<button className="btn-primary flex items-center gap-1.5" onClick={() => setShowAddJob(true)}><Plus className="w-3.5 h-3.5" /> Add Job</button>} />
          ) : (
            <KanbanBoard jobs={jobs} onStatusChange={handleStatusChange} onDelete={handleDeleteJob} />
          )
        )}

        {/* ── Jobs Tab ────────────────────────────────────────────────── */}
        {tab === 'jobs' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input className="input-field pl-9" placeholder="Search jobs or companies…"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="relative">
                  <select className="select-field pr-8" value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                    <option value="">All Companies</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select className="select-field pr-8" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                    <option value="">All Types</option>
                    {ROLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select className="select-field pr-8" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </div>
                <input className="select-field w-40" placeholder="Filter location…"
                  value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="btn-ghost text-red-500 hover:bg-red-50">
                    <span className="flex items-center gap-1"><X className="w-3.5 h-3.5" /> Clear</span>
                  </button>
                )}
              </div>
            </div>

            {filteredJobs.length === 0 ? (
              <EmptyState icon={Briefcase}
                title={hasActiveFilters ? 'No matching jobs' : 'No jobs yet'}
                subtitle={hasActiveFilters ? 'Try adjusting your filters' : 'Add your first job opportunity to get started'}
                action={!hasActiveFilters && (
                  <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowAddJob(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Job
                  </button>
                )} />
            ) : (
              <JobsTable jobs={filteredJobs} onStatusChange={handleStatusChange} onDelete={handleDeleteJob} />
            )}
          </>
        )}

        {/* ── Analytics Tab ───────────────────────────────────────────── */}
        {tab === 'analytics' && (
          jobs.length === 0 ? (
            <EmptyState icon={BarChart3} title="No data yet"
              subtitle="Add some job opportunities to see your analytics dashboard"
              action={<button className="btn-primary flex items-center gap-1.5" onClick={() => setShowAddJob(true)}><Plus className="w-3.5 h-3.5" /> Add Job</button>} />
          ) : (
            <AnalyticsDashboard analytics={analytics} />
          )
        )}

        {/* ── Contacts Tab ────────────────────────────────────────────── */}
        {tab === 'contacts' && (
          <>
            {/* Contact Filters */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input className="input-field pl-9" placeholder="Search contacts by name, title, or company…"
                    value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
                </div>
                <div className="relative">
                  <select className="select-field pr-8" value={contactCompanyFilter} onChange={(e) => setContactCompanyFilter(e.target.value)}>
                    <option value="">All Companies</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </div>
                <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowAddContact(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Contact
                </button>
              </div>
            </div>

            {filteredContacts.length === 0 ? (
              <EmptyState icon={Users}
                title={contactSearch || contactCompanyFilter ? 'No matching contacts' : 'No contacts yet'}
                subtitle={contactSearch || contactCompanyFilter ? 'Try adjusting your filters' : 'Add hiring managers and key people at your target companies'}
                action={!contactSearch && !contactCompanyFilter && (
                  <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowAddContact(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Contact
                  </button>
                )} />
            ) : (
              <ContactsTable contacts={filteredContacts} onDelete={handleDeleteContact} onMarkContacted={handleMarkContacted} />
            )}
          </>
        )}

        {/* ── Companies Tab ───────────────────────────────────────────── */}
        {tab === 'companies' && (
          companies.length === 0 ? (
            <EmptyState icon={Building2} title="No companies yet"
              subtitle="Add companies to start tracking their job opportunities"
              action={<button className="btn-primary flex items-center gap-1.5" onClick={() => setShowAddCompany(true)}><Plus className="w-3.5 h-3.5" /> Add Company</button>} />
          ) : (
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Career Page</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Jobs</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Added</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        {c.career_page_url ? (
                          <a href={c.career_page_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                            <ExternalLink className="w-3 h-3" /> Visit
                          </a>
                        ) : <span className="text-zinc-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-zinc-100 text-xs font-medium">
                          {c.job_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{c.created_at?.split('T')[0]}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteCompany(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AddCompanyModal open={showAddCompany} onClose={() => setShowAddCompany(false)} onCreated={fetchData} />
      <AddJobModal open={showAddJob} onClose={() => setShowAddJob(false)} onCreated={fetchData} companies={companies} />
      <AddContactModal open={showAddContact} onClose={() => setShowAddContact(false)} onCreated={fetchData} companies={companies} />
    </div>
  );
}
