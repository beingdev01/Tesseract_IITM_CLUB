import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="relative mt-20 border-t border-white/5 bg-ink-950/60 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-white/60">
            Tesseract is the gamified community for IIT Madras BS students.
            Play, compete, and belong — all in one closed ecosystem.
          </p>
        </div>
        <div>
          <p className="font-display text-xs uppercase tracking-widest text-white/60">
            Platform
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/events" className="text-white/70 hover:text-white">Events</Link></li>
            <li><Link href="/games" className="text-white/70 hover:text-white">Games</Link></li>
            <li><Link href="/leaderboard" className="text-white/70 hover:text-white">Leaderboard</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-display text-xs uppercase tracking-widest text-white/60">
            Community
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/auth" className="text-white/70 hover:text-white">Join</Link></li>
            <li><span className="text-white/70">Discord</span></li>
            <li><span className="text-white/70">Code of conduct</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 px-6 py-5 text-center text-xs text-white/50">
        Built for IITM BS — by students, for students. © {new Date().getFullYear()} Tesseract.
      </div>
    </footer>
  );
}
