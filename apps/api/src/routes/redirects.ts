import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma, withRetry } from '../lib/prisma.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { auditLog } from '../utils/audit.js';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../utils/response.js';

export const redirectsRouter = Router();

// Slugs that must never be claimed by a redirect — they would shadow real SPA
// routes (the catch-all only runs for unmatched paths, so a real-route slug would
// never resolve anyway; rejecting them keeps the admin UI honest) or API/infra paths.
const RESERVED_SLUGS = new Set([
  // Top-level SPA routes (apps/web/src/App.tsx)
  'about', 'achievements', 'admin', 'announcements', 'auth', 'dashboard',
  'events', 'games', 'join', 'join-us', 'leaderboard', 'members', 'onboarding',
  'polls', 'privacy-policy', 'signin', 'signup', 'team', 'verify',
  // API / infra / crawler paths
  'api', 'health', 'ping', 'assets', 'sitemap.xml', 'robots.txt', 'favicon.ico',
]);

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]*$/;
const SLUG_MAX = 64;
const DESTINATION_MAX = 2000;

const createSchema = z.object({
  slug: z.string().trim().min(1).max(SLUG_MAX),
  destinationUrl: z.string().trim().min(1).max(DESTINATION_MAX),
  note: z.string().trim().max(280).nullable().optional(),
  enabled: z.boolean().optional(),
});

const updateSchema = z.object({
  slug: z.string().trim().min(1).max(SLUG_MAX).optional(),
  destinationUrl: z.string().trim().min(1).max(DESTINATION_MAX).optional(),
  note: z.string().trim().max(280).nullable().optional(),
  enabled: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
});

/** Lowercase, trim, and strip surrounding slashes so `/Foo/` and `foo` match. */
function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Returns an error message if the slug is invalid/reserved, else null. */
function validateSlug(slug: string): string | null {
  if (!SLUG_REGEX.test(slug)) {
    return 'Slug may only contain lowercase letters, numbers, hyphens and underscores (no slashes or spaces)';
  }
  if (slug.length > SLUG_MAX) {
    return `Slug must be at most ${SLUG_MAX} characters`;
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" is reserved by the site and cannot be used as a redirect`;
  }
  return null;
}

/** Returns an error message if the destination is not an absolute http(s) URL, else null. */
function validateDestination(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Destination must be an http:// or https:// URL';
    }
    return null;
  } catch {
    return 'Destination must be a valid absolute URL (e.g. https://example.com/path)';
  }
}

// ── Public: resolve a slug to its destination ──────────────────────────────────
// Used by the SPA catch-all (RedirectGate). No auth. Bumps hit analytics async.
redirectsRouter.get('/resolve/:slug', async (req: Request, res: Response) => {
  try {
    const slug = normalizeSlug(req.params.slug || '');
    if (!slug || !SLUG_REGEX.test(slug)) {
      return ApiResponse.notFound(res, 'Redirect not found');
    }

    const redirect = await withRetry(() =>
      prisma.redirect.findUnique({
        where: { slug },
        select: { id: true, destinationUrl: true, enabled: true },
      }),
    );

    if (!redirect || !redirect.enabled) {
      return ApiResponse.notFound(res, 'Redirect not found');
    }

    // Fire-and-forget analytics; never block (or fail) the redirect on this.
    void withRetry(() =>
      prisma.redirect.update({
        where: { id: redirect.id },
        data: { hits: { increment: 1 }, lastUsedAt: new Date() },
      }),
    ).catch((error) => {
      logger.warn('Failed to record redirect hit', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return ApiResponse.success(res, { destinationUrl: redirect.destinationUrl });
  } catch (error) {
    logger.error('Failed to resolve redirect', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to resolve redirect');
  }
});

// ── Admin: list all redirects ──────────────────────────────────────────────────
redirectsRouter.get('/', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const redirects = await withRetry(() =>
      prisma.redirect.findMany({ orderBy: { updatedAt: 'desc' } }),
    );
    return ApiResponse.success(res, redirects);
  } catch (error) {
    logger.error('Failed to list redirects', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to list redirects');
  }
});

// ── Admin: create ──────────────────────────────────────────────────────────────
redirectsRouter.post('/', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req)!;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return ApiResponse.badRequest(res, parsed.error.errors[0]?.message || 'Invalid redirect payload');
    }

    const slug = normalizeSlug(parsed.data.slug);
    const slugError = validateSlug(slug);
    if (slugError) {
      return ApiResponse.badRequest(res, slugError);
    }

    const destinationUrl = parsed.data.destinationUrl.trim();
    const destinationError = validateDestination(destinationUrl);
    if (destinationError) {
      return ApiResponse.badRequest(res, destinationError);
    }

    const redirect = await withRetry(() =>
      prisma.redirect.create({
        data: {
          slug,
          destinationUrl,
          note: parsed.data.note?.trim() || null,
          enabled: parsed.data.enabled ?? true,
          createdBy: authUser.id,
        },
      }),
    );

    await auditLog(authUser.id, 'CREATE', 'redirect', redirect.id, { slug, destinationUrl });
    return ApiResponse.created(res, redirect, 'Redirect created');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return ApiResponse.conflict(res, 'A redirect with that slug already exists');
    }
    logger.error('Failed to create redirect', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create redirect');
  }
});

// ── Admin: update ──────────────────────────────────────────────────────────────
redirectsRouter.patch('/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req)!;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return ApiResponse.badRequest(res, parsed.error.errors[0]?.message || 'Invalid redirect payload');
    }

    const data: Prisma.RedirectUpdateInput = {};

    if (parsed.data.slug !== undefined) {
      const slug = normalizeSlug(parsed.data.slug);
      const slugError = validateSlug(slug);
      if (slugError) {
        return ApiResponse.badRequest(res, slugError);
      }
      data.slug = slug;
    }

    if (parsed.data.destinationUrl !== undefined) {
      const destinationUrl = parsed.data.destinationUrl.trim();
      const destinationError = validateDestination(destinationUrl);
      if (destinationError) {
        return ApiResponse.badRequest(res, destinationError);
      }
      data.destinationUrl = destinationUrl;
    }

    if (parsed.data.note !== undefined) {
      data.note = parsed.data.note?.trim() || null;
    }
    if (parsed.data.enabled !== undefined) {
      data.enabled = parsed.data.enabled;
    }

    const redirect = await withRetry(() =>
      prisma.redirect.update({ where: { id: req.params.id }, data }),
    );

    await auditLog(authUser.id, 'UPDATE', 'redirect', redirect.id, parsed.data);
    return ApiResponse.success(res, redirect, 'Redirect updated');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return ApiResponse.conflict(res, 'A redirect with that slug already exists');
      }
      if (error.code === 'P2025') {
        return ApiResponse.notFound(res, 'Redirect not found');
      }
    }
    logger.error('Failed to update redirect', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to update redirect');
  }
});

// ── Admin: delete ──────────────────────────────────────────────────────────────
redirectsRouter.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req)!;
    await withRetry(() => prisma.redirect.delete({ where: { id: req.params.id } }));
    await auditLog(authUser.id, 'DELETE', 'redirect', req.params.id);
    return ApiResponse.success(res, { id: req.params.id }, 'Redirect deleted');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return ApiResponse.notFound(res, 'Redirect not found');
    }
    logger.error('Failed to delete redirect', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to delete redirect');
  }
});
