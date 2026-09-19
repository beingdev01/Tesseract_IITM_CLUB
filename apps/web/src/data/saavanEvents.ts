export interface SaavanEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  status: 'UPCOMING' | 'ONGOING' | 'PAST';
  startDate: string;
  endDate: string;
  location: string;
  venue: string;
  eventType: string;
  capacity: number | null;
  imageUrl: string;
  registrationUrl: string;
  teamRegistration: boolean;
  teamMinSize: number;
  teamMaxSize: number;
  eventDays: number;
  dayLabels: string[];
  featured: boolean;
  prizes: string;
  rulebookUrl: string;
  prerequisites: string;
  learningOutcomes: string;
  targetAudience: string;
}

export const SAAVAN_EVENTS: SaavanEvent[] = [
  {
    id: 'escape-room-saavan-26',
    title: 'Escape Room - Saavan\'26',
    slug: 'escape-room-saavan-26',
    description: `**Escape Room** is a multi-round challenge that takes participants through a series of puzzles, clues, and unexpected tasks designed to test their logic, observation, creativity, and ability to think outside the box. Starting with a diverse set of challenges, participants will progress through increasingly challenging stages, where every clue can lead them closer to the next step. With hidden hints, twists, and time-based challenges along the way, the experience is designed to keep participants engaged and constantly thinking.

**Event Dates:** 25 Sep – 27 Sep 2026  
**Venue:** Google Forms / Google Meet  
**Prize Pool:** ₹6,750  
**Registration:** [https://saavan.iitmparadox.org/events/sports/escape-room](https://saavan.iitmparadox.org/events/sports/escape-room)

**Rulebook:** [View Rulebook](https://docs.google.com/document/d/e/2PACX-1vSuz6q0P5LD5Qrd_f-xddqI0kq1VrktV4SYZ6uBhDoCx67AyXS_W4_MmeRS4ClGTPjXVn5NKfGKpOa1/pub)`,
    shortDescription: 'Multi-round puzzle challenge testing logic, observation & creativity through hidden clues & time-based tasks. Progressive difficulty keeps you engaged.',
    status: 'UPCOMING',
    startDate: '2026-09-25T00:00:00.000Z',
    endDate: '2026-09-27T23:59:00.000Z',
    location: 'Online',
    venue: 'Google Forms / Google Meet',
    eventType: 'Puzzle & Mind Games',
    capacity: null,
    imageUrl: 'https://drive.google.com/uc?export=view&id=11e3UjcO6IicQ9kT3BIE5UvVsqeFlJt8a',
    registrationUrl: 'https://saavan.iitmparadox.org/events/sports/escape-room',
    teamRegistration: false,
    teamMinSize: 1,
    teamMaxSize: 1,
    eventDays: 3,
    dayLabels: ['Day 1', 'Day 2', 'Day 3'],
    featured: false,
    prizes: '₹6,750',
    rulebookUrl: 'https://docs.google.com/document/d/e/2PACX-1vSuz6q0P5LD5Qrd_f-xddqI0kq1VrktV4SYZ6uBhDoCx67AyXS_W4_MmeRS4ClGTPjXVn5NKfGKpOa1/pub',
    prerequisites: 'A device with internet access. No prior experience needed.',
    learningOutcomes: 'Improve logical reasoning, pattern recognition, creative problem-solving, and teamwork under time pressure.',
    targetAudience: 'All IITM BS students who love puzzles and mind games',
  },
  {
    id: 'back2bachpan-saavan-26',
    title: 'Back2Bachpan - Saavan\'26',
    slug: 'back2bachpan-saavan-26',
    description: `**Back2Bachpan** is a nostalgia-filled gaming experience that brings together the carefree fun, friendly competition, and childhood memories we all grew up with. Combining trivia, classic multiplayer games, and quick-thinking challenges, the event offers participants a chance to compete, reconnect with their favourite childhood moments, and simply have fun with friends and fellow participants. Whether you grew up watching cartoons, playing classic games, or competing with friends over the smallest of things, Back2Bachpan is an opportunity to put the seriousness aside and rediscover the joy of playing just for the fun of it.

**Event Dates:** 24 Sep – 27 Sep 2026  
**Venue:** Google Forms / Google Meet  
**Prize Pool:** ₹10,500  
**Registration:** [https://saavan.iitmparadox.org/events/sports/back2bachpan](https://saavan.iitmparadox.org/events/sports/back2bachpan)

**Rulebook:** [View Rulebook](https://docs.google.com/document/d/e/2PACX-1vRblUoD9F0trNsgDGpAjyDoGd0cfvQhxsQvvAsx_bySzz7u8iIlKC0QanQxSpTHIiLp05NW4aq7NDfF/pub)`,
    shortDescription: 'Nostalgic gaming with trivia, classic multiplayer & quick-thinking challenges. Relive childhood fun & compete for prizes.',
    status: 'UPCOMING',
    startDate: '2026-09-24T00:00:00.000Z',
    endDate: '2026-09-27T23:59:00.000Z',
    location: 'Online',
    venue: 'Google Forms / Google Meet',
    eventType: 'Nostalgic Competitive Event',
    capacity: null,
    imageUrl: 'https://drive.google.com/uc?export=view&id=1RmWbFRuOVn1mjSFX-qkgmit5oELf7dcC',
    registrationUrl: 'https://saavan.iitmparadox.org/events/sports/back2bachpan',
    teamRegistration: false,
    teamMinSize: 1,
    teamMaxSize: 1,
    eventDays: 4,
    dayLabels: ['Day 1', 'Day 2', 'Day 3', 'Day 4'],
    featured: true,
    prizes: '₹10,500',
    rulebookUrl: 'https://docs.google.com/document/d/e/2PACX-1vRblUoD9F0trNsgDGpAjyDoGd0cfvQhxsQvvAsx_bySzz7u8iIlKC0QanQxSpTHIiLp05NW4aq7NDfF/pub',
    prerequisites: 'A device with internet access. Just bring your childhood memories!',
    learningOutcomes: 'Reconnect with peers through shared nostalgia, improve quick thinking, and enjoy stress-free competitive gaming.',
    targetAudience: 'All IITM BS students looking for nostalgic fun',
  },
  {
    id: 'bgmi-saavan-26',
    title: 'The Battleground: BGMI - Saavan\'26',
    slug: 'bgmi-saavan-26',
    description: `**The Battleground: BGMI** is a competitive esports tournament that brings together BGMI players and squads in an intense test of skill, strategy, teamwork, and consistency. With opportunities for players to compete both individually and as part of a squad, the tournament is designed to challenge participants across different aspects of competitive gameplay. The event culminates in a high-stakes Grand Final, where the strongest teams battle to secure the championship.

**Event Dates:** 24 Sep – 27 Sep 2026  
**Venue:** BGMI Application  
**Prize Pool:** ₹9,000  
**Registration:** [https://saavan.iitmparadox.org/events/sports/the-battleground-bgmi](https://saavan.iitmparadox.org/events/sports/the-battleground-bgmi)

**Rulebook:** [View Rulebook](https://docs.google.com/document/d/e/2PACX-1vSy2G1x6UIN2oWqzn8S_6Yyh_G20S0P2XjGg0FAJVo_vAH6D6-ZeOPgpeNo6ljy5liEkJbDc7rjBuY2/pub)

**Team Size:** 2–4 members per squad`,
    shortDescription: 'Competitive BGMI esports tournament for squads. Test skill, strategy & teamwork. Grand Finals for the championship.',
    status: 'UPCOMING',
    startDate: '2026-09-24T00:00:00.000Z',
    endDate: '2026-09-27T23:59:00.000Z',
    location: 'Mobile',
    venue: 'BGMI Application',
    eventType: 'Esports Tournament',
    capacity: null,
    imageUrl: 'https://drive.google.com/uc?export=view&id=14ZzDJQJ6C0T3eWJ_4umbLISCvu2Wxgcm',
    registrationUrl: 'https://saavan.iitmparadox.org/events/sports/the-battleground-bgmi',
    teamRegistration: true,
    teamMinSize: 2,
    teamMaxSize: 4,
    eventDays: 4,
    dayLabels: ['Qualifiers', 'Semi-Finals', 'Finals', 'Grand Finals'],
    featured: true,
    prizes: '₹9,000',
    rulebookUrl: 'https://docs.google.com/document/d/e/2PACX-1vSy2G1x6UIN2oWqzn8S_6Yyh_G20S0P2XjGg0FAJVo_vAH6D6-ZeOPgpeNo6ljy5liEkJbDc7rjBuY2/pub',
    prerequisites: 'BGMI installed on mobile device. Stable internet. Squad of 2–4 players.',
    learningOutcomes: 'Develop competitive gaming strategy, team coordination, and decision-making under pressure.',
    targetAudience: 'BGMI players of all skill levels. Form your squad!',
  },
  {
    id: 'free-fire-saavan-26',
    title: 'The Battleground: Free Fire - Saavan\'26',
    slug: 'free-fire-saavan-26',
    description: `**The Battleground: Free Fire** — Step into the battleground and put your Free Fire skills to the ultimate test. Participants will compete in intense matches where strategy, quick decision-making, teamwork, and combat skills are key to survival. Whether you dominate through aggressive plays or outsmart your opponents with calculated moves, every decision can turn the game around. Gather your squad, enter the battlefield, and fight your way to the top.

**Event Dates:** 24 Sep – 27 Sep 2026  
**Venue:** Free Fire Max Application  
**Prize Pool:** ₹9,000  
**Registration:** [https://saavan.iitmparadox.org/events/sports/the-battleground-free-fire](https://saavan.iitmparadox.org/events/sports/the-battleground-free-fire)

**Rulebook:** [View Rulebook](https://docs.google.com/document/d/e/2PACX-1vT2hhC-XtJMD3QRtd-Blne51A5OVCRg6YJOzLiqOfTgVOju3klImRvw7kR4qlF8lQp0dmRCD67CYOcz/pub)

**Team Size:** 2–4 members per squad`,
    shortDescription: 'Free Fire Max squad tournament. Strategy, combat skills & quick decisions key to survival. Fight your way to the top.',
    status: 'UPCOMING',
    startDate: '2026-09-24T00:00:00.000Z',
    endDate: '2026-09-27T23:59:00.000Z',
    location: 'Mobile',
    venue: 'Free Fire Max Application',
    eventType: 'Esports Tournament',
    capacity: null,
    imageUrl: 'https://drive.google.com/uc?export=view&id=1kiNp7dLzj8bkJ_zB-tAnvR4Aq5RS4lvx',
    registrationUrl: 'https://saavan.iitmparadox.org/events/sports/the-battleground-free-fire',
    teamRegistration: true,
    teamMinSize: 2,
    teamMaxSize: 4,
    eventDays: 4,
    dayLabels: ['Qualifiers', 'Semi-Finals', 'Finals', 'Grand Finals'],
    featured: true,
    prizes: '₹9,000',
    rulebookUrl: 'https://docs.google.com/document/d/e/2PACX-1vT2hhC-XtJMD3QRtd-Blne51A5OVCRg6YJOzLiqOfTgVOju3klImRvw7kR4qlF8lQp0dmRCD67CYOcz/pub',
    prerequisites: 'Free Fire Max installed on mobile device. Stable internet. Squad of 2–4 players.',
    learningOutcomes: 'Develop competitive gaming strategy, team coordination, and decision-making under pressure.',
    targetAudience: 'Free Fire Max players of all skill levels. Form your squad!',
  },
];

export function getSaavanEventBySlug(slug: string): SaavanEvent | undefined {
  return SAAVAN_EVENTS.find(e => e.slug === slug);
}

export function getUpcomingSaavanEvents(): SaavanEvent[] {
  return SAAVAN_EVENTS.filter(e => e.status === 'UPCOMING');
}

export function getFeaturedSaavanEvent(): SaavanEvent | undefined {
  return SAAVAN_EVENTS.find(e => e.featured && e.status === 'UPCOMING');
}