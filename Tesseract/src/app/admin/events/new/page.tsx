"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { eventsApi } from "@/lib/api/services";

export default function NewEventPage() {
  const router = useRouter();
  const { user, isHydrated, initialRefreshDone } = useAuthStore();
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("hackathon");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [xpReward, setXpReward] = useState("100");
  
  // Rich content
  const [agenda, setAgenda] = useState("");
  const [highlights, setHighlights] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  
  // Registration & Teams
  const [teamRegistration, setTeamRegistration] = useState(false);
  const [teamMinSize, setTeamMinSize] = useState("1");
  const [teamMaxSize, setTeamMaxSize] = useState("4");
  const [allowLateRegistration, setAllowLateRegistration] = useState(false);

  useEffect(() => {
    if (!isHydrated || !initialRefreshDone) return;
    if (!user || user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isHydrated, initialRefreshDone, user, router]);

  if (!isHydrated || !initialRefreshDone || !user || user.role !== "admin") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        shortDescription: shortDescription || undefined,
        category: category as any,
        location,
        capacity: parseInt(capacity) || 0,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        xpReward: parseInt(xpReward) || 0,
        agenda: agenda || undefined,
        highlights: highlights || undefined,
        learningOutcomes: learningOutcomes || undefined,
        prerequisites: prerequisites || undefined,
        targetAudience: targetAudience || undefined,
        teamRegistration,
        teamMinSize: parseInt(teamMinSize) || 1,
        teamMaxSize: parseInt(teamMaxSize) || 4,
        allowLateRegistration
      };
      
      const evt = await eventsApi.create(payload);
      toast.success("Event created successfully");
      router.push(`/events/${evt.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lb-root admin-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline="// core.panel · new event"
        active="core"
        cta={<MeChip accent="red" />}
      />

      <section className="admin-main" style={{ padding: "40px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              
              {/* SECTION 1: BASIC INFO */}
              <Brackets tag="module.basic_info" accent="red">
                <div style={{ padding: "10px 0" }}>
                  <h2 className="dash-h">CORE IDENTITY</h2>
                  <p className="lb-sub" style={{ marginBottom: 24 }}>The fundamental details of your event.</p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div className="lb-form-group">
                      <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>EVENT TITLE</label>
                      <input required value={title} onChange={e => setTitle(e.target.value)} className="lb-input" placeholder="e.g., Code in the Dark" style={{ fontSize: 18 }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>CATEGORY</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="lb-input" style={{ appearance: "auto" }}>
                          <option value="hackathon">⚡ HACKATHON</option>
                          <option value="quiz">? QUIZ</option>
                          <option value="meetup">◉ MEETUP</option>
                          <option value="workshop">⊞ WORKSHOP</option>
                          <option value="tournament">▶ TOURNAMENT</option>
                          <option value="social">◈ SOCIAL</option>
                        </select>
                      </div>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>SHORT DESCRIPTION (CARD PREVIEW)</label>
                        <textarea required value={shortDescription} onChange={e => setShortDescription(e.target.value)} className="lb-input" rows={2} placeholder="Brief 1-2 sentence hook" />
                      </div>
                    </div>
                  </div>
                </div>
              </Brackets>

              {/* SECTION 2: LOGISTICS */}
              <Brackets tag="module.logistics" accent="yellow">
                <div style={{ padding: "10px 0" }}>
                  <h2 className="dash-h">LOGISTICS & CAPACITY</h2>
                  <p className="lb-sub" style={{ marginBottom: 24 }}>When, where, and how many people.</p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div className="lb-form-group">
                      <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>LOCATION / VENUE</label>
                      <input required value={location} onChange={e => setLocation(e.target.value)} className="lb-input" placeholder="e.g., Room 101 or Google Meet link" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>STARTS AT (IST)</label>
                        <input required type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="lb-input" />
                      </div>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>ENDS AT (IST)</label>
                        <input required type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="lb-input" />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>CAPACITY</label>
                        <input required type="number" min="0" value={capacity} onChange={e => setCapacity(e.target.value)} className="lb-input" />
                        <span style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Set to 0 for unlimited entries.</span>
                      </div>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>XP REWARD</label>
                        <input required type="number" min="0" value={xpReward} onChange={e => setXpReward(e.target.value)} className="lb-input" />
                        <span style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Points awarded for attendance.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Brackets>

              {/* SECTION 3: RICH CONTENT */}
              <Brackets tag="module.content" accent="purple">
                <div style={{ padding: "10px 0" }}>
                  <h2 className="dash-h">RICH CONTENT (HTML SUPPORTED)</h2>
                  <p className="lb-sub" style={{ marginBottom: 24 }}>The detailed page content. You can use HTML tags like &lt;b&gt;, &lt;ul&gt;, and &lt;a&gt;.</p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div className="lb-form-group">
                      <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>FULL DESCRIPTION</label>
                      <textarea required value={description} onChange={e => setDescription(e.target.value)} className="lb-input" rows={6} placeholder="<p>Full event details here...</p>" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>AGENDA</label>
                        <textarea value={agenda} onChange={e => setAgenda(e.target.value)} className="lb-input" rows={4} placeholder="<ul><li>10:00 AM - Intro</li></ul>" />
                      </div>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>HIGHLIGHTS</label>
                        <textarea value={highlights} onChange={e => setHighlights(e.target.value)} className="lb-input" rows={4} placeholder="<ul><li>Guest speakers</li></ul>" />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>LEARNING OUTCOMES</label>
                        <textarea value={learningOutcomes} onChange={e => setLearningOutcomes(e.target.value)} className="lb-input" rows={3} />
                      </div>
                      <div className="lb-form-group">
                        <label style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>TARGET AUDIENCE & PREREQUISITES</label>
                        <textarea value={prerequisites} onChange={e => setPrerequisites(e.target.value)} className="lb-input" rows={3} placeholder="Who is this for? Any prior knowledge needed?" />
                      </div>
                    </div>
                  </div>
                </div>
              </Brackets>

              {/* SECTION 4: REGISTRATION & TEAMS */}
              <Brackets tag="module.registration" accent="green">
                <div style={{ padding: "10px 0" }}>
                  <h2 className="dash-h">REGISTRATION & TEAMS</h2>
                  <p className="lb-sub" style={{ marginBottom: 24 }}>Rules for how users sign up for this event.</p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div className="lb-form-group" style={{ flexDirection: "row", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)" }}>
                      <input type="checkbox" checked={allowLateRegistration} onChange={e => setAllowLateRegistration(e.target.checked)} id="lateReg" style={{ width: 20, height: 20, accentColor: "var(--acc)" }} />
                      <label htmlFor="lateReg" style={{ margin: 0, color: "#fff", cursor: "pointer" }}>
                        <div style={{ fontSize: 16, fontWeight: "bold" }}>Allow Late Registration</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Let users RSVP even after the event has already started.</div>
                      </label>
                    </div>

                    <div className="lb-form-group" style={{ flexDirection: "row", alignItems: "center", gap: 12, background: teamRegistration ? "rgba(0,255,0,0.05)" : "rgba(0,0,0,0.3)", padding: 16, borderRadius: 4, border: `1px solid ${teamRegistration ? "rgba(0,255,0,0.2)" : "rgba(255,255,255,0.1)"}` }}>
                      <input type="checkbox" checked={teamRegistration} onChange={e => setTeamRegistration(e.target.checked)} id="teamReg" style={{ width: 20, height: 20, accentColor: "var(--acc)" }} />
                      <label htmlFor="teamReg" style={{ margin: 0, color: "#fff", cursor: "pointer" }}>
                        <div style={{ fontSize: 16, fontWeight: "bold" }}>Require Team Registration</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Users will need to create or join a team to participate.</div>
                      </label>
                    </div>

                    {teamRegistration && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 10 }}>
                        <div className="lb-form-group">
                          <label style={{ color: "#0f0", fontSize: 14, letterSpacing: 1 }}>MINIMUM TEAM SIZE</label>
                          <input type="number" min="1" value={teamMinSize} onChange={e => setTeamMinSize(e.target.value)} className="lb-input" style={{ borderColor: "rgba(0,255,0,0.3)" }} />
                        </div>
                        <div className="lb-form-group">
                          <label style={{ color: "#0f0", fontSize: 14, letterSpacing: 1 }}>MAXIMUM TEAM SIZE</label>
                          <input type="number" min="1" value={teamMaxSize} onChange={e => setTeamMaxSize(e.target.value)} className="lb-input" style={{ borderColor: "rgba(0,255,0,0.3)" }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Brackets>

              {/* ACTION BUTTONS */}
              <div style={{ display: "flex", gap: 16, padding: "20px 0" }}>
                <button type="submit" className="lb-btn-primary lb-btn-lg" style={{ flex: 1 }} disabled={saving}>
                  {saving ? "CREATING..." : "▶ LAUNCH EVENT"}
                </button>
                <button type="button" className="lb-btn-ghost lb-btn-lg" onClick={() => router.back()} disabled={saving}>
                  CANCEL
                </button>
              </div>

            </form>
          </div>
        </div>
      </section>

      <TesseractFooter context="admin" />
    </div>
  );
}
