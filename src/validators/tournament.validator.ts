import { z } from 'zod';
import { TournamentFormats } from '../types';

/**
 * Zod validation schema for creating a new Tournament.
 */
export const createTournamentSchema = z.object({
  title: z
    .string({ required_error: 'Tournament title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
  slug: z
    .string({ required_error: 'Tournament slug is required' })
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens')
    .trim(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  bannerImage: z.string().url('Banner image must be a valid URL').optional().nullable().or(z.literal('')),
  prizePool: z.string().max(50, 'Prize pool text cannot exceed 50 characters').optional().nullable(),
  structure: z
    .enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'BATTLE_ROYALE_POINTS', 'SWISS'])
    .optional()
    .default('SINGLE_ELIMINATION'),
  gameId: z
    .string({ required_error: 'Target game ID is required' })
    .min(1, 'Target game ID cannot be empty'),
  format: z.enum([TournamentFormats.SOLO, TournamentFormats.DUO, TournamentFormats.SQUAD], {
    required_error: 'Tournament format is required (SOLO, DUO, or SQUAD)'
  }),
  maxParticipants: z.coerce
    .number({ required_error: 'Max participants capacity is required' })
    .int('Max participants must be an integer')
    .min(2, 'Tournament must allow at least 2 participants/teams')
    .max(256, 'Max capacity cannot exceed 256 participants'),
  registrationStartDate: z
    .string({ required_error: 'Registration start date is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Registration start date must be a valid ISO 8601 date string'
    }),
  registrationEndDate: z
    .string({ required_error: 'Registration end date is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Registration end date must be a valid ISO 8601 date string'
    }),
  startDate: z
    .string({ required_error: 'Start date is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Start date must be a valid ISO 8601 date string'
    }),
  endDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'End date must be a valid ISO 8601 date string'
    }),
  rules: z.any().optional()
}).refine(
  (data) => new Date(data.registrationStartDate).getTime() < new Date(data.registrationEndDate).getTime(),
  {
    message: 'Registration start date must be strictly before registration end date',
    path: ['registrationEndDate']
  }
).refine(
  (data) => new Date(data.registrationEndDate).getTime() <= new Date(data.startDate).getTime(),
  {
    message: 'Registration end date must be on or before tournament start date',
    path: ['startDate']
  }
).refine(
  (data) => !data.endDate || new Date(data.startDate).getTime() < new Date(data.endDate).getTime(),
  {
    message: 'Tournament start date must be strictly before tournament end date',
    path: ['endDate']
  }
);

/**
 * Zod validation schema for creating a Team.
 */
export const createTeamSchema = z.object({
  name: z
    .string({ required_error: 'Team name is required' })
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name cannot exceed 50 characters')
    .trim(),
  tag: z
    .string()
    .min(2, 'Team tag must be at least 2 characters')
    .max(6, 'Team tag cannot exceed 6 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Team tag must only contain alphanumeric characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  inGameName: z
    .string()
    .min(1, 'In-game name must be at least 1 character')
    .max(30, 'In-game name cannot exceed 30 characters')
    .trim()
    .optional()
});

/**
 * Zod validation schema for joining a Team using an Invite Code.
 */
export const joinTeamSchema = z.object({
  inviteCode: z
    .string({ required_error: 'Invite code is required' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, 'Invite code must be exactly 6 uppercase alphanumeric characters'),
  inGameName: z
    .string()
    .min(1, 'In-game name must be at least 1 character')
    .max(30, 'In-game name cannot exceed 30 characters')
    .trim()
    .optional()
});

/**
 * Zod validation schema for solo player registration.
 */
export const registerSoloSchema = z.object({
  inGameName: z
    .string()
    .min(1, 'In-game name must be at least 1 character')
    .max(30, 'In-game name cannot exceed 30 characters')
    .trim()
    .optional()
});

/**
 * Competitor match score payload.
 */
export const competitorScoreSchema = z.object({
  participantId: z.string({ required_error: 'Participant ID is required' }).min(1),
  score: z.coerce.number().min(0, 'Score cannot be negative'),
  kills: z.coerce.number().min(0, 'Kills cannot be negative').optional().default(0),
  placement: z.coerce.number().int().min(1, 'Placement must be at least 1').optional().nullable(),
  isWinner: z.boolean().optional().default(false)
});

/**
 * Zod validation schema for updating a single Match Score.
 */
export const updateMatchScoreSchema = z.object({
  scores: z
    .array(competitorScoreSchema)
    .min(1, 'At least one competitor score entry is required')
});

/**
 * Zod validation schema for publishing round scores matrix.
 */
export const publishRoundSchema = z.object({
  roundId: z.string({ required_error: 'Round ID is required' }).min(1),
  matchScores: z
    .array(
      z.object({
        matchId: z.string({ required_error: 'Match ID is required' }).min(1),
        scores: z.array(competitorScoreSchema).min(1, 'Scores array cannot be empty')
      })
    )
    .min(1, 'At least one match score record is required')
});
