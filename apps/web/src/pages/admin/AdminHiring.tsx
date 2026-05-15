import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Mail,
  Phone,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type {
  HiringApplication,
  HiringApplicationStatus,
  HiringApplyingRole,
  HiringStats,
} from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: HiringApplicationStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'INTERVIEW_SCHEDULED', label: 'Interview scheduled' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'REJECTED', label: 'Rejected' },
];

const ROLE_OPTIONS: Array<{ value: HiringApplyingRole | ''; label: string }> = [
  { value: '', label: 'All roles' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'DSA_CHAMPS', label: 'DSA Champs' },
  { value: 'DESIGNING', label: 'Designing' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'MANAGEMENT', label: 'Management' },
];

const STATUS_BADGE: Record<HiringApplicationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: typeof Clock }> = {
  PENDING: { variant: 'secondary', label: 'Pending', icon: Clock },
  INTERVIEW_SCHEDULED: { variant: 'outline', label: 'Interview', icon: Mail },
  SELECTED: { variant: 'default', label: 'Selected', icon: CheckCircle2 },
  REJECTED: { variant: 'destructive', label: 'Rejected', icon: XCircle },
};

const ROLE_LABEL: Record<HiringApplyingRole, string> = {
  TECHNICAL: 'Technical',
  DSA_CHAMPS: 'DSA Champs',
  DESIGNING: 'Designing',
  SOCIAL_MEDIA: 'Social Media',
  MANAGEMENT: 'Management',
};

const selectStyles = 'h-10 rounded-md border border-edge-default bg-surface-1 px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ring focus:border-edge-strong';

