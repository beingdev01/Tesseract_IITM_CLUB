import type { Metadata } from "next";
import { Inter, Orbitron, JetBrains_Mono, Audiowide } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});
const audiowide = Audiowide({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-audiowide",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tesseract — Play. Pause. Belong.",
  description:
    "A student-built community for IITM BS. Mini-games, movie nights, esports ladders, and the people who make assignments bearable.",
  keywords: [
    "IIT Madras BS",
    "Tesseract",
    "student platform",
    "leaderboard",
    "events",
    "community",
  ],
  openGraph: {
    title: "Tesseract — Play. Pause. Belong.",
    description:
      "A closed community ecosystem for IITM BS students. Events, games, leaderboards.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${orbitron.variable} ${jetbrains.variable} ${audiowide.variable}`}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
