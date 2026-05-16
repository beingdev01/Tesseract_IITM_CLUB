import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
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
  CoreRole,
  HiringApplication,
  HiringApplicationStatus,
  HiringApplicationType,
  HiringStats,
} from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import {
  CORE_ROLE_LABEL,
  CORE_ROLE_OPTIONS,
  HOUSE_LABEL,
} from '@/pages/join/_shared';

const PAGE_SIZE = 20;

const TYPE_TABS: Array<{ value: HiringApplicationType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'MEMBER', label: 'Members' },
  { value: 'CORE', label: 'Core Applications' },
];

const STATUS_OPTIONS: Array<{ value: HiringApplicationStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'INTERVIEW_SCHEDULED', label: 'Interview scheduled' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'REJECTED', label: 'Rejected' },
];

const ROLE_FILTER_OPTIONS: Array<{ value: CoreRole | ''; label: string }> = [
  { value: '', label: 'All roles' },
  ...CORE_ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label })),
];

const STATUS_BADGE: Record<HiringApplicationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: typeof Clock }> = {
  PENDING: { variant: 'secondary', label: 'Pending', icon: Clock },
  INTERVIEW_SCHEDULED: { variant: 'outline', label: 'Interview scheduled', icon: CalendarClock },
  SELECTED: { variant: 'default', label: 'Selected', icon: CheckCircle2 },
  REJECTED: { variant: 'destructive', label: 'Rejected', icon: XCircle },
};

const selectStyles = 'h-10 rounded-md border border-edge-default bg-surface-1 px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ring focus:border-edge-strong';

const formatRoles = (roles: CoreRole[] | undefined): string =>
  !roles || roles.length === 0 ? '—' : roles.map((r) => CORE_ROLE_LABEL[r] ?? r).join(' / ');

