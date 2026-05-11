import { useEffect, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

interface ContentEditorProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving?: boolean;
  submitLabel?: string;
  children: ReactNode;
}

export function ContentEditor({
  open,
  title,
  onClose,
  onSubmit,
  saving,
  submitLabel = 'Save',
  children,
}: ContentEditorProps) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-background h-full w-full max-w-md flex flex-col border-l shadow-2xl"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        <footer className="px-5 py-3 border-t flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </footer>
      </form>
    </div>
  );
}
