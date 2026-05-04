"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureSeeds = void 0;
exports.featureSeeds = [
    { key: "auth.signup_enabled", displayName: "Signup Enabled", description: "Global kill switch for OTP signup and new account creation.", category: "admin_gate", valueType: "bool", defaultValue: true },
    { key: "events.rsvp_enabled", displayName: "Event RSVP Enabled", description: "Allow members to RSVP to events.", category: "admin_gate", valueType: "bool", defaultValue: true },
    { key: "events.creation_enabled", displayName: "Event Creation Enabled", description: "Allow core/admin users to create events.", category: "admin_gate", valueType: "bool", defaultValue: true },
    { key: "games.gameplay_enabled", displayName: "Gameplay Enabled", description: "Phase 2 gameplay gate.", category: "admin_gate", valueType: "bool", defaultValue: false },
    { key: "games.scores_enabled", displayName: "Scores Enabled", description: "Phase 2 score submission gate.", category: "admin_gate", valueType: "bool", defaultValue: false },
    { key: "leaderboard.public_enabled", displayName: "Public Leaderboard Enabled", description: "Show computed leaderboards.", category: "admin_gate", valueType: "bool", defaultValue: false },
    { key: "members.directory_enabled", displayName: "Members Directory Enabled", description: "Allow members to browse the directory.", category: "admin_gate", valueType: "bool", defaultValue: true },
    { key: "notifications.in_app_enabled", displayName: "In-app Notifications Enabled", description: "Allow in-app notifications to be read and written.", category: "admin_gate", valueType: "bool", defaultValue: true },
    { key: "feature.beta_access", displayName: "Beta Access", description: "Opt users into beta UI features.", category: "admin_gate", valueType: "bool", defaultValue: false },
    { key: "profile.visible_in_directory", displayName: "Visible In Directory", description: "Show the profile in member directory results.", category: "user_pref", valueType: "bool", defaultValue: true },
    { key: "profile.show_email", displayName: "Show Email", description: "Expose email on public profile responses.", category: "user_pref", valueType: "bool", defaultValue: false },
    { key: "profile.show_roll_number", displayName: "Show Roll Number", description: "Expose roll number on public profile responses.", category: "user_pref", valueType: "bool", defaultValue: false },
    { key: "notifications.email_event_reminders", displayName: "Email Event Reminders", description: "User preference for event reminder emails.", category: "user_pref", valueType: "bool", defaultValue: true },
    { key: "notifications.email_weekly_digest", displayName: "Email Weekly Digest", description: "User preference for weekly digest emails.", category: "user_pref", valueType: "bool", defaultValue: true },
    { key: "notifications.email_score_alerts", displayName: "Email Score Alerts", description: "User preference for score alert emails.", category: "user_pref", valueType: "bool", defaultValue: true },
    { key: "leaderboard.opt_in_global", displayName: "Opt In To Global Leaderboard", description: "Include user in future global leaderboard computation.", category: "user_pref", valueType: "bool", defaultValue: true },
    { key: "activity.feed_visibility", displayName: "Activity Feed Visibility", description: "Who can view a user's activity feed.", category: "user_pref", valueType: "string", defaultValue: "members" }
];
//# sourceMappingURL=feature-seeds.js.map