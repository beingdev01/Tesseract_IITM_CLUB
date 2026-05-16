import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getAuthUser, optionalAuthMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { auditLog } from '../utils/audit.js';
import { ApiResponse } from '../utils/response.js';
import { emailService } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import { parsePaginationNumber } from '../utils/pagination.js';

export const hiringRouter = Router();

// ── Enum value lists (mirror prisma/schema.prisma) ─────────────────────────
const applicationTypes = ['MEMBER', 'CORE'] as const;
const applicationStatuses = ['PENDING', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED'] as const;
const bsLevels = ['FOUNDATION', 'DIPLOMA', 'DEGREE'] as const;
const houses = [
  'BANDIPUR', 'CORBETT', 'GIR', 'KANHA', 'KAZIRANGA', 'NALLAMALA', 'NAMDAPHA',
  'NILGIRI', 'PICHAVARAM', 'SARANDA', 'SUNDARBANS', 'WAYANAD', 'NOT_ALLOTED',
] as const;
const regions = [
  'BENGALURU', 'CHANDIGARH', 'CHENNAI', 'DELHI', 'HYDERABAD', 'KOLKATA',
  'LUCKNOW', 'MUMBAI', 'PATNA', 'INTERNATIONAL', 'NOT_ALLOTED',
] as const;
const genders = ['MALE', 'FEMALE', 'PREFER_NOT_TO_SAY'] as const;
const coreInterests = ['YES', 'MAYBE', 'NO'] as const;
const weeklyHoursValues = ['LT_7', 'H_7_15', 'GT_15'] as const;
const coreRoles = [
  'MANAGEMENT', 'CONTENT_CREATOR', 'GRAPHIC_DESIGNER', 'TECHNICAL_WEBOPS',
  'MEMER', 'PR_OUTREACH', 'RESEARCH_SPONSORSHIP', 'DOCUMENTATION', 'STREAMER_SPEAKER',
] as const;

const coreHouses = [
  'BANDIPUR', 'CORBETT', 'GIR', 'KANHA', 'KAZIRANGA', 'NALLAMALA', 'NAMDAPHA',
  'NILGIRI', 'PICHAVARAM', 'SARANDA', 'SUNDARBANS', 'WAYANAD',
] as const;

const CORE_ROLE_LABELS: Record<(typeof coreRoles)[number], string> = {
  MANAGEMENT: 'Management',
  CONTENT_CREATOR: 'Content Creator / Video Editor',
  GRAPHIC_DESIGNER: 'Graphic Designer',
  TECHNICAL_WEBOPS: 'Technical / WebOps',
  MEMER: 'Memer',
  PR_OUTREACH: 'PR & Outreach',
  RESEARCH_SPONSORSHIP: 'Research & Sponsorship',
  DOCUMENTATION: 'Documentation',
  STREAMER_SPEAKER: 'Streamer & Speaker',
};

const labelFromCoreRoles = (rolesApplied: readonly string[]): string =>
  rolesApplied
    .map((r) => CORE_ROLE_LABELS[r as (typeof coreRoles)[number]] ?? r)
    .join(' / ');

// ── Zod schemas ────────────────────────────────────────────────────────────
const baseSharedSchema = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').transform((v) => v.trim().toLowerCase()),
  phone: z.string().trim().min(5, 'Phone is required'),
  house: z.enum(houses, { errorMap: () => ({ message: 'Pick a house' }) }),
  bsLevel: z.enum(bsLevels, { errorMap: () => ({ message: 'Pick your BS Program level' }) }),
};

const memberSchema = z.object({
  applicationType: z.literal('MEMBER'),
  ...baseSharedSchema,
  gender: z.enum(genders, { errorMap: () => ({ message: 'Pick a gender option' }) }),
  region: z.enum(regions, { errorMap: () => ({ message: 'Pick your region' }) }),
  coreInterest: z.enum(coreInterests, { errorMap: () => ({ message: 'Tell us your interest in joining the core team' }) }),
  crazyIdeas: z.string().trim().max(2000).optional().nullable(),
});

