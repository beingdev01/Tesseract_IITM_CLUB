import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { api, type BrainTeaser, type BrainTeaserDifficulty } from '@/lib/api';
import { ContentEditor } from './ContentEditor';
import { ContentTable } from './ContentTable';
import { ConfirmDelete } from './ConfirmDelete';

const emptyForm = { prompt: '', answer: '', explanation: '', difficulty: 'EASY' as BrainTeaserDifficulty, active: true };

export default function BrainTeasersAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BrainTeaser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const listQuery = useQuery({ queryKey: ['admin-game-content', 'brain-teasers'], queryFn: () => api.getAdminBrainTeasers(token || ''), enabled: Boolean(token) });
  const dayQuery = useQuery({ queryKey: ['admin-game-content', 'brain-teasers-day'], queryFn: () => api.getAdminBrainTeasersToday(token || ''), enabled: Boolean(token) });
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'brain-teasers'] }); void queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'brain-teasers-day'] }); };
  const saveMutation = useMutation({
    mutationFn: () => token ? (editing ? api.updateBrainTeaser(editing.id, token, form) : api.createBrainTeaser(token, form)) : Promise.reject(new Error('Authentication required')),
    onSuccess: () => { toast.success(editing ? 'Teaser updated' : 'Teaser created'); setEditorOpen(false); setEditing(null); setForm(emptyForm); invalidate(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save teaser'),
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => token ? api.deleteBrainTeaser(id, token) : Promise.reject(new Error('Authentication required')), onSuccess: () => { toast.success('Teaser deleted'); setDeleteId(null); invalidate(); } });
  const regenMutation = useMutation({ mutationFn: () => token ? api.regenerateBrainTeasersToday(token) : Promise.reject(new Error('Authentication required')), onSuccess: () => { toast.success('Today set regenerated'); invalidate(); } });
  const openEditor = (row?: BrainTeaser) => { setEditing(row ?? null); setForm(row ? { prompt: row.prompt, answer: row.answer ?? '', explanation: row.explanation ?? '', difficulty: row.difficulty, active: row.active ?? true } : emptyForm); setEditorOpen(true); };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); saveMutation.mutate(); };
  return (
    <>
      <div className="space-y-4">
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Today&apos;s set</CardTitle><Button variant="outline" onClick={() => regenMutation.mutate()}>Regenerate</Button></CardHeader><CardContent className="space-y-2 text-sm">{(dayQuery.data?.day?.entries ?? []).map((entry) => <div key={entry.teaser.id} className="border rounded-md p-2"><Badge>{entry.difficulty}</Badge><span className="ml-2">{entry.teaser.prompt}</span></div>)}</CardContent></Card>
        <ContentTable
          title="Brain Teasers"
          rows={listQuery.data?.teasers ?? []}
          loading={listQuery.isLoading}
          rowKey={(row) => row.id}
          onCreate={() => openEditor()}
          columns={[
            { key: 'prompt', label: 'Prompt', render: (row) => <span className="line-clamp-2">{row.prompt}</span> },
            { key: 'difficulty', label: 'Difficulty', width: '120px', render: (row) => <Badge>{row.difficulty}</Badge> },
            { key: 'active', label: 'Active', width: '80px', render: (row) => <Switch checked={row.active ?? false} onCheckedChange={(active) => token && api.updateBrainTeaser(row.id, token, { active }).then(() => invalidate())} /> },
          ]}
          rowActions={(row) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openEditor(row)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button></div>}
        />
      </div>
      <ContentEditor open={editorOpen} title={editing ? 'Edit teaser' : 'Create teaser'} onClose={() => setEditorOpen(false)} onSubmit={submit} saving={saveMutation.isPending}>
        <div className="space-y-2"><Label>Prompt</Label><Textarea value={form.prompt} onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Answer</Label><Input value={form.answer} onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Explanation</Label><Textarea value={form.explanation} onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))} /></div>
        <div className="space-y-2"><Label>Difficulty</Label><Select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as BrainTeaserDifficulty }))}><option value="EASY">EASY</option><option value="NORMAL">NORMAL</option><option value="HARD">HARD</option><option value="DEVIOUS">DEVIOUS</option><option value="BONUS">BONUS</option></Select></div>
        <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} /></div>
      </ContentEditor>
      <ConfirmDelete open={Boolean(deleteId)} title="Delete teaser" description="This removes the teaser from future daily sets." onCancel={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
    </>
  );
}
