import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';

export interface ContentColumn<T> {
  key: string;
  label: string;
  width?: string;
  render: (row: T) => ReactNode;
}

interface ContentTableProps<T> {
  title: string;
  description?: string;
  rows: T[];
  columns: ContentColumn<T>[];
  loading: boolean;
  emptyText?: string;
  onCreate?: () => void;
  createLabel?: string;
  rowKey: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
}

export function ContentTable<T>({
  title,
  description,
  rows,
  columns,
  loading,
  emptyText = 'No entries yet.',
  onCreate,
  createLabel = 'Add new',
  rowKey,
  rowActions,
}: ContentTableProps<T>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {onCreate && (
          <Button onClick={onCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" /> {createLabel}
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-3 py-2 font-medium text-muted-foreground"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
              {rowActions && <th className="text-right px-3 py-2 w-32">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-3 py-12 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-3 py-12 text-center text-muted-foreground">
                  {emptyText}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-t hover:bg-muted/30">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 align-middle">
                      {col.render(row)}
                    </td>
                  ))}
                  {rowActions && <td className="px-3 py-2 text-right">{rowActions(row)}</td>}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
