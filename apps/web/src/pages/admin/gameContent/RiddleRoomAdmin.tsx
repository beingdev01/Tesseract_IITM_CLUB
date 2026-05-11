import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { api, type GameDifficulty, type RiddleBundle, type RiddleClue } from '@/lib/api';
import { ContentEditor } from './ContentEditor';
import { ContentTable } from './ContentTable';
import { ConfirmDelete } from './ConfirmDelete';

const emptyClue = { title: '', prompt: '', answer: '', hint: '', difficulty: 'EASY' as GameDifficulty, lockSeconds: 15, basePoints: 100, active: true };
const emptyBundle = { name: '', description: '', active: true, clueIds: '' };

export default function RiddleRoomAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('clues');
  const [clueEditorOpen, setClueEditorOpen] = useState(false);
  const [bundleEditorOpen, setBundleEditorOpen] = useState(false);
  const [editingClue, setEditingClue] = useState<RiddleClue | null>(null);
  const [editingBundle, setEditingBundle] = useState<RiddleBundle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'clue' | 'bundle'; id: string } | null>(null);
  const [clueForm, setClueForm] = useState(emptyClue);
  const [bundleForm, setBundleForm] = useState(emptyBundle);
  const cluesQuery = useQuery({ queryKey: ['admin-game-content', 'riddle-room', 'clues'], queryFn: () => api.getAdminRiddleClues(token || ''), enabled: Boolean(token) });
  const bundlesQuery = useQuery({ queryKey: ['admin-game-content', 'riddle-room', 'bundles'], queryFn: () => api.getAdminRiddleBundles(token || ''), enabled: Boolean(token) });
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'riddle-room'] }); };
  const saveClue = useMutation({
    mutationFn: () => token ? (editingClue ? api.updateRiddleClue(editingClue.id, token, clueForm) : api.createRiddleClue(token, clueForm)) : Promise.reject(new Error('Authentication required')),
    onSuccess: () => { toast.success(editingClue ? 'Clue updated' : 'Clue created'); setClueEditorOpen(false); setEditingClue(null); setClueForm(emptyClue); invalidate(); },
  });
  const saveBundle = useMutation({
    mutationFn: () => {
      if (!token) return Promise.reject(new Error('Authentication required'));
      const payload = { name: bundleForm.name, description: bundleForm.description, active: bundleForm.active, clueIds: bundleForm.clueIds.split('\n').map((id) => id.trim()).filter(Boolean) };
      return editingBundle ? api.updateRiddleBundle(editingBundle.id, token, payload) : api.createRiddleBundle(token, payload);
    },
    onSuccess: () => { toast.success(editingBundle ? 'Bundle updated' : 'Bundle created'); setBundleEditorOpen(false); setEditingBundle(null); setBundleForm(emptyBundle); invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (target: { type: 'clue' | 'bundle'; id: string }) => {
      if (!token) return Promise.reject(new Error('Authentication required'));
      return target.type === 'clue' ? api.deleteRiddleClue(target.id, token) : api.deleteRiddleBundle(target.id, token);
    },
    onSuccess: () => { toast.success('Deleted'); setDeleteTarget(null); invalidate(); },
  });
  const openClue = (row?: RiddleClue) => { setEditingClue(row ?? null); setClueForm(row ? { title: row.title, prompt: row.prompt, answer: row.answer ?? '', hint: row.hint ?? '', difficulty: row.difficulty, lockSeconds: row.lockSeconds, basePoints: row.basePoints, active: row.active } : emptyClue); setClueEditorOpen(true); };
  const openBundle = (row?: RiddleBundle) => { setEditingBundle(row ?? null); setBundleForm(row ? { name: row.name, description: row.description ?? '', active: row.active, clueIds: row.clues?.map((entry) => entry.clue.id).join('\n') ?? '' } : emptyBundle); setBundleEditorOpen(true); };
  const submitClue = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); saveClue.mutate(); };
  const submitBundle = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); saveBundle.mutate(); };
  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="clues">Clues</TabsTrigger><TabsTrigger value="bundles">Bundles</TabsTrigger></TabsList>
        <TabsContent value="clues">
          <ContentTable title="Riddle Clues" rows={cluesQuery.data?.clues ?? []} loading={cluesQuery.isLoading} rowKey={(row) => row.id} onCreate={() => openClue()} columns={[
            { key: 'title', label: 'Title', render: (row) => row.title },
            { key: 'difficulty', label: 'Difficulty', width: '120px', render: (row) => <Badge>{row.difficulty}</Badge> },
            { key: 'points', label: 'Points', width: '90px', render: (row) => row.basePoints },
            { key: 'active', label: 'Active', width: '80px', render: (row) => <Switch checked={row.active} onCheckedChange={(active) => token && api.updateRiddleClue(row.id, token, { active }).then(() => invalidate())} /> },
          ]} rowActions={(row) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openClue(row)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ type: 'clue', id: row.id })}><Trash2 className="h-4 w-4" /></Button></div>} />
        </TabsContent>
        <TabsContent value="bundles">
          <ContentTable title="Riddle Bundles" rows={bundlesQuery.data?.bundles ?? []} loading={bundlesQuery.isLoading} rowKey={(row) => row.id} onCreate={() => openBundle()} columns={[
            { key: 'name', label: 'Name', render: (row) => row.name },
            { key: 'description', label: 'Description', render: (row) => row.description || '-' },
            { key: 'clues', label: 'Clues', width: '90px', render: (row) => row.clues?.length ?? 0 },
            { key: 'active', label: 'Active', width: '80px', render: (row) => <Switch checked={row.active} onCheckedChange={(active) => token && api.updateRiddleBundle(row.id, token, { active }).then(() => invalidate())} /> },
          ]} rowActions={(row) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openBundle(row)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ type: 'bundle', id: row.id })}><Trash2 className="h-4 w-4" /></Button></div>} />
        </TabsContent>
      </Tabs>
      <ContentEditor open={clueEditorOpen} title={editingClue ? 'Edit clue' : 'Create clue'} onClose={() => setClueEditorOpen(false)} onSubmit={submitClue} saving={saveClue.isPending}>
        <div className="space-y-2"><Label>Title</Label><Input value={clueForm.title} onChange={(event) => setClueForm((current) => ({ ...current, title: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Prompt</Label><Textarea value={clueForm.prompt} onChange={(event) => setClueForm((current) => ({ ...current, prompt: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Answer</Label><Input value={clueForm.answer} onChange={(event) => setClueForm((current) => ({ ...current, answer: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Hint</Label><Input value={clueForm.hint} onChange={(event) => setClueForm((current) => ({ ...current, hint: event.target.value }))} /></div>
        <div className="space-y-2"><Label>Difficulty</Label><Select value={clueForm.difficulty} onChange={(event) => setClueForm((current) => ({ ...current, difficulty: event.target.value as GameDifficulty }))}><option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option></Select></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Lock seconds</Label><Input type="number" value={clueForm.lockSeconds} onChange={(event) => setClueForm((current) => ({ ...current, lockSeconds: Number(event.target.value) }))} /></div><div className="space-y-2"><Label>Points</Label><Input type="number" value={clueForm.basePoints} onChange={(event) => setClueForm((current) => ({ ...current, basePoints: Number(event.target.value) }))} /></div></div>
        <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={clueForm.active} onCheckedChange={(active) => setClueForm((current) => ({ ...current, active }))} /></div>
      </ContentEditor>
      <ContentEditor open={bundleEditorOpen} title={editingBundle ? 'Edit bundle' : 'Create bundle'} onClose={() => setBundleEditorOpen(false)} onSubmit={submitBundle} saving={saveBundle.isPending}>
        <div className="space-y-2"><Label>Name</Label><Input value={bundleForm.name} onChange={(event) => setBundleForm((current) => ({ ...current, name: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={bundleForm.description} onChange={(event) => setBundleForm((current) => ({ ...current, description: event.target.value }))} /></div>
        <div className="space-y-2"><Label>Ordered clue IDs</Label><Textarea value={bundleForm.clueIds} onChange={(event) => setBundleForm((current) => ({ ...current, clueIds: event.target.value }))} placeholder="One clue id per line" /></div>
        <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={bundleForm.active} onCheckedChange={(active) => setBundleForm((current) => ({ ...current, active }))} /></div>
      </ContentEditor>
      <ConfirmDelete open={Boolean(deleteTarget)} title="Delete content" description="This action removes the selected Riddle Room content." onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)} />
    </>
  );
}
