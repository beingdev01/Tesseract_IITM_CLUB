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
import { api, type GameDifficulty, type TypeWarsPassage } from '@/lib/api';
import { ContentEditor } from './ContentEditor';
import { ContentTable } from './ContentTable';
import { ConfirmDelete } from './ConfirmDelete';

const emptyForm = { text: '', difficulty: 'EASY' as GameDifficulty, category: '', source: '', active: true };

export default function TypeWarsAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TypeWarsPassage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [bulkText, setBulkText] = useState('');

  const query = useQuery({
    queryKey: ['admin-game-content', 'type-wars'],
    queryFn: () => api.getAdminTypeWarsPassages(token || ''),
    enabled: Boolean(token),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'type-wars'] });
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Authentication required');
      const payload = { ...form, category: form.category || undefined, source: form.source || undefined };
      return editing ? api.updateTypeWarsPassage(editing.id, token, payload) : api.createTypeWarsPassage(token, payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Passage updated' : 'Passage created');
      setEditorOpen(false);
      setEditing(null);
      setForm(emptyForm);
      void invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save passage'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Authentication required');
      return api.deleteTypeWarsPassage(id, token);
    },
    onSuccess: () => {
      toast.success('Passage deleted');
      setDeleteId(null);
      void invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete passage'),
  });
  const bulkMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Authentication required');
      const passages = JSON.parse(bulkText) as Array<Partial<TypeWarsPassage>>;
      return api.bulkImportTypeWarsPassages(token, passages);
    },
    onSuccess: () => {
      toast.success('Passages imported');
      setBulkText('');
      void invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Bulk import failed'),
  });

  const openEditor = (row?: TypeWarsPassage) => {
    setEditing(row ?? null);
    setEditorOpen(true);
    setForm(row ? {
      text: row.text,
      difficulty: row.difficulty,
      category: row.category ?? '',
      source: row.source ?? '',
      active: row.active,
    } : emptyForm);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const rows = query.data?.passages ?? [];

  return (
    <>
      <div className="space-y-4">
        <ContentTable
          title="Type Wars Passages"
          description="Typing passages used for multiplayer races."
          rows={rows}
          loading={query.isLoading}
          rowKey={(row) => row.id}
          onCreate={() => openEditor()}
          columns={[
            { key: 'text', label: 'Text', render: (row) => <span className="line-clamp-2">{row.text}</span> },
            { key: 'difficulty', label: 'Difficulty', width: '120px', render: (row) => <Badge>{row.difficulty}</Badge> },
            { key: 'wordCount', label: 'Words', width: '90px', render: (row) => row.wordCount },
            { key: 'active', label: 'Active', width: '90px', render: (row) => <Switch checked={row.active} onCheckedChange={(active) => token && api.updateTypeWarsPassage(row.id, token, { active }).then(() => invalidate())} /> },
            { key: 'category', label: 'Category', width: '130px', render: (row) => row.category || '-' },
          ]}
          rowActions={(row) => (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEditor(row)}><Edit2 className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )}
        />
        <div className="grid gap-2">
          <Label>Bulk import JSON array</Label>
          <Textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder='[{"text":"...","difficulty":"EASY","category":"tech"}]' />
          <Button type="button" variant="outline" onClick={() => bulkMutation.mutate()} disabled={!bulkText.trim() || bulkMutation.isPending}>Import passages</Button>
        </div>
      </div>

      <ContentEditor open={editorOpen} title={editing ? 'Edit passage' : 'Create passage'} onClose={() => { setEditorOpen(false); setEditing(null); setForm(emptyForm); }} onSubmit={submit} saving={saveMutation.isPending}>
        <div className="space-y-2"><Label>Text</Label><Textarea value={form.text} onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Difficulty</Label><Select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as GameDifficulty }))}><option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option></Select></div>
        <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></div>
        <div className="space-y-2"><Label>Source</Label><Input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} /></div>
        <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} /></div>
      </ContentEditor>

      <ConfirmDelete
        open={Boolean(deleteId)}
        title="Delete passage"
        description="This removes the passage from future Type Wars races."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}
