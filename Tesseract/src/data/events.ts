export type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";

export type Event = {
  slug: string;
  date: string;
  time: string;
  t: string;
  tag: string;
  c: Color;
  going: number;
  d: string;
  host: string;
  glyph: string;
  fullDesc: string;
  rules?: string[];
  where: string;
  rsvps: Color[];
};

export const EVENTS: Event[] = [
  {
    slug: "movie-night-03",
    date: "26 APR",
    time: "21:00",
    t: "MOVIE NIGHT_03",
    tag: "watch_party",
    c: "red",
    going: 38,
    d: "Spider-verse · Discord stage · BYO snacks",
    host: "core.team",
    glyph: "▶",
    where: "discord.stage",
    fullDesc:
      "Bring your favorite snack and bad takes. We sync-watch on Discord stage, with a side-channel for live commentary. Hosted by core.team. No spoilers in the main channel — the spoiler thread is for the brave. We sync at 21:05 sharp. Late joiners get the shame mention.",
    rsvps: ["red", "yellow", "green", "blue", "purple", "yellow"],
  },
  {
    slug: "sunday-cup",
    date: "27 APR",
    time: "20:00",
    t: "SUNDAY CUP",
    tag: "tournament",
    c: "yellow",
    going: 24,
    d: "Smash Kart · 4 rounds · single elim · prize: bragging rights",
    host: "neon.kairos",
    glyph: "⚡",
    where: "tesseract.live",
    fullDesc:
      "The weekly Smash Kart tournament returns. 4 rounds, single elimination. 24 slots — first RSVP, first served. Host: neon.kairos. Casters will be live in the Discord stage. Prize pool: bragging rights + the winner's handle in the Discord topic for the week. Prize pool may grow if sponsors materialize.",
    rules: [
      "Single elimination, 4 rounds.",
      "Each match: best of 3 races on random track.",
      "Lag-outs: host discretion — screenshot your connection quality.",
      "Sign-up closes 30 min before start. No walkups.",
      "Disputes go to DM with host. Host decision is final.",
    ],
    rsvps: ["yellow", "red", "blue", "purple", "green"],
  },
  {
    slug: "riddle-night",
    date: "30 APR",
    time: "19:30",
    t: "RIDDLE NIGHT",
    tag: "live_solve",
    c: "green",
    going: 17,
    d: "Cooperative riddles · audio room · 12 puzzles",
    host: "punchcard",
    glyph: "?",
    where: "discord.audio",
    fullDesc:
      "Cooperative riddle-solving session. 12 puzzles, increasing difficulty. Work together in the audio room — shouting at each other is part of the experience. Hosted by punchcard. No prep needed. Just show up with your brain. Hints are allowed but they cost you a point in the live poll.",
    rsvps: ["green", "blue", "red", "yellow"],
  },
  {
    slug: "play-night-07",
    date: "02 MAY",
    time: "21:30",
    t: "PLAY NIGHT_07",
    tag: "open",
    c: "blue",
    going: 52,
    d: "Chaos lobbies all night · scribbl, kart, type wars",
    host: "core.team",
    glyph: "◈",
    where: "tesseract.live",
    fullDesc:
      "Open play night. No structure, no bracket — just chaos lobbies. We rotate between Scribbl, Smash Kart, and Type Wars based on vibes. Hosted by core.team with mods running lobbies. Show up any time between 21:30 and 01:00. Biggest event of the month. 50+ usually attend.",
    rsvps: ["blue", "red", "yellow", "green", "purple", "red", "blue"],
  },
  {
    slug: "cipher-cup",
    date: "05 MAY",
    time: "20:00",
    t: "CIPHER CUP",
    tag: "ranked",
    c: "purple",
    going: 11,
    d: "First seasonal cipher tournament · top 8 advance",
    host: "midnight.tea",
    glyph: "⌘",
    where: "tesseract.live",
    fullDesc:
      "The first seasonal Cipher Lab tournament. Open qualifiers for all members — solve the qualifier set to earn a seeded spot. Top 8 from qualifiers advance to the live bracket, streamed on Discord. Hosted by midnight.tea. This one matters: winner gets the Cipher Cup badge permanently on their profile.",
    rules: [
      "Qualifier: 3 ciphers, 20 min window. Top 8 scores advance.",
      "Live bracket: best of 3 ciphers per match, 10 min each.",
      "No hints allowed in the bracket rounds.",
      "Ties broken by total solve time across the set.",
      "Badge awarded to winner at end of stream.",
    ],
    rsvps: ["purple", "blue", "red", "yellow"],
  },
];

export function getEventBySlug(slug: string): Event | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
