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
import { api, type GameDifficulty, type PuzzleRunPuzzle } from '@/lib/api';
import { ContentEditor } from './ContentEditor';
import { ContentTable } from './ContentTable';
import { ConfirmDelete } from './ConfirmDelete';

const emptyForm = { prompt: '', answer: '', hints: [''], difficulty: 'EASY' as GameDifficulty, basePoints: 100, hintPenalty: 20, active: true };

export default function PuzzleRunAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PuzzleRunPuzzle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const listQuery = useQuery({ queryKey: ['admin-game-content', 'puzzle-run'], queryFn: () => api.getAdminPuzzleRunPuzzles(token || ''), enabled: Boolean(token) });
  const dayQuery = useQuery({ queryKey: ['admin-game-content', 'puzzle-run-day'], queryFn: () => api.getAdminPuzzleRunToday(token || ''), enabled: Boolean(token) });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'puzzle-run'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'puzzle-run-day'] });
  };
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Authentication required');
      const payload = { ...form, hints: form.hints.filter(Boolean) };
      return editing ? api.updatePuzzleRunPuzzle(editing.id, token, payload) : api.createPuzzleRunPuzzle(token, payload);
    },
    onSuccess: () => { toast.success(editing ? 'Puzzle updated' : 'Puzzle created'); setEditorOpen(false); setEditing(null); setForm(emptyForm); invalidate(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save puzzle'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => token ? api.deletePuzzleRunPuzzle(id, token) : Promise.reject(new Error('Authentication required')),
    onSuccess: () => { toast.success('Puzzle deleted'); setDeleteId(null); invalidate(); },
  });
  const regenMutation = useMutation({
    mutationFn: () => token ? api.regeneratePuzzleRunToday(token) : Promise.reject(new Error('Authentication required')),
    onSuccess: () => { toast.success('Today deck regenerated'); invalidate(); },
  });
  const openEditor = (row?: PuzzleRunPuzzle) => {
    setEditing(row ?? null);
    setForm(row ? { prompt: row.prompt, answer: row.answer ?? '', hints: row.hints?.length ? row.hints : [''], difficulty: row.difficulty, basePoints: row.basePoints, hintPenalty: row.hintPenalty, active: row.active ?? true } : emptyForm);
    setEditorOpen(true);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); saveMutation.mutate(); };
  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Today&apos;s deck</CardTitle><Button variant="outline" onClick={() => regenMutation.mutate()}>Regenerate</Button></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(dayQuery.data?.day?.puzzles ?? []).map((puzzle) => <div key={puzzle.id} className="border rounded-md p-2">{puzzle.order}. {puzzle.prompt}</div>)}
          </CardContent>
        </Card>
        <ContentTable
          title="Puzzle Library"
          rows={listQuery.data?.puzzles ?? []}
          loading={listQuery.isLoading}
          rowKey={(row) => row.id}
          onCreate={() => openEditor()}
          columns={[
            { key: 'prompt', label: 'Prompt', render: (row) => <span className="line-clamp-2">{row.prompt}</span> },
            { key: 'difficulty', label: 'Difficulty', width: '120px', render: (row) => <Badge>{row.difficulty}</Badge> },
            { key: 'basePoints', label: 'Points', width: '90px', render: (row) => row.basePoints },
            { key: 'hintPenalty', label: 'Hint', width: '90px', render: (row) => row.hintPenalty },
            { key: 'active', label: 'Active', width: '80px', render: (row) => <Switch checked={row.active ?? false} onCheckedChange={(active) => token && api.updatePuzzleRunPuzzle(row.id, token, { active }).then(() => invalidate())} /> },
          ]}
          rowActions={(row) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openEditor(row)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button></div>}
        />
      </div>
      <ContentEditor open={editorOpen} title={editing ? 'Edit puzzle' : 'Create puzzle'} onClose={() => setEditorOpen(false)} onSubmit={submit} saving={saveMutation.isPending}>
        <div className="space-y-2"><Label>Prompt</Label><Textarea value={form.prompt} onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Answer</Label><Input value={form.answer} onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Hints</Label>{form.hints.map((hint, index) => <Input key={index} value={hint} onChange={(event) => setForm((current) => ({ ...current, hints: current.hints.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} />)}<Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, hints: [...current.hints, ''] }))}>Add hint</Button></div>
        <div className="space-y-2"><Label>Difficulty</Label><Select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as GameDifficulty }))}><option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option></Select></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Base points</Label><Input type="number" value={form.basePoints} onChange={(event) => setForm((current) => ({ ...current, basePoints: Number(event.target.value) }))} /></div><div className="space-y-2"><Label>Hint penalty</Label><Input type="number" value={form.hintPenalty} onChange={(event) => setForm((current) => ({ ...current, hintPenalty: Number(event.target.value) }))} /></div></div>
        <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} /></div>
      </ContentEditor>
      <ConfirmDelete open={Boolean(deleteId)} title="Delete puzzle" description="This removes the puzzle from future daily decks." onCancel={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
    </>
  );
}