const coreSchema = z.object({
  applicationType: z.literal('CORE'),
  ...baseSharedSchema,
  house: z.enum(coreHouses, {
    errorMap: () => ({ message: 'Pick a house (NOT_ALLOTED is not allowed for Core applications)' }),
  }),
  weeklyHours: z.enum(weeklyHoursValues, { errorMap: () => ({ message: 'Pick your weekly time commitment' }) }),
  rolesApplied: z.array(z.enum(coreRoles)).min(1, 'Pick at least one role'),
  hasExperience: z.boolean({ errorMap: () => ({ message: 'Tell us if you have prior experience' }) }),
  experienceDesc: z.string().trim().max(4000).optional().nullable(),
  resumeUrl: z.string().trim().url('Resume / LinkedIn URL must be a valid URL'),
  crazyIdeas: z.string().trim().min(2, 'Share your ideas with us'),
  confirmAccurate: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm the information is accurate' }),
  }),
});

const hiringApplicationSchema = z
  .discriminatedUnion('applicationType', [memberSchema, coreSchema])
  .superRefine((data, ctx) => {
    if (
      data.applicationType === 'CORE' &&
      data.hasExperience &&
      (!data.experienceDesc || data.experienceDesc.length < 2)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['experienceDesc'],
        message: 'Describe your past experience',
      });
    }
  });

const updateStatusSchema = z.object({
  status: z.enum(applicationStatuses),
});

// ── Helpers ────────────────────────────────────────────────────────────────
type MemberInput = z.infer<typeof memberSchema>;
type CoreInput = z.infer<typeof coreSchema>;

const ensureHiringEnabled = async (): Promise<boolean> => {
  const settings = await prisma.settings.findUnique({ where: { id: 'default' }, select: { hiringEnabled: true } });
  return settings?.hiringEnabled !== false;
};

const getWhatsappUrl = async (): Promise<string | null> => {
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
    select: { whatsappCommunityUrl: true },
  });
  return settings?.whatsappCommunityUrl ?? null;
};

const sendCoreStatusEmailAsync = (
  status: 'INTERVIEW_SCHEDULED' | 'SELECTED' | 'REJECTED',
  payload: { email: string; name: string; rolesApplied: string[] }
) => {
  const label = labelFromCoreRoles(payload.rolesApplied);
  const promise = (() => {
    switch (status) {
      case 'INTERVIEW_SCHEDULED':
        return emailService.sendHiringInterviewScheduled(payload.email, payload.name, label);
      case 'SELECTED':
        return emailService.sendHiringSelected(payload.email, payload.name, label);
      case 'REJECTED':
        return emailService.sendHiringRejected(payload.email, payload.name, label);
    }
  })();

  promise
    .then(() => logger.info('Hiring status email sent', { email: payload.email, status }))
    .catch((error) =>
      logger.error('Failed to send hiring status email', {
        email: payload.email,
        status,
        error: error instanceof Error ? error.message : String(error),
      })
    );
};

