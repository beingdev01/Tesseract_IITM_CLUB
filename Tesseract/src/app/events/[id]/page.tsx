"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { eventsApi, registrationsApi, teamsApi } from "@/lib/api/services";
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

const CATEGORY_GLYPH: Record<string, string> = {
  hackathon: "⚡",
  quiz: "?",
  meetup: "◉",
  workshop: "⊞",
  tournament: "▶",
  social: "◈",
};

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { user, isHydrated, initialRefreshDone } = useAuthStore();
  const [rsvping, setRsvping] = useState(false);

  useEffect(() => {
    if (!isHydrated || !initialRefreshDone) return;
    if (!user) router.replace("/auth");
  }, [isHydrated, initialRefreshDone, user, router]);

  const { data: event, loading, error, refetch } = useApi<TesseractEvent>(
    () => eventsApi.get(id),
    [id],
  );
  const { data: similarEvents } = useApi<TesseractEvent[]>(
    () => eventsApi.list({ pageSize: 4 }).then((r) => (Array.isArray(r) ? r : [])),
    [id],
  );

  const handleRsvp = async () => {
    if (!event) return;
    setRsvping(true);
    try {
      if (event.teamRegistration) {
        router.push(`/events/${event.id}/team`);
      } else {
        await registrationsApi.register(event.id);
        toast.success("RSVP confirmed!");
        refetch();
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Could not RSVP");
    } finally {
      setRsvping(false);
    }
  };

  const handleUnregister = async () => {
    if (!event || !window.confirm("Are you sure you want to cancel your registration?")) return;
    setRsvping(true);
    try {
      await registrationsApi.unregister(event.id);
      toast.success("Registration cancelled");
      refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Could not cancel registration");
    } finally {
      setRsvping(false);
    }
  };

  const handleAddCalendar = () => {
    if (!event) return;
    const start = new Date(event.startsAt).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const end = new Date(event.endsAt).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;
    window.open(url, "_blank");
  };

  const handleShare = async () => {
    if (!event) return;
    const url = `${window.location.origin}/events/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: event.description, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  if (!isHydrated || !initialRefreshDone || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading event…</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <div className="lb-kicker">{"// event_not_found"}</div>
        <p>{error?.message ?? "This event does not exist."}</p>
        <Link href="/events" className="lb-btn-ghost">← all events</Link>
      </div>
    );
  }

  const c: Color = "red";
  const similar = (similarEvents ?? []).filter((e) => e.id !== event.id).slice(0, 3);

  return (
    <div className="lb-root evd-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline={`// events · ${event.title.toLowerCase()}`}
        active="events"
        cta={<MeChip />}
      />

      {/* Feature panel */}
      <section className={`evd-hero lb-c-${c}`}>
        <div className="evd-hero-art">
          <div className="evd-hero-glyph">{CATEGORY_GLYPH[event.category] || "▶"}</div>
          <div className="evd-hero-tag">#{event.category}</div>
        </div>
        <div className="evd-hero-body">
          <div className="lb-kicker">{"// " + event.category}</div>
          <h1 className="evd-hero-title">{event.title}</h1>
          {event.shortDescription ? (
            <p className="evd-hero-desc">{event.shortDescription}</p>
          ) : (
            <div className="evd-hero-desc" dangerouslySetInnerHTML={{ __html: event.description }} />
          )}
          <div className="evd-hero-meta">
            <div className="evd-meta-item">
              <span>DATE</span>
              <b>{fmtDate(event.startsAt)}</b>
            </div>
            <div className="evd-meta-item">
              <span>TIME</span>
              <b>{fmtTime(event.startsAt)} IST</b>
            </div>
            <div className="evd-meta-item">
              <span>WHERE</span>
              <b>{event.location}</b>
            </div>
            <div className="evd-meta-item">
              <span>HOST</span>
              <b>{event.organizers[0] ?? "core.team"}</b>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column body */}
      <section className="gd-main">
        <div className="gd-col-l">
          <Brackets tag="about.this.event" accent={c}>
            <h2 className="dash-h">FULL DETAILS</h2>
            <div className="evd-full-desc" dangerouslySetInnerHTML={{ __html: event.description }} />

            {event.agenda && (
              <>
                <h3 className="dash-h" style={{ marginTop: 32 }}>AGENDA</h3>
                <div className="evd-full-desc" dangerouslySetInnerHTML={{ __html: event.agenda }} />
              </>
            )}

            {event.highlights && (
              <>
                <h3 className="dash-h" style={{ marginTop: 32 }}>HIGHLIGHTS</h3>
                <div className="evd-full-desc" dangerouslySetInnerHTML={{ __html: event.highlights }} />
              </>
            )}

            {event.learningOutcomes && (
              <>
                <h3 className="dash-h" style={{ marginTop: 32 }}>LEARNING OUTCOMES</h3>
                <div className="evd-full-desc" dangerouslySetInnerHTML={{ __html: event.learningOutcomes }} />
              </>
            )}

            {event.prerequisites && (
              <>
                <h3 className="dash-h" style={{ marginTop: 32 }}>PREREQUISITES</h3>
                <div className="evd-full-desc" dangerouslySetInnerHTML={{ __html: event.prerequisites }} />
              </>
            )}

            {event.targetAudience && (
              <>
                <h3 className="dash-h" style={{ marginTop: 32 }}>TARGET AUDIENCE</h3>
                <div className="evd-full-desc" dangerouslySetInnerHTML={{ __html: event.targetAudience }} />
              </>
            )}

            {event.tags && event.tags.length > 0 && (
              <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {event.tags.map((t) => (
                  <span
                    key={t}
                    className="lb-kicker"
                    style={{
                      padding: "4px 10px",
                      border: "1px solid rgba(255,217,59,0.3)",
                      color: "#ffd93b",
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="gd-stat">
                <span>CAPACITY</span>
                <b>{event.capacity}</b>
              </div>
              <div className="gd-stat">
                <span>REGISTERED</span>
                <b>{event.registered} {event.capacity ? `/ ${event.capacity}` : ""}</b>
              </div>
              <div className="gd-stat">
                <span>XP REWARD</span>
                <b>{event.xpReward}</b>
              </div>
              <div className="gd-stat">
                <span>STATUS</span>
                <b className={event.status === "live" ? "lb-c-red" : ""}>
                  {event.status.toUpperCase()}
                </b>
              </div>
            </div>
          </Brackets>

          <Brackets tag="similar.events" accent="yellow">
            <h2 className="dash-h">MORE EVENTS</h2>
            <div className="events-list evd-similar">
              {similar.length === 0 ? (
                <div style={{ color: "#888", padding: "20px 0" }}>No other events scheduled.</div>
              ) : (
                similar.map((e, i) => (
                  <div key={e.id} className={`event-row lb-c-${colorAt(i)}`}>
                    <div className="event-row-date">
                      <div className="event-row-day">{fmtDate(e.startsAt)}</div>
                      <div className="event-row-time">{fmtTime(e.startsAt)}</div>
                    </div>
                    <div className="event-row-divider" />
                    <div className="event-row-body">
                      <div className="event-row-tag">#{e.category}</div>
                      <div className="event-row-title">{e.title}</div>
                    </div>
                    <Link href={`/events/${e.id}`} className="lb-btn-ghost event-row-btn">
                      VIEW
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Brackets>
        </div>

        <div className="gd-col-r">
          <Brackets tag="who's.going" accent="green">
            <h2 className="dash-h">RSVP LIST · {event.registered} GOING</h2>
            <div className="evd-rsvp-stack">
              {[...Array(Math.min(8, event.registered))].map((_, i) => (
                <span key={i} className={`lb-avatar-chip lb-c-${colorAt(i)} evd-rsvp-chip`} />
              ))}
              {event.registered > 8 && (
                <span className="evd-rsvp-more">+{event.registered - 8} more</span>
              )}
            </div>
            {event.is_user_joined ? (
              event.teamRegistration ? (
                <button
                  className="lb-btn-primary evd-rsvp-btn"
                  onClick={() => router.push(`/events/${event.id}/team`)}
                >
                  MANAGE TEAM ▶
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="lb-btn-primary evd-rsvp-btn" disabled>
                    RSVP · YOU'RE IN ✓
                  </button>
                  <button
                    className="lb-btn-ghost evd-rsvp-btn"
                    style={{ color: "#ff4444", borderColor: "rgba(255,68,68,0.3)" }}
                    onClick={handleUnregister}
                    disabled={rsvping}
                  >
                    UNREGISTER
                  </button>
                </div>
              )
            ) : (
              <button
                className="lb-btn-primary evd-rsvp-btn"
                onClick={handleRsvp}
                disabled={
                  rsvping || 
                  event.registrationStatus === "closed" || 
                  event.registrationStatus === "ended" || 
                  event.registrationStatus === "full"
                }
              >
                {rsvping 
                  ? "RSVPING…" 
                  : event.registrationStatus === "closed"
                    ? "REGISTRATION CLOSED"
                    : event.registrationStatus === "ended"
                      ? "EVENT ENDED"
                      : event.registrationStatus === "full"
                        ? "EVENT FULL"
                        : event.teamRegistration
                          ? "REGISTER TEAM ▶"
                          : "RSVP NOW ▶"}
              </button>
            )}
          </Brackets>

          <div className={`gd-cta-card lb-c-${c}`}>
            <div className="gd-cta-label">{"// add to your schedule"}</div>
            <div className="gd-cta-title">{event.title}</div>
            <div className="gd-cta-meta">
              {fmtDate(event.startsAt)} · {fmtTime(event.startsAt)} IST · {event.location}
            </div>
            <button
              className="lb-btn-ghost lb-btn-lg"
              style={{ width: "100%", marginBottom: "10px" }}
              onClick={handleAddCalendar}
            >
              ADD TO CALENDAR
            </button>
            <button
              className="lb-btn-ghost lb-btn-lg"
              style={{ width: "100%" }}
              onClick={handleShare}
            >
              SHARE EVENT
            </button>
          </div>

          <Link href="/events" className="lb-btn-ghost evd-back-btn">
            ← ALL EVENTS
          </Link>
        </div>
      </section>

      <TesseractFooter context="events" />
    </div>
  );
}
