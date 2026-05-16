import type { EventGuestSummary } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { processImageUrl } from '@/lib/imageUtils';
import { User } from 'lucide-react';

interface ChiefGuestsStripProps {
  guests: EventGuestSummary[];
}

export default function ChiefGuestsStrip({ guests }: ChiefGuestsStripProps) {
  if (guests.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Featured guests</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-100">Chief Guests & Speakers</h2>
        </div>
        <Badge className="hidden border-amber-300/40 bg-amber-500/15 text-amber-100 sm:inline-flex">
          {guests.length} confirmed
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guests.map((guest) => {
          const image = guest.photo ? processImageUrl(guest.photo, 'square') : null;
          const content = (
            <Card className="h-full overflow-hidden border-amber-300/35 bg-gradient-to-br from-[#121522] via-[#0f121b] to-[#0b0e16] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300/55">
              <CardContent className="flex items-center gap-4 p-5">
                {image ? (
                  <img src={image} alt={guest.name} className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200">
                    <User className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <Badge variant="outline" className="border-amber-300/45 bg-amber-500/10 text-amber-100">
                    {guest.role}
                  </Badge>
                  <h3 className="mt-2 truncate text-lg font-semibold text-zinc-100">{guest.name}</h3>
                  <p className="truncate text-sm text-zinc-300">{guest.designation}</p>
                  <p className="truncate text-sm text-zinc-400">{guest.company}</p>
                </div>
              </CardContent>
            </Card>
          );

          // /network/:slug isn't a real route yet — render the card without a link.
          return <div key={`${guest.name}-${guest.role}`}>{content}</div>;
        })}
      </div>
    </section>
  );
}