// ── POST /apply ────────────────────────────────────────────────────────────
hiringRouter.post('/apply', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (!(await ensureHiringEnabled())) {
      return ApiResponse.forbidden(res, 'Hiring is currently closed');
    }

    const validation = hiringApplicationSchema.safeParse(req.body);
    if (!validation.success) {
      return ApiResponse.badRequest(res, validation.error.errors[0].message);
    }

    const input = validation.data;
    const authUser = getAuthUser(req);
    const userId = authUser?.id ?? null;

    const existing = await prisma.hiringApplication.findFirst({
      where: { email: input.email, applicationType: input.applicationType },
    });

    if (existing) {
      return ApiResponse.conflict(
        res,
        input.applicationType === 'MEMBER'
          ? 'You have already joined as a member with this email'
          : 'You have already submitted a Core Team application with this email'
      );
    }

    if (input.applicationType === 'MEMBER') {
      const memberData = input as MemberInput;
      const application = await prisma.hiringApplication.create({
        data: {
          applicationType: 'MEMBER',
          name: memberData.name,
          email: memberData.email,
          phone: memberData.phone,
          house: memberData.house,
          bsLevel: memberData.bsLevel,
          gender: memberData.gender,
          region: memberData.region,
          coreInterest: memberData.coreInterest,
          crazyIdeas: memberData.crazyIdeas ?? null,
          userId,
          // Members auto-select; no admin review needed.
          status: 'SELECTED',
          confirmAccurate: true,
        },
      });

      const whatsappUrl = await getWhatsappUrl();

      emailService
        .sendMemberWelcome(memberData.email, memberData.name, whatsappUrl ?? undefined)
        .catch((error) =>
          logger.error('Failed to send member welcome email', {
            email: memberData.email,
            error: error instanceof Error ? error.message : String(error),
          })
        );

      if (userId) {
        await auditLog(userId, 'MEMBER_JOINED', 'HiringApplication', application.id, {
          email: memberData.email,
        });
      }

      return ApiResponse.created(res, {
        message: 'Welcome to the Tesseract community!',
        whatsappCommunityUrl: whatsappUrl,
        application: {
          id: application.id,
          applicationType: application.applicationType,
          status: application.status,
          coreInterest: application.coreInterest,
        },
      });
    }

    // CORE
    const coreData = input as CoreInput;
    const application = await prisma.hiringApplication.create({
      data: {
        applicationType: 'CORE',
        name: coreData.name,
        email: coreData.email,
        phone: coreData.phone,
        house: coreData.house as (typeof houses)[number],
        bsLevel: coreData.bsLevel,
        weeklyHours: coreData.weeklyHours,
        rolesApplied: coreData.rolesApplied,
        hasExperience: coreData.hasExperience,
        experienceDesc: coreData.experienceDesc ?? null,
        resumeUrl: coreData.resumeUrl,
        crazyIdeas: coreData.crazyIdeas,
        confirmAccurate: coreData.confirmAccurate,
        userId,
        status: 'PENDING',
      },
    });

    const rolesLabel = labelFromCoreRoles(coreData.rolesApplied);
    emailService
      .sendHiringApplication(coreData.email, coreData.name, rolesLabel)
      .catch((error) =>
        logger.error('Failed to send hiring application email', {
          email: coreData.email,
          error: error instanceof Error ? error.message : String(error),
        })
      );

    if (userId) {
      await auditLog(userId, 'HIRING_APPLICATION_SUBMITTED', 'HiringApplication', application.id, {
        email: coreData.email,
        rolesApplied: coreData.rolesApplied,
      });
    }

    return ApiResponse.created(res, {
      message: 'Application submitted! We will be in touch via email.',
      application: {
        id: application.id,
        applicationType: application.applicationType,
        status: application.status,
        rolesApplied: application.rolesApplied,
      },
    });
  } catch (error) {
    logger.error('Hiring apply error:', { error: error instanceof Error ? error.message : String(error) });

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return ApiResponse.conflict(res, 'An application with this email already exists for this type');
    }

    return ApiResponse.internal(res, 'Failed to submit application');
  }
});

// ── GET /applications (Admin) ──────────────────────────────────────────────
hiringRouter.get('/applications', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const page = parsePaginationNumber(req.query.page, 1, { min: 1, max: 1_000_000 });
    const limit = parsePaginationNumber(req.query.limit, 20, { min: 1, max: 100 });
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : undefined;
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    if (page === null) return ApiResponse.badRequest(res, 'page must be a positive integer');
    if (limit === null) return ApiResponse.badRequest(res, 'limit must be an integer between 1 and 100');

    if (status && !applicationStatuses.includes(status as (typeof applicationStatuses)[number])) {
      return ApiResponse.badRequest(res, 'Invalid status filter');
    }
    if (type && type !== 'ALL' && !applicationTypes.includes(type as (typeof applicationTypes)[number])) {
      return ApiResponse.badRequest(res, 'Invalid type filter');
    }
    if (role && !coreRoles.includes(role as (typeof coreRoles)[number])) {
      return ApiResponse.badRequest(res, 'Invalid role filter');
    }

    const where: Prisma.HiringApplicationWhereInput = {};
    if (status) where.status = status as (typeof applicationStatuses)[number];
    if (type && type !== 'ALL') where.applicationType = type as (typeof applicationTypes)[number];
    if (role) where.rolesApplied = { has: role as (typeof coreRoles)[number] };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.hiringApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      }),
      prisma.hiringApplication.count({ where }),
    ]);

    return ApiResponse.paginated(res, applications, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Get applications error:', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to fetch applications');
  }
});

// ── GET /applications/:id (Admin) ──────────────────────────────────────────
hiringRouter.get('/applications/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const application = await prisma.hiringApplication.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true } } },
    });

    if (!application) return ApiResponse.notFound(res, 'Application not found');
    return ApiResponse.success(res, application);
  } catch (error) {
    logger.error('Get application error:', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to fetch application');
  }
});

