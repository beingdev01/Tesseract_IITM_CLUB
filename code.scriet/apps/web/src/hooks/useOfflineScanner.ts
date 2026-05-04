// Stub — the offline scanner hook was removed. AdminScanner still imports it.
// Provide a shape-compatible no-op.

export interface LocalScanEntry {
  id: string;
  localId: string;
  token: string;
  scannedAt: string;
  scannedAtLocal: string;
  synced: boolean;
  result: 'ok' | 'error' | 'duplicate';
  name?: string;
  userName?: string;
  errorMessage?: string;
  dayNumber?: number;
}

interface UseOfflineScannerOptions {
  eventId: string;
  authToken: string;
  dayNumber: number;
  bypassWindow: boolean;
}

interface ScanStats {
  total: number;
  synced: number;
  pending: number;
  errors: number;
}

export function useOfflineScanner(_options: UseOfflineScannerOptions) {
  return {
    scans: [] as LocalScanEntry[],
    stats: { total: 0, synced: 0, pending: 0, errors: 0 } as ScanStats,
    addScan: (_decodedText: string) => null as LocalScanEntry | null,
    syncPending: () => Promise.resolve(),
    clearPending: () => {},
    syncStatus: 'idle' as 'idle' | 'syncing' | 'error',
  };
}
