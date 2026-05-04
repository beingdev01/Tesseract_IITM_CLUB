import { PassportStatic } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { emailService } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import { getBranchFromEmail, isIitmEmail } from '../utils/iitmDomain.js';

const getCookie = (req: Request, name: string): string | undefined => {
  const cookies = req.headers.cookie;
  if (!cookies) return undefined;
  const match = cookies.split(';').find((cookie) => cookie.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=').trim()) : undefined;
};

const isNetworkIntentRequest = (req: Request): boolean => getCookie(req, 'oauth_intent') === 'network';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

// SEED_ADMIN_EMAIL gives the first OAuth login from that address an automatic
// ADMIN role. Idempotent — re-runs are no-ops once the role is at or above ADMIN.
const seedAdminEmail = (): string | null => {
  const value = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  return value ? value : null;
};

const ROLES_AT_OR_ABOVE_ADMIN = new Set(['ADMIN', 'PRESIDENT']);

export class InvalidDomainError extends Error {
  code = 'INVALID_DOMAIN';
  constructor(message = 'Only IITM BS accounts are allowed') {
    super(message);
    this.name = 'InvalidDomainError';
  }
}

export function setupPassport(passport: PassportStatic) {
  // Google OAuth — the only supported provider after the Tesseract pivot.
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${backendUrl}/api/auth/google/callback`,
          passReqToCallback: true,
        },
        async (req: Request, _accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value?.trim().toLowerCase();
            if (!email) {
              return done(new InvalidDomainError('No email returned by Google'), undefined);
            }

            if (!isIitmEmail(email)) {
              return done(new InvalidDomainError(), undefined);
            }

            const derivedBranch = getBranchFromEmail(email);
            const googleAvatar = profile.photos?.[0]?.value ?? null;
            const isNetworkIntent = isNetworkIntentRequest(req);

            let user = await prisma.user.findFirst({
              where: { email: { equals: email, mode: 'insensitive' } },
            });
            let isNewUser = false;

            if (!user) {
              isNewUser = true;
              user = await prisma.user.create({
                data: {
                  name: profile.displayName || email.split('@')[0] || 'User',
                  email,
                  avatar: googleAvatar ?? undefined,
                  oauthProvider: 'google',
                  oauthId: profile.id,
                  branch: derivedBranch ?? undefined,
                  // Role upgrades to NETWORK are handled centrally in /auth/google/callback.
                  role: 'USER',
                },
              });
            } else {
              // Backfill branch + refresh avatar on every login.
              const updates: { branch?: string; avatar?: string; oauthProvider?: string; oauthId?: string } = {};
              if (!user.branch && derivedBranch) {
                updates.branch = derivedBranch;
              }
              // Refresh the avatar from Google unless the user manually set one (Cloudinary URL).
              const userAvatar = user.avatar ?? '';
              const isCloudinaryAvatar = userAvatar.includes('res.cloudinary.com');
              if (googleAvatar && !isCloudinaryAvatar && userAvatar !== googleAvatar) {
                updates.avatar = googleAvatar;
              }
              // Convert legacy/pending OAuth identities (e.g. seeded super admin) to real Google ones.
              if (user.oauthProvider !== 'google') {
                updates.oauthProvider = 'google';
                updates.oauthId = profile.id;
              }
              if (Object.keys(updates).length > 0) {
                user = await prisma.user.update({ where: { id: user.id }, data: updates });
              }
            }

            // Auto-promote the bootstrap admin on first OAuth login.
            const seedEmail = seedAdminEmail();
            if (seedEmail && email === seedEmail && !ROLES_AT_OR_ABOVE_ADMIN.has(user.role)) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { role: 'ADMIN' },
              });
              logger.info('Seed admin auto-promoted to ADMIN on OAuth login', { userId: user.id });
            }

            // Welcome email only for genuinely new regular sign-ups.
            if (isNewUser && !isNetworkIntent) {
              emailService.sendWelcome(email, user.name).catch((err) => {
                logger.error('Failed to send welcome email', {
                  error: err instanceof Error ? err.message : 'Unknown',
                });
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error, undefined);
          }
        },
      ),
    );
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}
