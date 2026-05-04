import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";

import { Public } from "../common/decorators";
import { PrismaService } from "../prisma/prisma.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("stats")
  async stats(@Req() req: Request & { user: { id: string } }) {
    const [eventsJoined, gamesPlayed, user] = await Promise.all([
      this.prisma.eventParticipant.count({ where: { userId: req.user.id } }),
      this.prisma.gameScore.count({ where: { userId: req.user.id } }),
      this.prisma.user.findUnique({ where: { id: req.user.id } })
    ]);
    return {
      eventsJoined,
      gamesPlayed,
      totalXP: user?.xp ?? 0,
      streak: user?.streak ?? 0,
      rank: 0,
      weeklyXP: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, xp: 0 }))
    };
  }

  @Public()
  @Get("public")
  async publicSummary() {
    const [totalUsers, totalGames, activeEvents, liveGames] = await Promise.all([
      this.prisma.user.count({ where: { verifiedAt: { not: null }, deletedAt: null } }),
      this.prisma.game.count(),
      this.prisma.event.count({ where: { status: { in: ["upcoming", "live"] } } }),
      this.prisma.game.findMany({ orderBy: { playersOnline: "desc" }, take: 3 })
    ]);
    return {
      totalUsers,
      totalGames,
      activeEvents,
      liveGames: liveGames.map((game) => ({ id: game.id, name: game.name, emoji: game.emoji, playersOnline: game.playersOnline })),
      topPlayers: []
    };
  }
}
