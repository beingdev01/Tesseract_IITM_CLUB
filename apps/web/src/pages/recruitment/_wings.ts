import type { Accent } from '@/components/tesseract';
import type { CoreRole } from '@/lib/api';

/**
 * Content model for /recruitment — the Roles & Responsibilities page.
 *
 * Each wing maps onto exactly one CoreRole so that "Apply for <wing>" pre-selects
 * a real, submittable value on the core hiring form. Five wings reuse CoreRole
 * values that already existed; GAME_WING and ESCAPE_WING were added for the two
 * that had no equivalent.
 */

export type WingFilter = 'gaming' | 'media' | 'ops';

export interface Wing {
  /** Anchor id used by the "Find Your Wing" navigator. */
  id: string;
  num: string;
  name: string;
  category: string;
  filter: WingFilter;
  icon: string;
  accent: Accent;
  role: CoreRole;
  blurb: string;
  /** Game titles this wing runs — Game Wing only. */
  games?: string[];
  positions: string[];
  duties: string[];
}

export const WING_FILTERS: { value: WingFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'All wings (8)' },
  { value: 'gaming', label: 'Gaming & mind' },
  { value: 'media', label: 'Media & creative' },
  { value: 'ops', label: 'Tech & strategy' },
];

export const WING_CATALOG: Wing[] = [
  {
    id: 'wing-game',
    num: '01',
    name: 'GAME WING',
    category: 'Competitive Esports',
    filter: 'gaming',
    icon: '⚔️',
    accent: 'red',
    role: 'GAME_WING',
    blurb:
      'The Game Wing is at the heart of Tesseract’s competitive esports ecosystem. It is responsible for building communities around individual titles, organizing tournaments, and managing competitive matches.',
    games: ['Free Fire', 'BGMI', 'Valorant', 'CODM', 'Clash of Clans', 'Minecraft', 'PC & Multiplayer'],
    positions: ['Game Head', 'Game Co-Head', 'Game Volunteer'],
    duties: [
      'Organizes online tournaments, leagues, and competitive matches.',
      'Manages players, teams, brackets, and tournament operations.',
      'Develops rules, competitive formats, and tournament structures.',
      'Builds and nurtures communities around individual game titles.',
    ],
  },
  {
    id: 'wing-escape',
    num: '02',
    name: 'ESCAPE WING',
    category: 'Mind Games & Puzzles',
    filter: 'gaming',
    icon: '🧩',
    accent: 'yellow',
    role: 'ESCAPE_WING',
    blurb:
      'The Escape Wing is responsible for Tesseract’s mind games, puzzles, recreational activities, and strategy-based experiences. It goes beyond traditional esports to challenge students to think, solve, and strategize.',
    positions: ['Escape Wing Head', 'Escape Wing Co-Head', 'Escape Wing Volunteer'],
    duties: [
      'Designs and organizes puzzle challenges, riddles, and logical quests.',
      'Develops immersive escape-room-style events and strategy games.',
      'Creates gaming quizzes and runs weekly community game nights.',
      'Experiments with new creative-thinking and recreational formats.',
    ],
  },
  {
    id: 'wing-pr',
    num: '03',
    name: 'PR & OUTREACH WING',
    category: 'Communication & Community',
    filter: 'media',
    icon: '📢',
    accent: 'blue',
    role: 'PR_OUTREACH',
    blurb:
      'The PR & Outreach Wing builds Tesseract’s presence across the BS Program. It drives student participation, coordinates major announcements, and fosters collaborations with other student bodies.',
    positions: ['PR Head', 'PR Co-Head', 'Outreach Executive', 'PR Volunteer'],
    duties: [
      'Promotes Tesseract events and drives student participation.',
      'Builds collaborations with other IIT Madras BS societies and groups.',
      'Coordinates high-impact outreach campaigns and announcements.',
      'Strengthens community relationships and social communication.',
    ],
  },
  {
    id: 'wing-sponsorship',
    num: '04',
    name: 'SPONSORSHIP & RESEARCH',
    category: 'Partnerships & Strategy',
    filter: 'ops',
    icon: '💼',
    accent: 'green',
    role: 'RESEARCH_SPONSORSHIP',
    blurb:
      'The Sponsorship & Research Wing drives strategic growth. It identifies brand sponsors, negotiates partnerships, researches esports industry trends, and supports large-scale tournament planning.',
    positions: ['Sponsorship Head', 'Research Head', 'Sponsorship Executive', 'Research Executive'],
    duties: [
      'Identifies potential sponsors and prepares corporate pitch decks.',
      'Builds and maintains ongoing relationships with industry partners.',
      'Researches esports formats, market opportunities, and gaming trends.',
      'Contributes analytical insights to Tesseract’s long-term roadmap.',
    ],
  },
  {
    id: 'wing-caster',
    num: '05',
    name: 'STREAMER & CASTER WING',
    category: 'Broadcast & Hosting',
    filter: 'media',
    icon: '🎙️',
    accent: 'purple',
    role: 'STREAMER_SPEAKER',
    blurb:
      'The broadcast and live entertainment powerhouse of Tesseract. This wing brings the hype, shoutcasting live matches, hosting analyst desks, and producing high-voltage gaming broadcasts.',
    positions: ['Streaming Head', 'Casting Head', 'Caster / Commentator', 'Stream Host'],
    duties: [
      'Provides live commentary and play-by-play shoutcasting.',
      'Streams tournament matches and hosts interactive audience lobbies.',
      'Moderates tournament analyst desks and on-camera interviews.',
      'No pro experience needed — confidence & passion matter most.',
    ],
  },
  {
    id: 'wing-design',
    num: '06',
    name: 'GRAPHIC DESIGN WING',
    category: 'Visual Identity & Branding',
    filter: 'media',
    icon: '🎨',
    accent: 'red',
    role: 'GRAPHIC_DESIGNER',
    blurb:
      'The Graphic Design Wing shapes Tesseract’s visual language. From tournament posters and stream overlays to social media branding and jerseys, this wing makes Tesseract look world-class.',
    positions: ['Design Head', 'Design Co-Head', 'Graphic Designer', 'Creative Designer'],
    duties: [
      'Creates tournament posters, branding kits, and social media posts.',
      'Designs stream overlays, thumbnails, digital certificates, and assets.',
      'Works with Figma, Photoshop, Illustrator, Canva, or other tools.',
      'Maintains visual consistency across all society platforms.',
    ],
  },
  {
    id: 'wing-video',
    num: '07',
    name: 'VIDEO EDITING WING',
    category: 'Content & Storytelling',
    filter: 'media',
    icon: '🎬',
    accent: 'orange',
    role: 'CONTENT_CREATOR',
    blurb:
      'The Video Editing Wing transforms gaming tournaments, epic plays, and community moments into viral reels, trailers, motion graphics, and cinematic event aftermovies.',
    positions: ['Video Editing Head', 'Video Editing Co-Head', 'Video Editor', 'Motion Graphics Artist'],
    duties: [
      'Edits high-energy tournament highlights and gameplay clips.',
      'Produces viral Instagram reels, promotional videos, and YouTube content.',
      'Crafts cinematic event aftermovies and motion graphics packages.',
      'Tells engaging stories around Tesseract’s community and winners.',
    ],
  },
  {
    id: 'wing-webops',
    num: '08',
    name: 'WEBOPS WING',
    category: 'Digital & Tech Systems',
    filter: 'ops',
    icon: '💻',
    accent: 'blue',
    role: 'TECHNICAL_WEBOPS',
    blurb:
      'The WebOps Wing powers Tesseract’s digital infrastructure. It builds and maintains the official website, custom tournament microsites, automated registration engines, and internal community tools.',
    positions: ['WebOps Head', 'WebOps Co-Head', 'Frontend / Backend Dev', 'UI/UX Designer'],
    duties: [
      'Builds and maintains the official Tesseract website (tesseractiitm.in).',
      'Develops event registration portals and tournament microsites.',
      'Builds automation bots, Discord integrations, and internal society tools.',
      'Open to frontend, backend, fullstack, UI/UX, or automation enthusiasts.',
    ],
  },
];

