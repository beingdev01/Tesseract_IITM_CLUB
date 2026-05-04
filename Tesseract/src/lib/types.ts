export type Role = "guest" | "member" | "core" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  membershipStatus?: "none" | "pending" | "approved" | "rejected";
  membershipRequestedAt?: string;
  rollNumber?: string;
  level?: string;
  joinedAt: string;
  xp: number;
  rank?: number;
  streak?: number;
  bio?: string;
  badges?: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  earnedAt?: string;
}

export type EventStatus = "upcoming" | "live" | "completed";
export type EventCategory =
  | "hackathon"
  | "quiz"
  | "meetup"
  | "workshop"
  | "tournament"
  | "social";

export interface TesseractEvent {
  id: string;
  title: string;
  description: string;
  cover?: string;
  category: EventCategory;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  registered: number;
  participants_count?: number;
  xpReward: number;
  organizers: string[];
  tags: string[];
  is_user_joined?: boolean;
  slug?: string | null;
  shortDescription?: string | null;
  agenda?: string | null;
  highlights?: string | null;
  learningOutcomes?: string | null;
  targetAudience?: string | null;
  prerequisites?: string | null;
  speakers?: unknown[];
  resources?: unknown[];
  faqs?: unknown[];
  imageGallery?: string[];
  videoUrl?: string | null;
  venue?: string | null;
  eventType?: string | null;
  featured?: boolean;
  allowLateRegistration?: boolean;
  eventDays?: number;
  dayLabels?: string[];
  registrationFields?: unknown[];
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  teamRegistration?: boolean;
  teamMinSize?: number;
  teamMaxSize?: number;
  spotsRemaining?: number | null;
  registrationStatus?: "not_started" | "open" | "closed" | "full" | "ended";
}

export type GameDifficulty = "easy" | "medium" | "hard" | "nightmare";

export interface Game {
  id: string;
  name: string;
  tagline: string;
  cover?: string;
  emoji: string;
  category: string;
  difficulty: GameDifficulty;
  playersOnline: number;
  highScore: number;
  bestPlayer?: string;
  description: string;
  howToPlay: string[];
  rules: string[];
  xpReward: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  level: string;
  delta: number;
  badge?: string;
}

export interface Activity {
  id: string;
  type: "event_join" | "game_played" | "badge_earned" | "level_up" | "post";
  title: string;
  description?: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  kind: "info" | "success" | "warning" | "event" | "game";
}

export interface DashboardStats {
  eventsJoined: number;
  gamesPlayed: number;
  totalXP: number;
  streak: number;
  rank: number;
  weeklyXP: { day: string; xp: number }[];
}

export interface PublicDashboardSummary {
  totalUsers: number;
  totalGames: number;
  activeEvents: number;
  liveGames: {
    id: string;
    name: string;
    emoji: string;
    playersOnline: number;
  }[];
  topPlayers: Pick<LeaderboardEntry, "rank" | "userId" | "name" | "avatar" | "xp" | "level" | "badge">[];
}

export interface AdminAnalytics {
  dau: number;
  wau: number;
  mau: number;
  events: number;
  games: number;
  liveNow: number;
  engagement: { label: string; value: number }[];
  funnel: { stage: string; count: number }[];
}

export interface AdminAuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  note?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: number;
  pinned: boolean;
  publishedAt: string;
}