export default function AdminHiring() {
  const { token } = useAuth();

  const [applications, setApplications] = useState<HiringApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<HiringStats | null>(null);

  const [statusFilter, setStatusFilter] = useState<HiringApplicationStatus | ''>('');
  const [roleFilter, setRoleFilter] = useState<HiringApplyingRole | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<HiringApplication | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [statusDraft, setStatusDraft] = useState<HiringApplicationStatus>('PENDING');
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<HiringApplication | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [exporting, setExporting] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHiringApplications(
        {
          status: statusFilter || undefined,
          role: roleFilter || undefined,
          search: search || undefined,
          page,
          limit: PAGE_SIZE,
        },
        token,
      );
      setApplications(data.applications);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, roleFilter, search, page]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getHiringStats(token);
      setStats(data);
    } catch {
      setStats(null);
    }
  }, [token]);

  useEffect(() => { void fetchApplications(); }, [fetchApplications]);
  useEffect(() => { void fetchStats(); }, [fetchStats]);

  useEffect(() => { setPage(1); }, [statusFilter, roleFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openApplication = async (app: HiringApplication) => {
    if (!token) return;
    setSelected(app);
    setStatusDraft(app.status);
    setSelectedLoading(true);
    try {
      const full = await api.getHiringApplication(app.id, token);
      setSelected(full);
      setStatusDraft(full.status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setSelectedLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selected || !token || statusDraft === selected.status) return;
    setSavingStatus(true);
    try {
      const result = await api.updateHiringStatus(selected.id, statusDraft, token);
      toast.success(result.message ?? 'Status updated');
      setSelected({ ...selected, status: statusDraft });
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || !token) return;
    setDeleting(true);
    try {
      await api.deleteHiringApplication(confirmDelete.id, token);
      toast.success('Application deleted');
      if (selected?.id === confirmDelete.id) setSelected(null);
      setConfirmDelete(null);
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete application');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const blob = await api.exportHiringApplications(
        { status: statusFilter || undefined, role: roleFilter || undefined },
        token,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hiring_applications_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Export ready');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const statCards = useMemo(() => {
    const totalStat = stats?.total ?? 0;
    const byStatus = stats?.byStatus ?? {};
    return [
      { label: 'Total', value: totalStat, tone: 'border-edge-default text-fg' },
      { label: 'Pending', value: byStatus.PENDING ?? 0, tone: 'border-edge-default text-fg-dim' },
      { label: 'Selected', value: byStatus.SELECTED ?? 0, tone: 'border-success/40 text-success' },
      { label: 'Rejected', value: byStatus.REJECTED ?? 0, tone: 'border-error/40 text-error-fg' },
    ];
  }, [stats]);

  return (
    <div className="space-y-6 text-fg">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-fg">Hiring</h1>
          <p className="text-fg-mute">Triage applications, update statuses, and export rosters.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="gap-2"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export filtered (.xlsx)
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} className={`bg-surface-1 ${card.tone}`}>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wide text-fg-mute">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-surface-1 border-edge-default">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-fg">
            <Users className="h-4 w-4 text-primary" />
            Applications
          </CardTitle>
          <CardDescription className="text-fg-mute">
            {total} application{total === 1 ? '' : 's'} matching filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-mute" />
              <Input
                placeholder="Search name, email, department"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as HiringApplicationStatus | '')}
              className={selectStyles}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as HiringApplyingRole | '')}
              className={selectStyles}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-error-fg bg-error-bg border border-error/40 px-3 py-2 mb-4 rounded">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-fg-mute">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading applications…
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-fg-mute text-sm">
              No applications match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-edge-default">
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Name</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Email</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Role</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Department · Year</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Status</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Applied</th>
                    <th className="py-2 font-semibold text-fg-dim text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const badge = STATUS_BADGE[app.status];
                    const StatusIcon = badge.icon;
                    return (
                      <tr key={app.id} className="border-b border-edge-subtle hover:bg-surface-hover/50">
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => openApplication(app)}
                            className="text-left font-medium text-fg hover:text-primary hover:underline"
                          >
                            {app.name}
                          </button>
                        </td>
                        <td className="py-2 pr-3 text-fg-dim truncate max-w-[220px]">{app.email}</td>
                        <td className="py-2 pr-3 text-fg-dim">{ROLE_LABEL[app.applyingRole]}</td>
                        <td className="py-2 pr-3 text-fg-dim">
                          <span className="block truncate max-w-[200px]">{app.department}</span>
                          <span className="text-xs text-fg-mute">{app.year}</span>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={badge.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-fg-mute text-xs whitespace-nowrap">{formatDate(app.createdAt)}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => openApplication(app)}>
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDelete(app)}
                            className="text-error hover:text-error hover:bg-error-bg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-fg-mute">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end pointer-events-none" aria-modal="true" role="dialog">
          <button
            type="button"
            aria-label="Close detail"
            className="absolute inset-0 bg-black/60 pointer-events-auto"
            onClick={() => setSelected(null)}
          />
          <motion.aside
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="relative h-full w-full max-w-md bg-surface-1 border-l border-edge-default shadow-2xl pointer-events-auto overflow-y-auto text-fg"
          >
            <div className="sticky top-0 bg-surface-1 border-b border-edge-default p-4 flex items-center justify-between z-10">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary">Application</p>
                <h2 className="text-lg font-bold text-fg">{selected.name}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {selectedLoading ? (
              <div className="p-6 flex items-center text-fg-mute">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <section>
                  <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Contact</h3>
                  <div className="space-y-1.5 text-sm text-fg-dim">
                    <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-fg-mute" /> {selected.email}</p>
                    {selected.phone && (
                      <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-fg-mute" /> {selected.phone}</p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Applying for</h3>
                  <Badge variant="outline">{ROLE_LABEL[selected.applyingRole]}</Badge>
                </section>

                <section>
                  <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Academic</h3>
                  <p className="text-sm text-fg-dim">{selected.department}</p>
                  <p className="text-xs text-fg-mute">{selected.year}</p>
                </section>

                {selected.skills && (
                  <section>
                    <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Skills / Motivation</h3>
                    <p className="text-sm text-fg-dim whitespace-pre-wrap">{selected.skills}</p>
                  </section>
                )}

                <section>
                  <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Submitted</h3>
                  <p className="text-sm text-fg-dim">{formatDate(selected.createdAt)}</p>
                </section>

                {selected.user && (
                  <section>
                    <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Linked account</h3>
                    <p className="text-sm text-fg-dim">{selected.user.name} <span className="text-fg-mute">({selected.user.email})</span></p>
                  </section>
                )}

                <div className="border-t border-edge-default pt-4 space-y-3">
                  <Label htmlFor="status-select" className="text-xs uppercase tracking-wide text-fg-mute">Update status</Label>
                  <select
                    id="status-select"
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as HiringApplicationStatus)}
                    className={`w-full ${selectStyles}`}
                  >
                    {STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveStatus}
                      disabled={savingStatus || statusDraft === selected.status}
                      className="flex-1"
                    >
                      {savingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmDelete(selected)}
                      className="text-error hover:bg-error-bg border-error/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-fg-mute">
                    SELECTED and REJECTED statuses email the applicant automatically.
                  </p>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? (
                <>
                  This permanently removes {confirmDelete.name}'s application. The applicant will not be notified.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
