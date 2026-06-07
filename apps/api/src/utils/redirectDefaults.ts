// Canonical default short links. These two campaign slugs are also pinned in
// render.yaml for an instant server-side 302; the DB rows make them visible and
// editable in the admin Redirects manager and keep them working in environments
// where the static render.yaml tier is not authoritative.
//
// Keep this list in sync with:
//   - render.yaml (the static redirect entries)
//   - PINNED_SLUGS in apps/web/src/pages/admin/AdminRedirects.tsx
//
// Used by both the boot-time backfill (utils/init.ts) and the seed (prisma/seed.ts).
export interface RedirectDefault {
  slug: string;
  destinationUrl: string;
  note: string;
}

export const DEFAULT_REDIRECTS: RedirectDefault[] = [
  {
    slug: 'escape_room_prelims',
    destinationUrl: 'https://unstop.com/o/o5p1i0t?utm_medium=Share&utm_source=aryangoy25916&utm_campaign=Quizzes',
    note: 'Escape Room prelims (Unstop) — also pinned in render.yaml',
  },
  {
    slug: 'hustlepreneurs',
    destinationUrl: 'https://iitmparadox.org/events/technicals/122',
    note: 'Hustlepreneurs (IITM Paradox) — also pinned in render.yaml',
  },
];
