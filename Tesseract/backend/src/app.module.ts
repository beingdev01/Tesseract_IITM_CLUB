import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { ActivityController } from "./activity/activity.controller";
import { ActivityService } from "./activity/activity.service";
import { AdminController } from "./admin/admin.controller";
import { AdminService } from "./admin/admin.service";
import { AnnouncementsController } from "./announcements/announcements.controller";
import { AnnouncementsService } from "./announcements/announcements.service";
import { AuditService } from "./admin/audit.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { CacheService } from "./common/cache.service";
import { EnvelopeInterceptor } from "./common/envelope.interceptor";
import { FeatureGuard, AuthGuard, RoleGuard, SuspensionGuard } from "./common/guards";
import { HttpErrorFilter } from "./common/http-exception.filter";
import { IdempotencyInterceptor } from "./common/idempotency.interceptor";
import { DashboardController } from "./dashboard/dashboard.controller";
import { EventsController } from "./events/events.controller";
import { EventsService } from "./events/events.service";
import { FeatureService } from "./features/feature.service";
import { FeaturesController } from "./features/features.controller";
import { GamesController } from "./games/games.controller";
import { GamesService } from "./games/games.service";
import { HealthController } from "./health.controller";
import { InvitationsController } from "./invitations/invitations.controller";
import { InvitationsService } from "./invitations/invitations.service";
import { LeaderboardController } from "./leaderboard/leaderboard.controller";
import { MembersController } from "./members/members.controller";
import { MembersService } from "./members/members.service";
import { PrismaService } from "./prisma/prisma.service";
import { RegistrationsController } from "./registrations/registrations.controller";
import { RegistrationsService } from "./registrations/registrations.service";
import { TeamsController } from "./teams/teams.controller";
import { TeamsService } from "./teams/teams.service";
import { UsersController } from "./users/users.controller";
import { UserService } from "./users/user.service";

@Module({
  controllers: [
    AuthController,
    UsersController,
    MembersController,
    EventsController,
    GamesController,
    LeaderboardController,
    ActivityController,
    DashboardController,
    FeaturesController,
    AdminController,
    TeamsController,
    InvitationsController,
    AnnouncementsController,
    RegistrationsController,
    HealthController
  ],
  providers: [
    PrismaService,
    CacheService,
    FeatureService,
    UserService,
    ActivityService,
    AuthService,
    MembersService,
    EventsService,
    GamesService,
    TeamsService,
    InvitationsService,
    AnnouncementsService,
    RegistrationsService,
    AuditService,
    AdminService,
    { provide: APP_FILTER, useClass: HttpErrorFilter },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: SuspensionGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    { provide: APP_GUARD, useClass: FeatureGuard }
  ]
})
export class AppModule {}
