"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { eventsApi, teamsApi } from "@/lib/api/services";
import type { TesseractEvent } from "@/lib/types";

export default function TeamRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { user, isHydrated, initialRefreshDone } = useAuthStore();
  
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isHydrated || !initialRefreshDone) return;
    if (!user) router.replace("/auth");
  }, [isHydrated, initialRefreshDone, user, router]);

  const { data: event, loading, error } = useApi<TesseractEvent>(
    () => eventsApi.get(id),
    [id],
  );

  const { data: myTeam, refetch: refetchTeam } = useApi(
    () => teamsApi.myTeam(id).catch((e: any) => {
      // 404 means no team, which is expected before creating one
      if (e.status === 404 || e.code === "not_found") return null;
      throw e;
    }),
    [id],
  );

  if (!isHydrated || !initialRefreshDone || !user || loading) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
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

  if (!event.teamRegistration) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <div className="lb-kicker">{"// no_teams"}</div>
        <p>This event does not support team registrations.</p>
        <Link href={`/events/${id}`} className="lb-btn-ghost">← back to event</Link>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSubmitting(true);
    try {
      await teamsApi.create(id, teamName);
      toast.success("Team created!");
      refetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setSubmitting(true);
    try {
      await teamsApi.join(inviteCode.trim().toUpperCase());
      toast.success("Joined team!");
      refetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to join team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLock = async () => {
    if (!myTeam || !window.confirm("Locking the team will prevent new members from joining. Continue?")) return;
    try {
      await teamsApi.lock(myTeam.id, true);
      toast.success("Team locked");
      refetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to lock team");
    }
  };

  const handleDissolve = async () => {
    if (!myTeam || !window.confirm("Are you sure you want to dissolve this team? All members will be unregistered from the event. This action cannot be undone.")) return;
    setSubmitting(true);
    try {
      await teamsApi.dissolve(myTeam.id);
      toast.success("Team dissolved");
      refetchTeam();
      router.push(`/events/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to dissolve team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKick = async (targetUserId: string) => {
    if (!myTeam || !window.confirm("Remove this member from the team?")) return;
    try {
      await teamsApi.removeMember(myTeam.id, targetUserId);
      toast.success("Member removed");
      refetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  return (
    <div className="lb-root evd-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline={`// team · ${event.title.toLowerCase()}`}
        active="events"
        cta={<MeChip />}
      />

      <section className="admin-main" style={{ padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Brackets tag="team.portal" accent="blue">
            <h2 className="dash-h">{event.title} - TEAM PORTAL</h2>
            <p style={{ color: "#888", marginBottom: 30 }}>
              Team Size Requirements: {event.teamMinSize} to {event.teamMaxSize} members.
            </p>

            {myTeam ? (
              <div className="team-dashboard" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="lb-form-group" style={{ backgroundColor: "rgba(0,0,0,0.3)", padding: 20, borderRadius: 4, border: "1px solid rgba(0,255,255,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ color: "#0ff", margin: "0 0 5px 0", fontSize: 24, fontWeight: "bold" }}>{myTeam.teamName}</h3>
                      <div className="lb-kicker">{myTeam.isLocked ? "// STATUS: LOCKED" : "// STATUS: OPEN"}</div>
                    </div>
                    {!myTeam.isLocked && myTeam.leaderId === user.id && (
                      <button className="lb-btn-primary" onClick={handleLock}>LOCK TEAM</button>
                    )}
                  </div>
                </div>

                {!myTeam.isLocked && (
                  <div className="lb-form-group">
                    <label>INVITE CODE (Share with your friends to let them join)</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input readOnly value={myTeam.inviteCode} className="lb-input" style={{ letterSpacing: 2, fontSize: 18, fontFamily: "monospace" }} />
                      <button 
                        className="lb-btn-ghost" 
                        onClick={() => { navigator.clipboard.writeText(myTeam.inviteCode); toast.success("Code copied!"); }}
                      >
                        COPY
                      </button>
                    </div>
                  </div>
                )}

                <div className="lb-form-group">
                  <label>TEAM MEMBERS ({myTeam.members.length} / {event.teamMaxSize})</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {myTeam.members.map((m: any) => (
                      <div key={m.userId} style={{ padding: "12px 16px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="lb-avatar-chip lb-c-blue" style={{ width: 24, height: 24 }} />
                          <span>{m.user?.name || m.userId} {m.userId === user.id && <span style={{ color: "#888", fontSize: 12 }}>(You)</span>}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span className={m.role === "LEADER" ? "lb-c-yellow" : "lb-c-blue"}>{m.role}</span>
                          {myTeam.leaderId === user.id && m.userId !== user.id && (
                            <button 
                              className="lb-btn-ghost" 
                              style={{ padding: "4px 8px", fontSize: 12, color: "#ff4444", borderColor: "rgba(255,68,68,0.3)" }}
                              onClick={() => handleKick(m.userId)}
                            >
                              KICK
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                  <Link href={`/events/${id}`} className="lb-btn-ghost">
                    ← BACK TO EVENT
                  </Link>
                  {myTeam.leaderId === user.id && (
                    <button 
                      className="lb-btn-ghost" 
                      style={{ color: "#ff4444", borderColor: "rgba(255,68,68,0.3)" }}
                      onClick={handleDissolve}
                      disabled={submitting}
                    >
                      DISSOLVE TEAM
                    </button>
                  )}
                </div>
              </div>
            ) : mode === "choose" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <button className="lb-btn-primary lb-btn-lg" onClick={() => setMode("create")}>
                  CREATE A NEW TEAM
                </button>
                <div style={{ textAlign: "center", color: "#888" }}>OR</div>
                <button className="lb-btn-ghost lb-btn-lg" onClick={() => setMode("join")}>
                  JOIN EXISTING TEAM WITH CODE
                </button>
                <Link href={`/events/${id}`} className="lb-btn-ghost" style={{ alignSelf: "center", marginTop: 20 }}>
                  ← CANCEL
                </Link>
              </div>
            ) : mode === "create" ? (
              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="lb-form-group">
                  <label>TEAM NAME</label>
                  <input required autoFocus value={teamName} onChange={e => setTeamName(e.target.value)} className="lb-input" placeholder="e.g. Byte Bandits" />
                </div>
                <button type="submit" className="lb-btn-primary" disabled={submitting}>
                  {submitting ? "CREATING..." : "CREATE TEAM"}
                </button>
                <button type="button" className="lb-btn-ghost" onClick={() => setMode("choose")} disabled={submitting}>
                  ← BACK
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="lb-form-group">
                  <label>INVITE CODE</label>
                  <input 
                    required 
                    autoFocus 
                    value={inviteCode} 
                    onChange={e => setInviteCode(e.target.value.toUpperCase())} 
                    className="lb-input" 
                    placeholder="8-character code"
                    style={{ textTransform: "uppercase", letterSpacing: 2, fontFamily: "monospace" }} 
                  />
                </div>
                <button type="submit" className="lb-btn-primary" disabled={submitting}>
                  {submitting ? "JOINING..." : "JOIN TEAM"}
                </button>
                <button type="button" className="lb-btn-ghost" onClick={() => setMode("choose")} disabled={submitting}>
                  ← BACK
                </button>
              </form>
            )}

          </Brackets>
        </div>
      </section>

      <TesseractFooter context="events" />
    </div>
  );
}