/** The three domains Tesseract operates across. */
export const DOMAINS: { icon: string; title: string; accent: Accent; body: string; tags: string[] }[] = [
  {
    icon: '🎮',
    title: 'Competitive Esports',
    accent: 'red',
    body:
      'Competitive gaming across major multiplayer titles such as Free Fire, BGMI, Valorant, Call of Duty: Mobile, Clash of Clans, Minecraft, and other competitive PC/mobile titles.',
    tags: ['Valorant', 'BGMI', 'Free Fire', 'CODM', 'COC'],
  },
  {
    icon: '🕹️',
    title: 'Casual & Social Gaming',
    accent: 'blue',
    body:
      'Fun and engaging games designed for recreation, social interaction, and high participation. Community game nights, friendly scrims, and lighthearted competitions.',
    tags: ['Skribbl', 'Among Us', 'Smash Karts', 'Subway Surfers', 'GeoGuessr'],
  },
  {
    icon: '🧩',
    title: 'Mind Games & Strategy',
    accent: 'yellow',
    body:
      'Puzzles, riddles, logical challenges, escape-room-style events, gaming quizzes, and strategy competitions that challenge participants to think, solve, and outsmart.',
    tags: ['Escape Rooms', 'Logic Puzzles', 'Riddles', 'Gaming Quizzes', 'Tactical Games'],
  },
];

/** "You don't have to be an expert" cards. */
export const EXPERTISE_TRACKS: { accent: Accent; title: string; body: string }[] = [
  {
    accent: 'red',
    title: 'Have the skills?',
    body: 'Step into leadership as a Wing Head or Co-Head and run major initiatives.',
  },
  {
    accent: 'blue',
    title: 'Starting out?',
    body: 'Join as a Volunteer or Executive, learn from peers, and build real projects.',
  },
  {
    accent: 'yellow',
    title: 'Have an event idea?',
    body: 'Pitch it, take ownership, and we will help you bring it to life across the BS community.',
  },
];

/** Quick-jump tiles for the "Find Your Wing" navigator. */
export const WING_NAVIGATOR: { icon: string; label: string; target: string; accent: Accent }[] =
  [
    { icon: '🎮', label: 'Competitive Gaming', target: 'wing-game', accent: 'red' },
    { icon: '🧩', label: 'Puzzles & Strategy', target: 'wing-escape', accent: 'yellow' },
    { icon: '📣', label: 'PR & Outreach', target: 'wing-pr', accent: 'blue' },
    { icon: '🤝', label: 'Sponsorships', target: 'wing-sponsorship', accent: 'green' },
    { icon: '🎙️', label: 'Casting & Streaming', target: 'wing-caster', accent: 'purple' },
    { icon: '🎨', label: 'Graphic Design', target: 'wing-design', accent: 'red' },
    { icon: '🎬', label: 'Video Editing', target: 'wing-video', accent: 'orange' },
    { icon: '💻', label: 'Web & Tech Ops', target: 'wing-webops', accent: 'blue' },
  ];

/** Fallback used only when Settings has no WhatsApp community URL configured. */
export const FALLBACK_WHATSAPP_URL = 'https://chat.whatsapp.com/LRgZ03jPCJLAfKt5Nl3G7H';
