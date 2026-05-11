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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { api, type GameDifficulty, type ScribblPrompt } from '@/lib/api';
import { ContentEditor } from './ContentEditor';
import { ContentTable } from './ContentTable';
import { ConfirmDelete } from './ConfirmDelete';

const emptyForm = { word: '', category: '', difficulty: 'EASY' as GameDifficulty, active: true };

export default function ScribblAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ScribblPrompt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [bulkText, setBulkText] = useState('');
  const query = useQuery({ queryKey: ['admin-game-content', 'scribbl'], queryFn: () => api.getAdminScribblPrompts(token || ''), enabled: Boolean(token) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'scribbl'] });
  const saveMutation = useMutation({
    mutationFn: () => token ? (editing ? api.updateScribblPrompt(editing.id, token, form) : api.createScribblPrompt(token, form)) : Promise.reject(new Error('Authentication required')),
    onSuccess: () => { toast.success(editing ? 'Prompt updated' : 'Prompt created'); setEditorOpen(false); setEditing(null); setForm(emptyForm); void invalidate(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save prompt'),
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => token ? api.deleteScribblPrompt(id, token) : Promise.reject(new Error('Authentication required')), onSuccess: () => { toast.success('Prompt deleted'); setDeleteId(null); void invalidate(); } });
  const bulkMutation = useMutation({
    mutationFn: () => token ? api.bulkImportScribblPrompts(token, { words: bulkText.split('\n').map((word) => word.trim()).filter(Boolean), category: form.category || undefined, difficulty: form.difficulty }) : Promise.reject(new Error('Authentication required')),
    onSuccess: () => { toast.success('Prompts imported'); setBulkText(''); void invalidate(); },
  });
  const openEditor = (row?: ScribblPrompt) => { setEditing(row ?? null); setForm(row ? { word: row.word, category: row.category ?? '', difficulty: row.difficulty, active: row.active } : emptyForm); setEditorOpen(true); };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); saveMutation.mutate(); };
  return (
    <>
      <div className="space-y-4">
        <ContentTable title="Scribbl Prompts" rows={query.data?.prompts ?? []} loading={query.isLoading} rowKey={(row) => row.id} onCreate={() => openEditor()} columns={[
          { key: 'word', label: 'Word', render: (row) => row.word },
          { key: 'category', label: 'Category', width: '140px', render: (row) => row.category || '-' },
          { key: 'difficulty', label: 'Difficulty', width: '120px', render: (row) => <Badge>{row.difficulty}</Badge> },
          { key: 'active', label: 'Active', width: '80px', render: (row) => <Switch checked={row.active} onCheckedChange={(active) => token && api.updateScribblPrompt(row.id, token, { active }).then(() => invalidate())} /> },
        ]} rowActions={(row) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openEditor(row)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button></div>} />
        <div className="grid gap-2"><Label>Bulk import words</Label><Textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder="one word per line" /><Button type="button" variant="outline" onClick={() => bulkMutation.mutate()} disabled={!bulkText.trim()}>Import words</Button></div>
      </div>
      <ContentEditor open={editorOpen} title={editing ? 'Edit prompt' : 'Create prompt'} onClose={() => setEditorOpen(false)} onSubmit={submit} saving={saveMutation.isPending}>
        <div className="space-y-2"><Label>Word</Label><Input value={form.word} onChange={(event) => setForm((current) => ({ ...current, word: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></div>
        <div className="space-y-2"><Label>Difficulty</Label><Select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as GameDifficulty }))}><option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option></Select></div>
        <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} /></div>
      </ContentEditor>
      <ConfirmDelete open={Boolean(deleteId)} title="Delete prompt" description="This removes the prompt from future drawing rounds." onCancel={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
    </>
  );
}
