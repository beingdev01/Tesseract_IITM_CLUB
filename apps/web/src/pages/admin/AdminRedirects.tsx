import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  Pin,
  Plus,
  QrCode,
  Search,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import type { Redirect, RedirectInput } from '@/lib/api';
import { formatDateTime } from '@/lib/dateUtils';

// Slugs that are also pinned in render.yaml for an instant server-side 302 and are
// re-seeded on boot (see apps/api/src/utils/redirectDefaults.ts). The DB rows are a
// managed mirror — editing their destination here does NOT change the static tier
// (that requires a render.yaml edit + redeploy), and they cannot be deleted from
// this UI. Keep this set in sync with redirectDefaults.ts + render.yaml.
const PINNED_SLUGS = new Set(['escape_room_prelims', 'hustlepreneurs']);

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://tesseractiitm.in';
const ORIGIN_HOST = ORIGIN.replace(/^https?:\/\//, '');

const shortUrl = (slug: string) => `${ORIGIN}/${slug}`;

interface FormState {
  slug: string;
  destinationUrl: string;
  note: string;
  enabled: boolean;
}

const EMPTY_FORM: FormState = { slug: '', destinationUrl: '', note: '', enabled: true };

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');
}

function validateDestination(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AdminRedirects() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Redirect | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Redirect | null>(null);
  const [qrTarget, setQrTarget] = useState<Redirect | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const redirectsQuery = useQuery({
    queryKey: ['redirects'],
    queryFn: () => api.getRedirects(token!),
    enabled: Boolean(token),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['redirects'] });

  const createMutation = useMutation({
    mutationFn: (data: RedirectInput) => api.createRedirect(data, token!),
    onSuccess: () => {
      toast.success('Redirect created');
      invalidate();
      setFormOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to create redirect'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RedirectInput> }) =>
      api.updateRedirect(id, data, token!),
    // Optimistically apply so toggles/edits feel instant; roll back on error.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['redirects'] });
      const previous = queryClient.getQueryData<Redirect[]>(['redirects']);
      if (previous) {
        queryClient.setQueryData<Redirect[]>(
          ['redirects'],
          previous.map((r) => (r.id === id ? { ...r, ...data } : r)),
        );
      }
      return { previous };
    },
    onError: (e: unknown, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['redirects'], ctx.previous);
      toast.error(e instanceof Error ? e.message : 'Failed to update redirect');
    },
    onSettled: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRedirect(id, token!),
    onSuccess: () => {
      toast.success('Redirect deleted');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete redirect'),
  });

  const redirects = useMemo(() => redirectsQuery.data ?? [], [redirectsQuery.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return redirects;
    return redirects.filter(
      (r) =>
        r.slug.toLowerCase().includes(q) ||
        r.destinationUrl.toLowerCase().includes(q) ||
        (r.note ?? '').toLowerCase().includes(q),
    );
  }, [redirects, search]);

  const totalHits = useMemo(() => redirects.reduce((sum, r) => sum + r.hits, 0), [redirects]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(r: Redirect) {
    setEditing(r);
    setForm({ slug: r.slug, destinationUrl: r.destinationUrl, note: r.note ?? '', enabled: r.enabled });
    setFormOpen(true);
  }

  function submitForm() {
    const slug = normalizeSlug(form.slug);
    const destinationUrl = form.destinationUrl.trim();

    if (!SLUG_RE.test(slug)) {
      toast.error('Slug may only contain lowercase letters, numbers, hyphens and underscores');
      return;
    }
    if (!validateDestination(destinationUrl)) {
      toast.error('Destination must be a valid http:// or https:// URL');
      return;
    }

    const payload: RedirectInput = {
      slug,
      destinationUrl,
      note: form.note.trim() || null,
      enabled: form.enabled,
    };

    if (editing) {
      updateMutation.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Redirect updated');
            setFormOpen(false);
          },
        },
      );
    } else {
      createMutation.mutate(payload);
    }
  }

  function toggleEnabled(r: Redirect) {
    updateMutation.mutate({ id: r.id, data: { enabled: !r.enabled } });
  }

  async function copyLink(r: Redirect) {
    try {
      await navigator.clipboard.writeText(shortUrl(r.slug));
      setCopiedId(r.id);
      window.setTimeout(() => setCopiedId((id) => (id === r.id ? null : id)), 1500);
      toast.success('Short link copied');
    } catch {
      toast.error('Could not copy link');
    }
  }

  function downloadQr(slug: string) {
    const canvas = qrWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `redirect-${slug}.png`;
    link.click();
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
            <Link2 className="h-6 w-6 text-amber-500 dark:text-red-500" />
            Redirects
          </h1>
          <p className="text-sm text-fg-mute mt-1">
            Manage short links like <span className="font-mono">{ORIGIN_HOST}/your-slug</span> → any URL. Changes are live immediately, no redeploy.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> New redirect
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total links</CardDescription>
            <CardTitle className="text-2xl">{redirects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl">{redirects.filter((r) => r.enabled).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Total clicks
            </CardDescription>
            <CardTitle className="text-2xl">{totalHits.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-mute" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search slug, URL, or note…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {redirectsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-fg-mute">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading redirects…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-fg-mute">
              {redirects.length === 0 ? 'No redirects yet. Create your first short link.' : 'No redirects match your search.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge-default text-left text-xs uppercase tracking-wide text-fg-mute">
                    <th className="px-4 py-3 font-medium">Short link</th>
                    <th className="px-4 py-3 font-medium">Destination</th>
                    <th className="px-4 py-3 font-medium">On</th>
                    <th className="px-4 py-3 font-medium">Clicks</th>
                    <th className="px-4 py-3 font-medium">Last used</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-edge-subtle last:border-0 hover:bg-surface-2/50">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-fg-mute">{ORIGIN_HOST}/</span>
                          <span className="text-fg font-medium">{r.slug}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {PINNED_SLUGS.has(r.slug) && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-[10px]"
                              title="Also pinned in render.yaml for an instant server-side redirect. Edit render.yaml to change the static tier."
                            >
                              <Pin className="h-3 w-3" /> static
                            </Badge>
                          )}
                          {r.note && <span className="text-xs text-fg-mute">{r.note}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top max-w-xs">
                        <a
                          href={r.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 hover:underline dark:text-red-400 break-all inline-flex items-start gap-1"
                        >
                          <span className="break-all">{r.destinationUrl}</span>
                          <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Switch
                          checked={r.enabled}
                          onCheckedChange={() => toggleEnabled(r)}
                          aria-label={r.enabled ? `Disable ${r.slug}` : `Enable ${r.slug}`}
                        />
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums text-fg">{r.hits.toLocaleString()}</td>
                      <td className="px-4 py-3 align-top text-fg-mute whitespace-nowrap">
                        {r.lastUsedAt ? formatDateTime(r.lastUsedAt) : '—'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy short link" aria-label={`Copy short link for ${r.slug}`} onClick={() => copyLink(r)}>
                            {copiedId === r.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Open / test" aria-label={`Open ${r.slug}`} onClick={() => window.open(shortUrl(r.slug), '_blank', 'noopener')}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="QR code" aria-label={`QR code for ${r.slug}`} onClick={() => setQrTarget(r)}>
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" aria-label={`Edit ${r.slug}`} onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {PINNED_SLUGS.has(r.slug) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-40 cursor-not-allowed"
                              title="Pinned in render.yaml — remove it there instead of deleting"
                              aria-label={`${r.slug} is pinned and cannot be deleted here`}
                              disabled
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" title="Delete" aria-label={`Delete ${r.slug}`} onClick={() => setDeleteTarget(r)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit redirect' : 'New redirect'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update where this short link points.' : 'Create a short link that redirects to any URL.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Short link</Label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-fg-mute whitespace-nowrap">{ORIGIN_HOST}/</span>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="my-event"
                  autoFocus
                />
              </div>
              <p className="text-xs text-fg-mute">Lowercase letters, numbers, hyphens and underscores only.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination">Destination URL</Label>
              <Input
                id="destination"
                value={form.destinationUrl}
                onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))}
                placeholder="https://example.com/page"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="What is this link for?"
                rows={2}
                maxLength={280}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch id="enabled" checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
              <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
            </div>

            {editing && PINNED_SLUGS.has(editing.slug) && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                <Pin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                This slug is also pinned in render.yaml for an instant redirect. Editing here updates the in-app behavior only — change render.yaml + redeploy to update the static tier.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog open={Boolean(qrTarget)} onOpenChange={(open) => !open && setQrTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR code</DialogTitle>
            <DialogDescription className="font-mono break-all">
              {qrTarget ? shortUrl(qrTarget.slug) : ''}
            </DialogDescription>
          </DialogHeader>
          {qrTarget && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div ref={qrWrapRef} className="rounded-lg bg-white p-4">
                <QRCodeCanvas value={shortUrl(qrTarget.slug)} size={220} level="M" marginSize={4} />
              </div>
              <Button variant="outline" onClick={() => downloadQr(qrTarget.slug)}>
                Download PNG
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete redirect?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-mono">{ORIGIN_HOST}/{deleteTarget.slug}</span> will stop redirecting. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