// ── PATCH /applications/:id/status (Admin, CORE only) ──────────────────────
hiringRouter.patch('/applications/:id/status', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = getAuthUser(req);
    const validation = updateStatusSchema.safeParse(req.body);
    if (!validation.success) return ApiResponse.badRequest(res, validation.error.errors[0].message);

    const { status } = validation.data;

    const existing = await prisma.hiringApplication.findUnique({ where: { id } });
    if (!existing) return ApiResponse.notFound(res, 'Application not found');

    if (existing.applicationType === 'MEMBER') {
      return ApiResponse.conflict(res, 'Member applications do not have a review workflow');
    }

    const application = await prisma.hiringApplication.update({
      where: { id },
      data: { status },
    });

    if (existing.status !== status && (status === 'INTERVIEW_SCHEDULED' || status === 'SELECTED' || status === 'REJECTED')) {
      sendCoreStatusEmailAsync(status, {
        email: application.email,
        name: application.name,
        rolesApplied: application.rolesApplied,
      });
    }

    if (authUser) {
      await auditLog(authUser.id, 'HIRING_STATUS_UPDATED', 'HiringApplication', id, {
        previousStatus: existing.status,
        newStatus: status,
        emailSent: status !== 'PENDING',
      });
    }

    return ApiResponse.success(res, { message: 'Application status updated', application });
  } catch (error) {
    logger.error('Update application status error:', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to update application status');
  }
});

// ── DELETE /applications/:id (Admin) ───────────────────────────────────────
hiringRouter.delete('/applications/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = getAuthUser(req);
    await prisma.hiringApplication.delete({ where: { id } });
    if (authUser) {
      await auditLog(authUser.id, 'HIRING_APPLICATION_DELETED', 'HiringApplication', id);
    }
    return ApiResponse.success(res, { message: 'Application deleted successfully' });
  } catch (error) {
    logger.error('Delete application error:', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to delete application');
  }
});

// ── GET /my-application ────────────────────────────────────────────────────
hiringRouter.get('/my-application', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return ApiResponse.unauthorized(res);

    const records = await prisma.hiringApplication.findMany({
      where: {
        OR: [
          { userId: authUser.id },
          { email: { equals: authUser.email, mode: 'insensitive' } },
        ],
      },
    });

    const member = records.find((r) => r.applicationType === 'MEMBER') ?? null;
    const core = records.find((r) => r.applicationType === 'CORE') ?? null;
    const whatsappCommunityUrl = member ? await getWhatsappUrl() : null;

    return ApiResponse.success(res, { member, core, whatsappCommunityUrl });
  } catch (error) {
    logger.error('Get my application error:', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to fetch application');
  }
});

// ── GET /stats (Admin) ─────────────────────────────────────────────────────
hiringRouter.get('/stats', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const [total, byStatus, byType] = await Promise.all([
      prisma.hiringApplication.count(),
      prisma.hiringApplication.groupBy({ by: ['status'], _count: true }),
      prisma.hiringApplication.groupBy({ by: ['applicationType'], _count: true }),
    ]);

    return ApiResponse.success(res, {
      total,
      byStatus: byStatus.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byType: byType.reduce<Record<string, number>>((acc, item) => {
        acc[item.applicationType] = item._count;
        return acc;
      }, {}),
    });
  } catch (error) {
    logger.error('Get hiring stats error:', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to fetch hiring statistics');
  }
});

