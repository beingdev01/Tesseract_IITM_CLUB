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
import { api, type CipherChallenge, type CipherDifficulty, type CipherType } from '@/lib/api';
import { ContentEditor } from './ContentEditor';
import { ContentTable } from './ContentTable';
import { ConfirmDelete } from './ConfirmDelete';

const emptyForm = { title: '', cipherType: 'CAESAR' as CipherType, plaintext: '', ciphertext: '', key: '', hints: [''], basePoints: 1000, hintPenalty: 100, timeLimitSeconds: 600, difficulty: 'EASY' as CipherDifficulty, activeFrom: '', activeUntil: '', active: true };

export default function CipherLabAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CipherChallenge | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const query = useQuery({ queryKey: ['admin-game-content', 'cipher-lab'], queryFn: () => api.getAdminCipherChallenges(token || ''), enabled: Boolean(token) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-game-content', 'cipher-lab'] });
  const previewMutation = useMutation({
    mutationFn: () => token ? api.previewCipher(token, { cipherType: form.cipherType, plaintext: form.plaintext, key: form.key || null }) : Promise.reject(new Error('Authentication required')),
    onSuccess: (data) => setForm((current) => ({ ...current, ciphertext: data.ciphertext })),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Preview failed'),
  });
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Authentication required');
      const payload = { ...form, hints: form.hints.filter(Boolean), activeFrom: form.activeFrom || null, activeUntil: form.activeUntil || null };
      return editing ? api.updateCipherChallenge(editing.id, token, payload) : api.createCipherChallenge(token, payload);
    },
    onSuccess: () => { toast.success(editing ? 'Cipher updated' : 'Cipher created'); setEditorOpen(false); setEditing(null); setForm(emptyForm); void invalidate(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save cipher'),
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => token ? api.deleteCipherChallenge(id, token) : Promise.reject(new Error('Authentication required')), onSuccess: () => { toast.success('Cipher deleted'); setDeleteId(null); void invalidate(); } });
  const openEditor = (row?: CipherChallenge) => { setEditing(row ?? null); setForm(row ? { title: row.title, cipherType: row.cipherType, plaintext: row.plaintext ?? '', ciphertext: row.ciphertext, key: '', hints: row.hints?.length ? row.hints : [''], basePoints: row.basePoints, hintPenalty: row.hintPenalty, timeLimitSeconds: row.timeLimitSeconds, difficulty: row.difficulty, activeFrom: row.activeFrom ?? '', activeUntil: row.activeUntil ?? '', active: row.active ?? true } : emptyForm); setEditorOpen(true); };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); saveMutation.mutate(); };
  return (
    <>
      <ContentTable
        title="Cipher Challenges"
        rows={query.data?.challenges ?? []}
        loading={query.isLoading}
        rowKey={(row) => row.id}
        onCreate={() => openEditor()}
        columns={[
          { key: 'title', label: 'Title', render: (row) => row.title },
          { key: 'cipherType', label: 'Type', width: '120px', render: (row) => <Badge>{row.cipherType}</Badge> },
          { key: 'difficulty', label: 'Difficulty', width: '120px', render: (row) => <Badge>{row.difficulty}</Badge> },
          { key: 'active', label: 'Active', width: '80px', render: (row) => <Switch checked={row.active ?? false} onCheckedChange={(active) => token && api.updateCipherChallenge(row.id, token, { active }).then(() => invalidate())} /> },
        ]}
        rowActions={(row) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openEditor(row)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button></div>}
      />
      <ContentEditor open={editorOpen} title={editing ? 'Edit cipher' : 'Create cipher'} onClose={() => setEditorOpen(false)} onSubmit={submit} saving={saveMutation.isPending}>
        <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Type</Label><Select value={form.cipherType} onChange={(event) => setForm((current) => ({ ...current, cipherType: event.target.value as CipherType }))}><option value="CAESAR">CAESAR</option><option value="VIGENERE">VIGENERE</option><option value="ATBASH">ATBASH</option><option value="RAILFENCE">RAILFENCE</option><option value="SUBSTITUTION">SUBSTITUTION</option><option value="BASE64">BASE64</option><option value="MORSE">MORSE</option><option value="CUSTOM">CUSTOM</option></Select></div>
        <div className="space-y-2"><Label>Plaintext</Label><Textarea value={form.plaintext} onChange={(event) => setForm((current) => ({ ...current, plaintext: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Key</Label><Input value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} /></div>
        <Button type="button" variant="outline" onClick={() => previewMutation.mutate()}>Preview ciphertext</Button>
        <div className="space-y-2"><Label>Ciphertext</Label><Textarea value={form.ciphertext} onChange={(event) => setForm((current) => ({ ...current, ciphertext: event.target.value }))} required /></div>
        <div className="space-y-2"><Label>Hints</Label>{form.hints.map((hint, index) => <Input key={index} value={hint} onChange={(event) => setForm((current) => ({ ...current, hints: current.hints.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} />)}<Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, hints: [...current.hints, ''] }))}>Add hint</Button></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Base points</Label><Input type="number" value={form.basePoints} onChange={(event) => setForm((current) => ({ ...current, basePoints: Number(event.target.value) }))} /></div><div className="space-y-2"><Label>Hint penalty</Label><Input type="number" value={form.hintPenalty} onChange={(event) => setForm((current) => ({ ...current, hintPenalty: Number(event.target.value) }))} /></div></div>
        <div className="space-y-2"><Label>Time limit seconds</Label><Input type="number" value={form.timeLimitSeconds} onChange={(event) => setForm((current) => ({ ...current, timeLimitSeconds: Number(event.target.value) }))} /></div>
        <div className="space-y-2"><Label>Difficulty</Label><Select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as CipherDifficulty }))}><option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option><option value="INSANE">INSANE</option></Select></div>
        <div className="space-y-2"><Label>Active from</Label><Input value={form.activeFrom} onChange={(event) => setForm((current) => ({ ...current, activeFrom: event.target.value }))} placeholder="2026-05-11T00:00:00.000Z" /></div>
        <div className="space-y-2"><Label>Active until</Label><Input value={form.activeUntil} onChange={(event) => setForm((current) => ({ ...current, activeUntil: event.target.value }))} placeholder="2026-05-13T00:00:00.000Z" /></div>
        <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} /></div>
      </ContentEditor>
      <ConfirmDelete open={Boolean(deleteId)} title="Delete cipher" description="This removes the challenge from rotation." onCancel={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
    </>
  );
}
