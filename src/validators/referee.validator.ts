import { z } from 'zod';

export const verifyScoreSchema = z.object({
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().default('Scorecard officially validated by referee.'),
  override: z.boolean().optional().default(false),
  scores: z
    .array(
      z.object({
        participantId: z.string().min(1, 'participantId is required'),
        score: z.coerce.number().int().default(0),
        kills: z.coerce.number().int().min(0).optional().default(0),
        placement: z.coerce.number().int().min(1).optional().nullable(),
        isWinner: z.boolean().optional().default(false)
      })
    )
    .optional()
});

export const updateDisputeSchema = z.object({
  action: z.enum(['UPHOLD', 'DISMISS', 'INVESTIGATE'], {
    required_error: 'Action must be UPHOLD, DISMISS, or INVESTIGATE'
  }),
  resolutionNotes: z
    .string({ required_error: 'Resolution notes are mandatory' })
    .min(3, 'Resolution notes must be at least 3 characters')
    .max(2000, 'Resolution notes cannot exceed 2000 characters'),
  overturnResult: z
    .object({
      type: z.enum(['FORFEIT_WALKOVER', 'DOCK_POINTS', 'OVERWRITE_SCORES']).optional(),
      winnerParticipantId: z.string().optional(),
      forfeitParticipantId: z.string().optional(),
      dockedParticipantId: z.string().optional(),
      pointsDeducted: z.coerce.number().int().optional(),
      scoreAdjustments: z
        .array(
          z.object({
            participantId: z.string(),
            score: z.coerce.number().int(),
            kills: z.coerce.number().int().optional(),
            placement: z.coerce.number().int().optional().nullable(),
            isWinner: z.boolean().optional()
          })
        )
        .optional()
    })
    .optional()
});

export const sanctionPlayerSchema = z.object({
  tournamentId: z.string().optional(),
  matchId: z.string().optional(),
  action: z.enum(['ISSUE_WARNING', 'DISQUALIFY_MATCH', 'ESCALATE_ADMIN'], {
    required_error: 'Sanction action must be ISSUE_WARNING, DISQUALIFY_MATCH, or ESCALATE_ADMIN'
  }),
  reason: z
    .string({ required_error: 'Reason is required for disciplinary action' })
    .min(3, 'Reason must be at least 3 characters')
    .max(1000, 'Reason cannot exceed 1000 characters'),
  evidenceUrl: z.string().url('Evidence URL must be a valid link').optional().nullable().or(z.literal('')),
  notes: z.string().max(2000).optional().nullable()
});