export default function AdminHiring() {
  const { token } = useAuth();

  const [applications, setApplications] = useState<HiringApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<HiringStats | null>(null);

  const [typeFilter, setTypeFilter] = useState<HiringApplicationType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<HiringApplicationStatus | ''>('');
  const [roleFilter, setRoleFilter] = useState<CoreRole | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<HiringApplication | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [savingAction, setSavingAction] = useState<HiringApplicationStatus | null>(null);
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
          type: typeFilter,
          role: typeFilter === 'CORE' ? (roleFilter || undefined) : undefined,
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
  }, [token, statusFilter, typeFilter, roleFilter, search, page]);

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

  useEffect(() => { setPage(1); }, [statusFilter, typeFilter, roleFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openApplication = async (app: HiringApplication) => {
    if (!token) return;
    setSelected(app);
    setSelectedLoading(true);
    try {
      const full = await api.getHiringApplication(app.id, token);
      setSelected(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setSelectedLoading(false);
    }
  };

  const handleStatusAction = async (nextStatus: HiringApplicationStatus) => {
    if (!selected || !token || selected.status === nextStatus) return;
    setSavingAction(nextStatus);
    try {
      const result = await api.updateHiringStatus(selected.id, nextStatus, token);
      toast.success(result.message ?? `Marked ${STATUS_BADGE[nextStatus].label}`);
      setSelected({ ...selected, status: nextStatus });
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingAction(null);
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
        {
          status: statusFilter || undefined,
          type: typeFilter,
          role: typeFilter === 'CORE' ? (roleFilter || undefined) : undefined,
        },
        token,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tesseract_join_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    const byStatus = stats?.byStatus ?? {};
    const byType = stats?.byType ?? {};
    return [
      { label: 'Total', value: stats?.total ?? 0, tone: 'border-edge-default text-fg' },
      { label: 'Members', value: byType.MEMBER ?? 0, tone: 'border-edge-default text-fg-dim' },
      { label: 'Core (Pending)', value: byStatus.PENDING ?? 0, tone: 'border-edge-default text-fg-dim' },
      { label: 'Selected', value: byStatus.SELECTED ?? 0, tone: 'border-success/40 text-success' },
    ];
  }, [stats]);

  return (
    <div className="space-y-6 text-fg">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-fg">Join Tesseract</h1>
          <p className="text-fg-mute">Triage Member and Core Team applications, update statuses, export rosters.</p>
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
          {/* Type tabs */}
          <div className="inline-flex p-1 rounded-md border border-edge-default bg-surface-2 mb-4">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  typeFilter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-fg-dim hover:text-fg dark:hover:text-fg'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-mute" />
              <Input
                placeholder="Search name, email, phone"
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
            {typeFilter === 'CORE' && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as CoreRole | '')}
                className={selectStyles}
              >
                {ROLE_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
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
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Type</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Email</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Role / Region</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">House · Level</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Status</th>
                    <th className="py-2 pr-3 font-semibold text-fg-dim">Submitted</th>
                    <th className="py-2 font-semibold text-fg-dim text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const badge = STATUS_BADGE[app.status];
                    const StatusIcon = badge.icon;
                    return (
                      <tr key={app.id} className="border-b border-edge-subtle hover:bg-surface-hover/50 align-top">
                        <td className="py-2 pr-3 max-w-[200px]">
                          <button
                            type="button"
                            onClick={() => openApplication(app)}
                            className="text-left font-medium text-fg hover:text-primary hover:underline truncate block w-full"
                            title={app.name}
                          >
                            {app.name}
                          </button>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={app.applicationType === 'CORE' ? 'default' : 'secondary'}>
                            {app.applicationType}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-fg-dim truncate max-w-[220px]">{app.email}</td>
                        <td className="py-2 pr-3 text-fg-dim text-xs">
                          {app.applicationType === 'CORE'
                            ? formatRoles(app.rolesApplied)
                            : (app.region ? `Region: ${app.region}` : '—')}
                        </td>
                        <td className="py-2 pr-3 text-fg-dim text-xs">
                          <span className="block">{HOUSE_LABEL[app.house] ?? app.house}</span>
                          <span className="text-fg-mute">{app.bsLevel}</span>
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
            className="relative h-full w-full max-w-xl bg-surface-1 border-l border-edge-default shadow-2xl pointer-events-auto overflow-y-auto text-fg"
          >
            <div className="sticky top-0 bg-surface-1 border-b border-edge-default px-5 py-4 flex items-start justify-between gap-3 z-10">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-primary mb-1">
                  {selected.applicationType === 'CORE' ? 'Core Application' : 'Member'}
                </p>
                <h2 className="text-lg font-bold text-fg leading-tight break-words">{selected.name}</h2>
                <p className="text-xs text-fg-mute mt-0.5 break-all">{selected.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close" className="shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {selectedLoading ? (
              <div className="p-6 flex items-center text-fg-mute">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : (
              <div className="px-5 py-5 space-y-5">
                <section>
                  <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Contact</h3>
                  <div className="space-y-1.5 text-sm text-fg-dim">
                    <p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 text-fg-mute shrink-0" /> <span className="min-w-0">{selected.email}</span></p>
                    {selected.phone && (
                      <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-fg-mute shrink-0" /> {selected.phone}</p>
                    )}
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-1">House</h3>
                    <p className="text-sm text-fg-dim">{HOUSE_LABEL[selected.house] ?? selected.house}</p>
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-1">BS Level</h3>
                    <p className="text-sm text-fg-dim">{selected.bsLevel}</p>
                  </div>
                </section>

                {selected.applicationType === 'MEMBER' ? (
                  <MemberDetails app={selected} />
                ) : (
                  <CoreDetails app={selected} />
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

                {selected.applicationType === 'MEMBER' ? (
                  <div className="border-t border-edge-default pt-4">
                    <div className="rounded border border-edge-default bg-surface-2 px-3 py-3 text-sm text-fg-dim">
                      Joined as Member — no review workflow. Delete the entry below if you need to remove them.
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmDelete(selected)}
                      className="mt-3 w-full text-error hover:bg-error-bg border-error/40"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete entry
                    </Button>
                  </div>
                ) : (
                  <div className="border-t border-edge-default pt-4 space-y-3">
                    <p className="text-xs uppercase tracking-wide text-fg-mute">Admin actions</p>
                    <div className="grid grid-cols-1 gap-2">
                      <ActionButton
                        label="Schedule Interview"
                        icon={CalendarClock}
                        active={selected.status === 'INTERVIEW_SCHEDULED'}
                        loading={savingAction === 'INTERVIEW_SCHEDULED'}
                        onClick={() => handleStatusAction('INTERVIEW_SCHEDULED')}
                        tone="outline"
                      />
                      <ActionButton
                        label="Select"
                        icon={CheckCircle2}
                        active={selected.status === 'SELECTED'}
                        loading={savingAction === 'SELECTED'}
                        onClick={() => handleStatusAction('SELECTED')}
                        tone="default"
                      />
                      <ActionButton
                        label="Reject"
                        icon={XCircle}
                        active={selected.status === 'REJECTED'}
                        loading={savingAction === 'REJECTED'}
                        onClick={() => handleStatusAction('REJECTED')}
                        tone="destructive"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmDelete(selected)}
                      className="w-full text-error hover:bg-error-bg border-error/40"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete application
                    </Button>
                    <p className="text-[11px] text-fg-mute">
                      Interview / Select / Reject each fire an email to the applicant automatically.
                    </p>
                  </div>
                )}
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
                  This permanently removes {confirmDelete.name}'s {confirmDelete.applicationType.toLowerCase()} entry. The applicant will not be notified.
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

// ── Subsections for detail panel ──────────────────────────────────────────

function MemberDetails({ app }: { app: HiringApplication }) {
  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-1">Gender</h3>
          <p className="text-sm text-fg-dim">{app.gender ?? '—'}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-1">Region</h3>
          <p className="text-sm text-fg-dim">{app.region ?? '—'}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-1">Wants Core?</h3>
          <p className="text-sm text-fg-dim">{app.coreInterest ?? '—'}</p>
        </div>
      </section>
      {app.crazyIdeas && (
        <section>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Crazy ideas</h3>
          <p className="text-sm text-fg-dim whitespace-pre-wrap break-words">{app.crazyIdeas}</p>
        </section>
      )}
    </>
  );
}

function CoreDetails({ app }: { app: HiringApplication }) {
  return (
    <>
      <section>
        <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Roles applied for</h3>
        <div className="flex flex-wrap gap-1.5">
          {app.rolesApplied.length === 0 ? (
            <span className="text-sm text-fg-mute">—</span>
          ) : (
            app.rolesApplied.map((r) => (
              <Badge key={r} variant="outline" className="font-normal">{CORE_ROLE_LABEL[r] ?? r}</Badge>
            ))
          )}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-1">Weekly commitment</h3>
          <p className="text-sm text-fg-dim">{app.weeklyHours ?? '—'}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-1">Past experience</h3>
          <p className="text-sm text-fg-dim">{app.hasExperience ? 'Yes' : app.hasExperience === false ? 'No' : '—'}</p>
        </div>
      </section>
      {app.experienceDesc && (
        <section>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Experience details</h3>
          <p className="text-sm text-fg-dim whitespace-pre-wrap break-words">{app.experienceDesc}</p>
        </section>
      )}
      {app.resumeUrl && (
        <section>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Resume / LinkedIn</h3>
          <a
            href={app.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all"
          >
            <span className="truncate max-w-[20rem]">{app.resumeUrl}</span> <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </section>
      )}
      {app.crazyIdeas && (
        <section>
          <h3 className="text-xs uppercase tracking-wide text-fg-mute mb-2">Crazy ideas</h3>
          <p className="text-sm text-fg-dim whitespace-pre-wrap break-words">{app.crazyIdeas}</p>
        </section>
      )}
    </>
  );
}

function ActionButton({
  label,
  icon: Icon,
  active,
  loading,
  onClick,
  tone,
}: {
  label: string;
  icon: typeof Clock;
  active: boolean;
  loading: boolean;
  onClick: () => void;
  tone: 'default' | 'outline' | 'destructive';
}) {
  return (
    <Button
      variant={active ? tone : 'outline'}
      disabled={loading || active}
      onClick={onClick}
      className="justify-start gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {active ? `Current: ${label}` : label}
    </Button>
  );
}
