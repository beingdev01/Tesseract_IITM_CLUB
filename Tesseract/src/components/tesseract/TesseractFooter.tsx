import Link from "next/link";

type FooterContext =
  | "platform"
  | "dashboard"
  | "games"
  | "events"
  | "ranks"
  | "admin"
  | "auth"
  | "profile";

const META: Record<FooterContext, [string, string, [string, string]]> = {
  platform: ["v1.0.0", "last_deploy · 26.04.26", ["status · ", "operational"]],
  dashboard: [
    "// session.id · 0x7c4a",
    "last_sync · 14:02",
    ["status · ", "connected"],
  ],
  games: [
    "// 18 games · 4 categories",
    "last_added · cipher_lab",
    ["status · ", "all systems go"],
  ],
  events: ["// 5 upcoming · 23 past", "tz · IST", ["status · ", "live"]],
  ranks: [
    "// 1,247 ranked members",
    "last_refresh · 14:02:31",
    ["status · ", "live"],
  ],
  admin: [
    "// admin.session · 0xb91e",
    "privileges · full",
    ["status · ", "authenticated"],
  ],
  auth: ["// gate.v1", "domains · 2 allowed", ["status · ", "secure"]],
  profile: [
    "// member.profile",
    "last_active · 14:02",
    ["status · ", "online"],
  ],
};

export function TesseractFooter({
  context = "platform",
}: {
  context?: FooterContext;
}) {
  const meta = META[context] ?? META.platform;

  return (
    <footer className="tf-root">
      <div className="tf-corner tf-c-tl" />
      <div className="tf-corner tf-c-tr" />

      <div className="tf-main">
        <div className="tf-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="tf-logo" />
          <div className="tf-brand-text">
            <div className="tf-wordmark">TESSERACT</div>
            <div className="tf-tag">{"// a student-built corner of IITM BS"}</div>
            <div className="tf-blurb">
              skip the lecture loop. play, pause, belong.
            </div>
          </div>
        </div>

        <div className="tf-cols">
          <div className="tf-col">
            <h4>PLATFORM</h4>
            <Link href="/">Home</Link>
            <Link href="/games">Games</Link>
            <Link href="/events">Events</Link>
            <Link href="/leaderboard">Leaderboard</Link>
          </div>
          <div className="tf-col">
            <h4>COMMUNITY</h4>
            <a>Discord</a>
            <a>Instagram</a>
            <a>GitHub</a>
            <a>Code of conduct</a>
          </div>
          <div className="tf-col">
            <h4>CORE</h4>
            <a>About</a>
            <a>Team</a>
            <a>Contact</a>
            <a>Submit a game</a>
          </div>
          <div className="tf-col">
            <h4>ACCESS</h4>
            <div className="tf-domain">@ds.study.iitm.ac.in</div>
            <div className="tf-domain">@es.study.iitm.ac.in</div>
            <div className="tf-domain tf-deny">external · denied</div>
          </div>
        </div>
      </div>

      <div className="tf-strip">
        <div className="tf-strip-meta">
          <span>{meta[0]}</span>
          <span>·</span>
          <span>{meta[1]}</span>
          <span>·</span>
          <span>
            {meta[2][0]}
            <span className="lb-green">{meta[2][1]}</span>
          </span>
        </div>
        <div className="tf-legal">
          © 2026 Tesseract · built by students, for students
        </div>
      </div>
    </footer>
  );
}
