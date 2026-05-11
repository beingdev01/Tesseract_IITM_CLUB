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
import { api, type TriviaDifficulty, type TriviaQuestionAdmin } from '@/lib/api';
import { ContentEditor } from './ContentEditor';
import { ContentTable } from './ContentTable';
import { ConfirmDelete } from './ConfirmDelete';

const emptyForm = { prompt: '', options: [''], correctIndex: 0, difficulty: 'EASY' as TriviaDifficulty, floor: 1, category: '', active: true };

export default function TriviaTowerAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TriviaQuestionAdmin | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const query = useQuery({
    queryKey: ['admin-game-content', 'trivia-tower'],
    queryFn: () => api.getAdminTriviaQuestions(token || ''),
    enabled: Boolean(token),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'trivia-tower'] });
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Authentication required');
      const payload = { ...form, options: form.options.filter(Boolean), category: form.category || undefined };
      return editing ? api.updateTriviaQuestion(editing.id, token, payload) : api.createTriviaQuestion(token, payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Question updated' : 'Question created');
      setEditorOpen(false);
      setEditing(null);
      setForm(emptyForm);
      void invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save question'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Authentication required');
      return api.deleteTriviaQuestion(id, token);
    },
    onSuccess: () => {
      toast.success('Question deleted');
      setDeleteId(null);
      void invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete question'),
  });

  const openEditor = (row?: TriviaQuestionAdmin) => {
    setEditing(row ?? null);
    setForm(row ? { prompt: row.prompt, options: row.options, correctIndex: row.correctIndex, difficulty: row.difficulty, floor: row.floor, category: row.category ?? '', active: row.active } : emptyForm);
    setEditorOpen(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <>
      <ContentTable
        title="Trivia Questions"
        description="Question bank used for tower floors."
        rows={query.data?.questions ?? []}
        loading={query.isLoading}
        rowKey={(row) => row.id}
        onCreate={() => openEditor()}
        columns={[
          { key: 'prompt', label: 'Prompt', render: (row) => <span className="line-clamp-2">{row.prompt}</span> },
          { key: 'difficulty', label: 'Difficulty', width: '120px', render: (row) => <Badge>{row.difficulty}</Badge> },
          { key: 'floor', label: 'Floor', width: '80px', render: (row) => row.floor },
          { key: 'category', label: 'Category', width: '120px', render: (row) => row.category || '-' },
          { key: 'active', label: 'Active', width: '80px', render: (row) => <Switch checked={row.active} onCheckedChange={(active) => token && api.updateTriviaQuestion(row.id, token, { active }).then(() => invalidate())} /> },
        ]}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => openEditor(row)}><Edit2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />
      <ContentEditor open={editorOpen} title={editing ? 'Edit question' : 'Create question'} onClose={() => setEditorOpen(false)} onSubmit={submit} saving={saveMutation.isPending}>
        <div className="space-y-2"><Label>Prompt</Label><Textarea value={form.prompt} onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))} required /></div>
        <div className="space-y-2">
          <Label>Options</Label>
          {form.options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input value={option} onChange={(event) => setForm((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} />
              <input type="radio" checked={form.correctIndex === index} onChange={() => setForm((current) => ({ ...current, correctIndex: index }))} aria-label={`Correct option ${index + 1}`} />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, options: [...current.options, ''] }))} disabled={form.options.length >= 6}>Add option</Button>
        </div>
        <div className="space-y-2"><Label>Difficulty</Label><Select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as TriviaDifficulty }))}><option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option><option value="EXPERT">EXPERT</option></Select></div>
        <div className="space-y-2"><Label>Floor</Label><Input type="number" value={form.floor} onChange={(event) => setForm((current) => ({ ...current, floor: Number(event.target.value) }))} /></div>
        <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></div>
        <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} /></div>
      </ContentEditor>
      <ConfirmDelete open={Boolean(deleteId)} title="Delete question" description="This removes the question from future Trivia Tower runs." onCancel={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
    </>
  );
}
