import { z } from 'zod';
import { TournamentFormats } from '../types';

export const createTournamentSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Tournament title is required' })
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title cannot exceed 100 characters'),
    slug: z
      .string({ required_error: 'URL slug is required' })
      .min(3, 'Slug must be at least 3 characters')
      .max(80, 'Slug cannot exceed 80 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug must consist only of lowercase alphanumeric characters and hyphens'),
    description: z.string().max(1000).optional(),
    bannerImage: z.string().url('Banner image must be a valid URL').optional().or(z.literal('')),
    prizePool: z.string().max(100).optional(),
    structure: z.enum(['SINGLE_ELIMINATION', 'ROUND_ROBIN', 'LEADERBOARD_POINTS']).default('SINGLE_ELIMINATION'),
    gameId: z.string({ required_error: 'Game ID is required' }).uuid('Game ID must be a valid UUID'),
    format: z.enum([TournamentFormats.SOLO, TournamentFormats.DUO, TournamentFormats.SQUAD], {
      required_error: 'Format is required (SOLO, DUO, or SQUAD)'
    }),
    maxParticipants: z
      .number({ required_error: 'Max participants is required' })
      .int('Must be an integer')
      .min(2, 'Must support at least 2 participants')
      .max(256, 'Max participants cannot exceed 256'),
    registrationStartDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Registration start date must be a valid ISO date string' }),
    registrationEndDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Registration end date must be a valid ISO date string' }),
    startDate: z
      .string({ required_error: 'Start date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Start date must be a valid ISO date string' }),
    endDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'End date must be a valid ISO date string' }),
    rules: z.any().optional()
  }).superRefine((data, ctx) => {
    const regStart = data.registrationStartDate ? new Date(data.registrationStartDate).getTime() : null;
    const regEnd = data.registrationEndDate ? new Date(data.registrationEndDate).getTime() : null;
    const start = new Date(data.startDate).getTime();
    const end = data.endDate ? new Date(data.endDate).getTime() : null;

    if (regStart !== null && regEnd !== null) {
      if (regStart >= regEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'registrationStartDate must be strictly before registrationEndDate',
          path: ['registrationEndDate']
        });
      }
    }

    if (regEnd !== null) {
      if (regEnd > start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'registrationEndDate must be on or before startDate',
          path: ['startDate']
        });
      }
    }

    if (end !== null) {
      if (start >= end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'startDate must be strictly before endDate',
          path: ['endDate']
        });
      }
    }
  })
});

export const registerSoloSchema = z.object({
  body: z.object({
    inGameName: z.string().min(2, 'In-game name must be at least 2 characters').max(50).optional()
  })
});

export const createTeamSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Team name is required' })
      .min(2, 'Team name must be at least 2 characters')
      .max(40, 'Team name cannot exceed 40 characters'),
    tag: z.string().max(6, 'Team tag cannot exceed 6 characters').optional(),
    inGameName: z.string().min(2, 'Captain in-game name must be at least 2 characters').max(50).optional()
  })
});

export const joinTeamSchema = z.object({
  body: z.object({
    inviteCode: z
      .string({ required_error: 'Team invite code is required' })
      .min(4, 'Invite code must be at least 4 characters')
      .max(12, 'Invite code cannot exceed 12 characters')
      .regex(/^[a-zA-Z0-9]+$/, 'Invite code must be alphanumeric'),
    inGameName: z.string().min(2, 'In-game name must be at least 2 characters').max(50).optional()
  })
});

export const updateMatchScoreSchema = z.object({
  body: z.object({
    scores: z
      .array(
        z.object({
          participantId: z.string({ required_error: 'Participant ID is required' }),
          score: z.number().int().min(0, 'Score cannot be negative'),
          kills: z.number().int().min(0, 'Kills cannot be negative').optional(),
          placement: z.number().int().min(1, 'Placement must be at least 1').optional(),
          isWinner: z.boolean().optional()
        })
      )
      .min(1, 'Scores array must contain at least one competitor entry'),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED']).optional()
  })
});
