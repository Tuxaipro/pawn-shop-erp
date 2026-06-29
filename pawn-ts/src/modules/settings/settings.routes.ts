import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import {
  MIN_DASHBOARD_REFRESH_SECONDS,
  MIN_SESSION_TIMEOUT_MINUTES,
  MAX_SESSION_TIMEOUT_MINUTES,
  updateOrganizationSettings,
  getOrganizationSettings,
} from './organization.service.js';

export const settingsRouter = Router();

const modulesSchema = z.object({
  bankLoans: z.boolean().optional(),
  auctions: z.boolean().optional(),
  investments: z.boolean().optional(),
  gl: z.boolean().optional(),
  notifications: z.boolean().optional(),
});

const organizationSchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  proprietor: z.string().max(100).optional(),
  dashboardRefreshSeconds: z
    .number()
    .int()
    .min(MIN_DASHBOARD_REFRESH_SECONDS)
    .max(3600)
    .optional(),
  sessionTimeoutMinutes: z
    .number()
    .int()
    .min(MIN_SESSION_TIMEOUT_MINUTES)
    .max(MAX_SESSION_TIMEOUT_MINUTES)
    .optional(),
  modules: modulesSchema.optional(),
});

// ~1.5 MB of base64 data URL — comfortably fits a small shop logo.
const MAX_LOGO_LENGTH = 1_500_000;
const logoSchema = z
  .string()
  .max(MAX_LOGO_LENGTH)
  .refine((v) => v === '' || /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/.test(v), {
    message: 'Logo must be a base64-encoded image',
  })
  .optional();

const profileSchema = z.object({
  companyName: z.string().min(1).max(100),
  proprietor: z.string().max(100).optional(),
  logoUrl: logoSchema,
});

const preferencesSchema = z.object({
  dashboardRefreshSeconds: z
    .number()
    .int()
    .min(MIN_DASHBOARD_REFRESH_SECONDS)
    .max(3600)
    .optional(),
  sessionTimeoutMinutes: z
    .number()
    .int()
    .min(MIN_SESSION_TIMEOUT_MINUTES)
    .max(MAX_SESSION_TIMEOUT_MINUTES)
    .optional(),
  qrCodesEnabled: z.boolean().optional(),
  cashLimit: z.number().nonnegative().optional(),
  receiptLanguage: z.enum(['en', 'ta']).optional(),
  modules: modulesSchema.optional(),
});

settingsRouter.get('/organization', async (_req, res, next) => {
  try {
    const data = await getOrganizationSettings();
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

settingsRouter.put('/organization', requirePermission('branches.write'), async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const data = await updateOrganizationSettings(body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

settingsRouter.put('/preferences', requirePermission('branches.write'), async (req, res, next) => {
  try {
    const body = preferencesSchema.parse(req.body);
    const data = await updateOrganizationSettings(body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

settingsRouter.put('/organization/all', requirePermission('branches.write'), async (req, res, next) => {
  try {
    const body = organizationSchema.parse(req.body);
    const data = await updateOrganizationSettings(body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