// ── GET /export (Admin) ────────────────────────────────────────────────────
hiringRouter.get('/export', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : undefined;
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;

    if (status && !applicationStatuses.includes(status as (typeof applicationStatuses)[number])) {
      return ApiResponse.badRequest(res, 'Invalid status filter');
    }
    if (type && type !== 'ALL' && !applicationTypes.includes(type as (typeof applicationTypes)[number])) {
      return ApiResponse.badRequest(res, 'Invalid type filter');
    }
    if (role && !coreRoles.includes(role as (typeof coreRoles)[number])) {
      return ApiResponse.badRequest(res, 'Invalid role filter');
    }

    const where: Prisma.HiringApplicationWhereInput = {};
    if (status) where.status = status as (typeof applicationStatuses)[number];
    if (type && type !== 'ALL') where.applicationType = type as (typeof applicationTypes)[number];
    if (role) where.rolesApplied = { has: role as (typeof coreRoles)[number] };

    const applications = await prisma.hiringApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    workbook.creator = 'Tesseract';
    workbook.created = new Date();

    const fmt = (d: Date) =>
      d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

    // ── Summary sheet
    const members = applications.filter((a) => a.applicationType === 'MEMBER');
    const core = applications.filter((a) => a.applicationType === 'CORE');
    const summary = workbook.addWorksheet('Summary');
    summary.addRow(['Generated At', fmt(new Date())]);
    summary.addRow(['Total Applications', applications.length]);
    summary.addRow(['Members', members.length]);
    summary.addRow(['Core Applications', core.length]);
    summary.addRow(['Status Filter', status ?? 'All']);
    summary.addRow(['Type Filter', type ?? 'All']);
    summary.addRow(['Role Filter', role ?? 'All']);
    summary.getColumn(1).width = 22;
    summary.getColumn(2).width = 38;
    summary.getColumn(1).font = { bold: true };

    // ── Members sheet
    const membersSheet = workbook.addWorksheet('Members');
    membersSheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 34 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'House', key: 'house', width: 14 },
      { header: 'BS Level', key: 'bsLevel', width: 14 },
      { header: 'Gender', key: 'gender', width: 18 },
      { header: 'Region', key: 'region', width: 16 },
      { header: 'Interested in Core?', key: 'coreInterest', width: 18 },
      { header: 'Crazy Ideas', key: 'crazyIdeas', width: 42 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Joined On', key: 'createdAt', width: 28 },
      { header: 'Account Linked', key: 'userLinked', width: 16 },
    ];
    members.forEach((a) => {
      membersSheet.addRow({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        house: a.house,
        bsLevel: a.bsLevel,
        gender: a.gender ?? '-',
        region: a.region ?? '-',
        coreInterest: a.coreInterest ?? '-',
        crazyIdeas: a.crazyIdeas ?? '',
        status: a.status,
        createdAt: fmt(new Date(a.createdAt)),
        userLinked: a.user ? 'Yes' : 'No',
      });
    });

    // ── Core sheet
    const coreSheet = workbook.addWorksheet('Core Applications');
    coreSheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 34 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'House', key: 'house', width: 14 },
      { header: 'BS Level', key: 'bsLevel', width: 14 },
      { header: 'Weekly Hours', key: 'weeklyHours', width: 14 },
      { header: 'Roles Applied', key: 'rolesApplied', width: 42 },
      { header: 'Has Experience', key: 'hasExperience', width: 14 },
      { header: 'Experience', key: 'experienceDesc', width: 50 },
      { header: 'Resume / LinkedIn', key: 'resumeUrl', width: 50 },
      { header: 'Crazy Ideas', key: 'crazyIdeas', width: 50 },
      { header: 'Confirmed', key: 'confirmAccurate', width: 12 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Applied On', key: 'createdAt', width: 28 },
      { header: 'Account Linked', key: 'userLinked', width: 16 },
    ];
    core.forEach((a) => {
      coreSheet.addRow({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        house: a.house,
        bsLevel: a.bsLevel,
        weeklyHours: a.weeklyHours ?? '-',
        rolesApplied: a.rolesApplied.map((r) => CORE_ROLE_LABELS[r] ?? r).join(' / '),
        hasExperience: a.hasExperience === true ? 'Yes' : a.hasExperience === false ? 'No' : '-',
        experienceDesc: a.experienceDesc ?? '',
        resumeUrl: a.resumeUrl ?? '',
        crazyIdeas: a.crazyIdeas ?? '',
        confirmAccurate: a.confirmAccurate ? 'Yes' : 'No',
        status: a.status,
        createdAt: fmt(new Date(a.createdAt)),
        userLinked: a.user ? 'Yes' : 'No',
      });
    });

    for (const sheet of [membersSheet, coreSheet]) {
      const header = sheet.getRow(1);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNumber % 2 === 0 ? 'FFFEF3C7' : 'FFFFFFFF' },
          };
        }
        row.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const parts: string[] = ['tesseract_join'];
    if (type && type !== 'ALL') parts.push(type.toLowerCase());
    if (role) parts.push(role.toLowerCase());
    if (status) parts.push(status.toLowerCase());
    parts.push(new Date().toISOString().split('T')[0]);
    const filename = `${parts.join('_')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));

    const user = getAuthUser(req);
    if (user) {
      await auditLog(user.id, 'EXPORT', 'hiring_applications', 'bulk', {
        filters: { status, type, role },
        count: applications.length,
      });
    }
    return;
  } catch (error) {
    logger.error('Export applications error:', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to export applications');
  }
});
