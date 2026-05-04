"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const activity_controller_1 = require("./activity/activity.controller");
const activity_service_1 = require("./activity/activity.service");
const admin_controller_1 = require("./admin/admin.controller");
const admin_service_1 = require("./admin/admin.service");
const announcements_controller_1 = require("./announcements/announcements.controller");
const announcements_service_1 = require("./announcements/announcements.service");
const audit_service_1 = require("./admin/audit.service");
const auth_controller_1 = require("./auth/auth.controller");
const auth_service_1 = require("./auth/auth.service");
const cache_service_1 = require("./common/cache.service");
const envelope_interceptor_1 = require("./common/envelope.interceptor");
const guards_1 = require("./common/guards");
const http_exception_filter_1 = require("./common/http-exception.filter");
const idempotency_interceptor_1 = require("./common/idempotency.interceptor");
const dashboard_controller_1 = require("./dashboard/dashboard.controller");
const events_controller_1 = require("./events/events.controller");
const events_service_1 = require("./events/events.service");
const feature_service_1 = require("./features/feature.service");
const features_controller_1 = require("./features/features.controller");
const games_controller_1 = require("./games/games.controller");
const games_service_1 = require("./games/games.service");
const health_controller_1 = require("./health.controller");
const invitations_controller_1 = require("./invitations/invitations.controller");
const invitations_service_1 = require("./invitations/invitations.service");
const leaderboard_controller_1 = require("./leaderboard/leaderboard.controller");
const members_controller_1 = require("./members/members.controller");
const members_service_1 = require("./members/members.service");
const prisma_service_1 = require("./prisma/prisma.service");
const registrations_controller_1 = require("./registrations/registrations.controller");
const registrations_service_1 = require("./registrations/registrations.service");
const teams_controller_1 = require("./teams/teams.controller");
const teams_service_1 = require("./teams/teams.service");
const users_controller_1 = require("./users/users.controller");
const user_service_1 = require("./users/user.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            auth_controller_1.AuthController,
            users_controller_1.UsersController,
            members_controller_1.MembersController,
            events_controller_1.EventsController,
            games_controller_1.GamesController,
            leaderboard_controller_1.LeaderboardController,
            activity_controller_1.ActivityController,
            dashboard_controller_1.DashboardController,
            features_controller_1.FeaturesController,
            admin_controller_1.AdminController,
            teams_controller_1.TeamsController,
            invitations_controller_1.InvitationsController,
            announcements_controller_1.AnnouncementsController,
            registrations_controller_1.RegistrationsController,
            health_controller_1.HealthController
        ],
        providers: [
            prisma_service_1.PrismaService,
            cache_service_1.CacheService,
            feature_service_1.FeatureService,
            user_service_1.UserService,
            activity_service_1.ActivityService,
            auth_service_1.AuthService,
            members_service_1.MembersService,
            events_service_1.EventsService,
            games_service_1.GamesService,
            teams_service_1.TeamsService,
            invitations_service_1.InvitationsService,
            announcements_service_1.AnnouncementsService,
            registrations_service_1.RegistrationsService,
            audit_service_1.AuditService,
            admin_service_1.AdminService,
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.HttpErrorFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: idempotency_interceptor_1.IdempotencyInterceptor },
            { provide: core_1.APP_INTERCEPTOR, useClass: envelope_interceptor_1.EnvelopeInterceptor },
            { provide: core_1.APP_GUARD, useClass: guards_1.AuthGuard },
            { provide: core_1.APP_GUARD, useClass: guards_1.SuspensionGuard },
            { provide: core_1.APP_GUARD, useClass: guards_1.RoleGuard },
            { provide: core_1.APP_GUARD, useClass: guards_1.FeatureGuard }
        ]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map