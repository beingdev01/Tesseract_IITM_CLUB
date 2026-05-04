"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractHero } from "@/components/tesseract/TesseractHero";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { useAuthStore } from "@/store/authStore";
import { membersApi } from "@/lib/api/services";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "small" | "medium" | "large";
              width?: number;
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              type?: "standard" | "icon";
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const { user, isHydrated, login, signup, googleLogin, loading } = useAuthStore();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postLoginPrompt, setPostLoginPrompt] = useState(false);
  const [memberNote, setMemberNote] = useState("");
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const handlingLoginRef = useRef(false);

  useEffect(() => {
    if (isHydrated && user && !postLoginPrompt && !handlingLoginRef.current) {
      router.replace("/dashboard");
    }
  }, [isHydrated, user, postLoginPrompt, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefill = sessionStorage.getItem("tesseract.prefill_email");
    if (prefill) {
      setEmail(prefill);
      sessionStorage.removeItem("tesseract.prefill_email");
    }
  }, []);

  // Initialise Google Identity Services once the script loads
  useEffect(() => {
    if (!googleReady || !GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        handlingLoginRef.current = true;
        try {
          const u = await googleLogin(response.credential);
          if (u.role === "guest") {
            setPostLoginPrompt(true);
          } else {
            toast.success(`Welcome, ${u.name}!`);
            router.replace("/dashboard");
          }
        } catch (e) {
          toast.error((e as { message?: string })?.message ?? "Google sign-in failed");
        } finally {
          handlingLoginRef.current = false;
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    if (googleButtonRef.current) {
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        text: mode === "signup" ? "signup_with" : "continue_with",
        shape: "rectangular",
        width: 320,
      });
    }
  }, [googleReady, mode, googleLogin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    handlingLoginRef.current = true;
    try {
      if (mode === "signin") {
        const u = await login(email, password);
        if (u.role === "guest") setPostLoginPrompt(true);
        else {
          toast.success(`Welcome back, ${u.name}!`);
          router.replace("/dashboard");
        }
      } else {
        const u = await signup(email, password, name || undefined);
        toast.success("Account created!");
        if (u.role === "guest") setPostLoginPrompt(true);
        else router.replace("/dashboard");
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Authentication failed");
    } finally {
      setSubmitting(false);
      handlingLoginRef.current = false;
    }
  };

  const handleMembershipRequest = async () => {
    setMemberSubmitting(true);
    try {
      await membersApi.request(memberNote || undefined);
      toast.success("Membership request submitted!");
      router.replace("/dashboard");
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "Could not submit request";
      if (msg.includes("already") || msg.includes("pending")) {
        router.replace("/dashboard");
      } else {
        toast.error(msg);
      }
    } finally {
      setMemberSubmitting(false);
    }
  };

  const isMembershipStep = postLoginPrompt && user?.role === "guest";

  return (
    <div className="lb-root auth-root">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleReady(true)}
      />

      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <nav className="lb-nav">
        <Link href="/" className="lb-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Tesseract" className="lb-logo" />
          <div>
            <div className="lb-wordmark">TESSERACT</div>
            <div className="lb-wordmark-sub">{"// auth.gate"}</div>
          </div>
        </Link>
        <div className="lb-nav-cta">
          <Link href="/" className="lb-btn-ghost">
            ← back to landing
          </Link>
        </div>
      </nav>

      <section className="auth-shell">
        <div className="auth-left">
          <TesseractHero
            size={360}
            speed={0.7}
            glow
            palette={["#ff3b3b", "#ffb73b", "#ffd93b", "#5eff7a", "#3bb0ff", "#a855f7"]}
          />
          <div className="auth-quote">
            <div>&ldquo;don&apos;t build pages.</div>
            <div>build an experience.&rdquo;</div>
            <div className="auth-quote-sig">— tesseract manifesto</div>
          </div>
        </div>

        <div className="auth-right">
          {!isMembershipStep ? (
            <>
              <div className="auth-progress">
                <button
                  className={`auth-step-pill ${mode === "signin" ? "active" : ""}`}
                  onClick={() => setMode("signin")}
                  type="button"
                >
                  <span>01</span> sign in
                </button>
                <button
                  className={`auth-step-pill ${mode === "signup" ? "active" : ""}`}
                  onClick={() => setMode("signup")}
                  type="button"
                >
                  <span>02</span> create account
                </button>
              </div>

              <Brackets
                tag={mode === "signin" ? "auth · sign in" : "auth · sign up"}
                accent={mode === "signin" ? "green" : "purple"}
              >
                <div className="auth-card">
                  <h2 className="auth-h">
                    {mode === "signin"
                      ? "WELCOME BACK"
                      : "CREATE YOUR TESSERACT ACCOUNT"}
                  </h2>
                  <p className="auth-p">
                    {mode === "signin"
                      ? "Use your IITM email + password, or continue with Google."
                      : "Only @ds.study.iitm.ac.in and @es.study.iitm.ac.in emails are accepted."}
                  </p>

                  {/* Google Sign-In Button */}
                  {GOOGLE_CLIENT_ID ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        margin: "12px 0 18px",
                      }}
                    >
                      <div ref={googleButtonRef} />
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "10px 14px",
                        marginBottom: 16,
                        border: "1px dashed rgba(255,255,255,0.18)",
                        color: "#888",
                        fontSize: 12,
                        fontFamily: "var(--font-jetbrains)",
                        textAlign: "center",
                      }}
                    >
                      {"// Google sign-in: set NEXT_PUBLIC_GOOGLE_CLIENT_ID"}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      margin: "8px 0 16px",
                      color: "#666",
                      fontSize: 11,
                      fontFamily: "var(--font-jetbrains)",
                      letterSpacing: 1.4,
                    }}
                  >
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    <span>OR WITH PASSWORD</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  </div>

                  <form onSubmit={handleSubmit} className="auth-form-grid" style={{ display: "grid", gap: 12 }}>
                    {mode === "signup" && (
                      <label>
                        NAME (optional)
                        <input
                          className="lb-input auth-input"
                          placeholder="how should we display you?"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                        />
                      </label>
                    )}
                    <label>
                      EMAIL
                      <input
                        className="lb-input auth-input"
                        placeholder="you@ds.study.iitm.ac.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        autoComplete="email"
                        required
                      />
                    </label>
                    <label>
                      PASSWORD
                      <div style={{ position: "relative" }}>
                        <input
                          className="lb-input auth-input"
                          placeholder={mode === "signup" ? "min 8 characters" : "your password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          type={showPassword ? "text" : "password"}
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                          minLength={mode === "signup" ? 8 : 1}
                          required
                          style={{ paddingRight: 52 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "transparent",
                            border: "none",
                            color: "#888",
                            fontSize: 11,
                            fontFamily: "var(--font-jetbrains)",
                            cursor: "pointer",
                            padding: "4px 8px",
                          }}
                        >
                          {showPassword ? "HIDE" : "SHOW"}
                        </button>
                      </div>
                    </label>

                    <button
                      type="submit"
                      className="lb-btn-primary lb-btn-lg auth-cta"
                      disabled={submitting || loading}
                    >
                      {submitting || loading
                        ? mode === "signin"
                          ? "SIGNING IN…"
                          : "CREATING…"
                        : mode === "signin"
                        ? "SIGN IN ✓"
                        : "CREATE ACCOUNT ▶"}
                    </button>
                  </form>

                  <div
                    style={{
                      marginTop: 14,
                      textAlign: "center",
                      fontSize: 12,
                      color: "#888",
                      fontFamily: "var(--font-jetbrains)",
                    }}
                  >
                    {mode === "signin" ? (
                      <>
                        no account?{" "}
                        <a
                          onClick={() => setMode("signup")}
                          style={{ color: "var(--acc, #ffd93b)", cursor: "pointer", textDecoration: "underline" }}
                        >
                          create one
                        </a>
                      </>
                    ) : (
                      <>
                        already have an account?{" "}
                        <a
                          onClick={() => setMode("signin")}
                          style={{ color: "var(--acc, #ffd93b)", cursor: "pointer", textDecoration: "underline" }}
                        >
                          sign in
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </Brackets>
            </>
          ) : (
            <Brackets tag="step · membership" accent="purple">
              <div className="auth-card">
                <div className="auth-success-pill">
                  <span /> SIGNED IN AS GUEST
                </div>
                <h2 className="auth-h">REQUEST MEMBERSHIP</h2>
                <p className="auth-p">
                  You&apos;re in! To unlock games, RSVP, and the leaderboard,
                  request membership approval from a core admin.
                </p>
                <div className="auth-form-grid">
                  <label style={{ gridColumn: "1 / -1" }}>
                    NOTE (optional)
                    <input
                      className="lb-input auth-input"
                      placeholder="Why do you want to join? (optional)"
                      value={memberNote}
                      onChange={(e) => setMemberNote(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="lb-btn-primary lb-btn-lg auth-cta"
                  onClick={handleMembershipRequest}
                  disabled={memberSubmitting}
                >
                  {memberSubmitting ? "SUBMITTING…" : "REQUEST MEMBERSHIP ▶"}
                </button>
                <button
                  className="lb-btn-ghost lb-btn-lg auth-cta"
                  onClick={() => router.replace("/dashboard")}
                  style={{ marginTop: 8 }}
                >
                  SKIP FOR NOW →
                </button>
              </div>
            </Brackets>
          )}

          <div className="auth-foot">
            <div className="auth-foot-row">
              <span>access</span>
              <b className="lb-green">closed · IITM only</b>
            </div>
            <div className="auth-foot-row">
              <span>methods</span>
              <b>password · google oauth</b>
            </div>
            <div className="auth-foot-row">
              <span>data</span>
              <b>email + name only</b>
            </div>
          </div>
        </div>
      </section>

      <TesseractFooter context="auth" />
    </div>
  );
}
