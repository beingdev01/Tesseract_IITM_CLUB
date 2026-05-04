"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { eventsApi } from "@/lib/api/services";
import type { TesseractEvent } from "@/lib/types";

type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
const PALETTE: Color[] = ["red", "yellow", "green", "blue", "purple", "orange"];
const colorAt = (i: number): Color => PALETTE[i % PALETTE.length];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" }).toLowerCase();
}

const CATEGORY_GLYPH: Record<string, string> = {
  hackathon: "⚡",
  quiz: "?",
  meetup: "◉",
  workshop: "⊞",
  tournament: "▶",
  social: "◈",
};

export default function EventsPage() {
  const router = useRouter();
  const { user, isHydrated, initialRefreshDone } = useAuthStore();
  const [rsvping, setRsvping] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !initialRefreshDone) return;
    if (!user) router.replace("/auth");
  }, [isHydrated, initialRefreshDone, user, router]);

  const { data: events, loading, refetch } = useApi<TesseractEvent[]>(
    () => eventsApi.list({ pageSize: 50 }).then((r) => (Array.isArray(r) ? r : [])),
    [],
  );

  // Poll for live RSVP counts every 30s
  useEffect(() => {
    const id = setInterval(refetch, 30000);
    return () => clearInterval(id);
  }, [refetch]);

  const handleRsvp = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRsvping(eventId);
    try {
      await eventsApi.join(eventId);
      toast.success("RSVP confirmed!");
      refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Could not RSVP");
    } finally {
      setRsvping(null);
    }
  };

  if (!isHydrated || !initialRefreshDone || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  const featured = events && events.length > 0 ? events[0] : null;
  const rest = events && events.length > 1 ? events.slice(1) : [];

  return (
    <div className="lb-root events-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline="// events"
        active="events"
        cta={
          <>
            {(user.role === "core" || user.role === "admin") && (
              <Link href="/admin/events/new" className="lb-btn-ghost">+ HOST EVENT</Link>
            )}
            <MeChip />
          </>
        }
      />

      <section className="events-hero">
        <div>
          <div className="lb-kicker">{"// schedule.live"}</div>
          <h1 className="events-title">
            SHOW UP. <span className="lb-h-accent">LOG OFF.</span> CONNECT.
          </h1>
          <p className="lb-sub">
            {events ? `${events.length} events scheduled.` : "Loading events…"} Movie nights, tournaments, riddle solves, play
            nights. Free. Members only.
          </p>
        </div>
      </section>

      {(loading || featured) && (
        <section className="events-featured">
          {loading && !featured ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "380px 1fr",
              gap: "32px",
              opacity: 0.25,
              minHeight: 280,
              border: "1px solid rgba(255,255,255,0.08)",
              padding: 28,
            }}>
              <div style={{ background: "rgba(255,255,255,0.05)", minHeight: 280 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ height: 14, width: "40%", background: "rgba(255,255,255,0.1)" }} />
                <div style={{ height: 40, width: "70%", background: "rgba(255,255,255,0.1)" }} />
                <div style={{ height: 12, width: "90%", background: "rgba(255,255,255,0.06)" }} />
                <div style={{ height: 12, width: "75%", background: "rgba(255,255,255,0.06)" }} />
              </div>
            </div>
          ) : featured ? (
          <Brackets tag="featured · next" accent="red">
            <div className="event-feat">
              <div className="event-feat-art lb-c-red">
                <div className="event-feat-glyph">{CATEGORY_GLYPH[featured.category] || "▶"}</div>
                <div className="event-feat-tag">{featured.category.toUpperCase()}</div>
              </div>
              <div className="event-feat-body">
                <div className="event-feat-when">
                  <div>
                    <span>DATE</span>
                    <b>{fmtDate(featured.startsAt)} · {fmtDay(featured.startsAt)}</b>
                  </div>
                  <div>
                    <span>TIME</span>
                    <b>{fmtTime(featured.startsAt)} IST</b>
                  </div>
                  <div>
                    <span>WHERE</span>
                    <b>{featured.location}</b>
                  </div>
                  <div>
                    <span>STATUS</span>
                    <b className="lb-c-red">{featured.status.toUpperCase()}</b>
                  </div>
                </div>
                <h2 className="event-feat-title">{featured.title.toUpperCase()}</h2>
                <p className="event-feat-desc">{featured.description}</p>
                <div className="event-feat-rsvps">
                  <div className="dash-rsvp-stack">
                    {[...Array(Math.min(6, featured.registered))].map((_, i) => (
                      <span key={i} className={`lb-c-${colorAt(i)}`} />
                    ))}
                  </div>
                  <span className="event-feat-going">
                    + {featured.registered} of {featured.capacity} going
                  </span>
                </div>
                <div className="event-feat-actions">
                  <button
                    className="lb-btn-primary lb-btn-lg"
                    onClick={(e) => handleRsvp(e, featured.id)}
                    disabled={rsvping === featured.id || featured.is_user_joined}
                  >
                    {featured.is_user_joined ? "✓ RSVP'D" : rsvping === featured.id ? "RSVPING…" : "RSVP ✓"}
                  </button>
                  <Link href={`/events/${featured.id}`} className="lb-btn-ghost lb-btn-lg">
                    VIEW EVENT →
                  </Link>
                </div>
              </div>
            </div>
          </Brackets>
          ) : null}
        </section>
      )}

      <section className="events-list-section">
        <div className="lb-section-head">
          <div className="lb-kicker">
            {"// upcoming · "}
            {events?.length ?? 0}
          </div>
          <h2 className="lb-section-title">THIS WEEK + NEXT</h2>
          <div className="lb-kicker-right">filter · all</div>
        </div>

        <div className="events-list">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className={`event-row lb-c-${colorAt(i)}`} style={{ opacity: 0.4 }}>
                <div className="event-row-date">
                  <div className="event-row-day">— —</div>
                  <div className="event-row-time">— —</div>
                </div>
                <div className="event-row-divider" />
                <div className="event-row-body">
                  <div className="event-row-tag">#loading</div>
                  <div className="event-row-title">— — —</div>
                </div>
              </div>
            ))
          ) : rest.length === 0 && !featured ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
              <div className="lb-kicker" style={{ marginBottom: "12px" }}>{"// no_events_yet"}</div>
              <p>No upcoming events scheduled.</p>
            </div>
          ) : (
            rest.map((e, i) => {
              const c = colorAt(i + 1);
              return (
                <div key={e.id} className={`event-row lb-c-${c}`}>
                  <div className="event-row-date">
                    <div className="event-row-day">{fmtDate(e.startsAt)}</div>
                    <div className="event-row-time">{fmtTime(e.startsAt)}</div>
                  </div>
                  <div className="event-row-divider" />
                  <div className="event-row-body">
                    <div className="event-row-tag">#{e.category}</div>
                    <div className="event-row-title">{e.title}</div>
                    <div className="event-row-desc">{e.description}</div>
                  </div>
                  <div className="event-row-stats">
                    <div className="event-row-going">
                      <div className="dash-rsvp-stack small">
                        {[...Array(Math.min(3, e.registered))].map((_, j) => (
                          <span key={j} className={`lb-c-${colorAt(j)}`} />
                        ))}
                      </div>
                      <span>{e.registered} going</span>
                    </div>
                    <div className="event-row-host">
                      host · {e.organizers[0] ?? "core.team"}
                    </div>
                  </div>
                  {e.is_user_joined ? (
                    <Link href={`/events/${e.id}`} className="lb-btn-ghost event-row-btn">
                      ✓ JOINED
                    </Link>
                  ) : (
                    <button
                      onClick={(ev) => handleRsvp(ev, e.id)}
                      disabled={rsvping === e.id}
                      className="lb-btn-primary event-row-btn"
                    >
                      {rsvping === e.id ? "…" : "RSVP"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <TesseractFooter context="events" />
    </div>
  );
}
