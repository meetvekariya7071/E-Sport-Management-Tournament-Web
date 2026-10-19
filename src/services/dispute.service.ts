import { prisma } from '../config/db';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { broadcastTournamentEvent } from '../config/socket';

export interface CreateDisputeDTO {
  tournamentId: string;
  matchId?: string;
  raisedById: string;
  reason: string;
  description: string;
  proofUrl?: string;
  ipAddress?: string;
}

export interface ResolveDisputeDTO {
  disputeId: string;
  resolvedById: string;
  status: 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolutionNote: string;
  overwriteScore?: {
    matchId: string;
    results: Array<{
      participantId: string;
      score: number;
      kills?: number;
      placement?: number;
      isWinner?: boolean;
    }>;
  };
  ipAddress?: string;
}

export class DisputeService {
  /**
   * Player raises a dispute ticket
   */
  static async createDispute(dto: CreateDisputeDTO) {
    // Verify participant is in this tournament
    const participant = await prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId: dto.tournamentId,
        userId: dto.raisedById
      }
    });

    if (!participant) {
      throw new Error('You must be a participant in this tournament to raise a dispute.');
    }

    if (dto.matchId) {
      const match = await prisma.match.findUnique({
        where: { id: dto.matchId }
      });
      if (!match || match.tournamentId !== dto.tournamentId) {
        throw new Error('Match does not belong to this tournament.');
      }
    }

    const dispute = await prisma.dispute.create({
      data: {
        tournamentId: dto.tournamentId,
        matchId: dto.matchId || null,
        raisedById: dto.raisedById,
        reason: dto.reason,
        description: dto.description,
        proofUrl: dto.proofUrl || null,
        status: 'OPEN'
      },
      include: {
        raisedBy: { select: { id: true, username: true, email: true } },
        match: {
          select: {
            id: true,
            matchNumber: true,
            status: true,
            round: { select: { roundNumber: true, name: true } }
          }
        },
        tournament: { select: { id: true, title: true, organizerId: true } }
      }
    });

    // Notify Organizer
    if (dispute.tournament.organizerId) {
      await NotificationService.send({
        userId: dispute.tournament.organizerId,
        title: `Dispute Filed: ${dispute.tournament.title}`,
        message: `${dispute.raisedBy.username} opened a dispute for "${dto.reason}".`,
        type: 'DISPUTE_UPDATE',
        link: `/organizer/disputes`
      });
    }

    // Audit log
    await AuditService.log({
      actorId: dto.raisedById,
      actionType: 'DISPUTE_RAISE',
      targetEntity: 'DISPUTE',
      targetId: dispute.id,
      details: {
        tournamentId: dto.tournamentId,
        matchId: dto.matchId,
        reason: dto.reason
      },
      ipAddress: dto.ipAddress
    });

    return dispute;
  }

  /**
   * Get disputes scoped to a tournament
   */
  static async getTournamentDisputes(tournamentId: string, status?: string) {
    const where: any = { tournamentId };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    return prisma.dispute.findMany({
      where,
      include: {
        raisedBy: { select: { id: true, username: true, email: true } },
        resolvedBy: { select: { id: true, username: true } },
        match: {
          include: {
            round: { select: { roundNumber: true, name: true } },
            results: {
              include: {
                participant: {
                  include: {
                    user: { select: { username: true } },
                    team: { select: { name: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all disputes across tournaments (for organizer / referee / admin view)
   */
  static async getAllDisputes(filters: {
    tournamentId?: string;
    status?: string;
    userId?: string;
    userRole?: string;
  }) {
    const where: any = {};

    if (filters.tournamentId) {
      where.tournamentId = filters.tournamentId;
    }

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    // If organizer, only their tournaments
    if (filters.userRole === 'ORGANIZER' && filters.userId) {
      where.tournament = { organizerId: filters.userId };
    }

    // If referee, only tournaments where they are assigned to matches or refereeing
    if (filters.userRole === 'REFEREE' && filters.userId) {
      where.match = { refereeId: filters.userId };
    }

    return prisma.dispute.findMany({
      where,
      include: {
        raisedBy: { select: { id: true, username: true, email: true } },
        resolvedBy: { select: { id: true, username: true } },
        tournament: { select: { id: true, title: true } },
        match: {
          include: {
            round: { select: { roundNumber: true, name: true } },
            results: {
              include: {
                participant: {
                  include: {
                    user: { select: { username: true } },
                    team: { select: { name: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Resolve or update dispute (Investigate, Dismiss, or Resolve & Overwrite)
   */
  static async resolveDispute(dto: ResolveDisputeDTO) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: dto.disputeId },
      include: {
        tournament: { select: { id: true, title: true, organizerId: true } },
        raisedBy: { select: { id: true, username: true } },
        match: true
      }
    });

    if (!dispute) {
      throw new Error('Dispute ticket not found.');
    }

    // If overwriting score
    if (dto.overwriteScore && dto.overwriteScore.matchId) {
      const { matchId, results } = dto.overwriteScore;

      // Update match results in transaction
      await prisma.$transaction(async (tx) => {
        for (const res of results) {
          await tx.matchResult.upsert({
            where: {
              matchId_participantId: {
                matchId,
                participantId: res.participantId
              }
            },
            update: {
              score: res.score,
              kills: res.kills ?? 0,
              placement: res.placement ?? null,
              isWinner: res.isWinner ?? false
            },
            create: {
              matchId,
              participantId: res.participantId,
              score: res.score,
              kills: res.kills ?? 0,
              placement: res.placement ?? null,
              isWinner: res.isWinner ?? false
            }
          });
        }

        // Find winner if any
        const winner = results.find((r) => r.isWinner);
        await tx.match.update({
          where: { id: matchId },
          data: {
            status: 'COMPLETED',
            winnerParticipantId: winner ? winner.participantId : undefined,
            completedAt: new Date()
          }
        });
      });

      // Broadcast real-time score alteration
      broadcastTournamentEvent(dispute.tournamentId, 'match:update_score', {
        matchId,
        tournamentId: dispute.tournamentId,
        reason: 'Dispute Score Overwrite'
      });

      // Audit score override
      await AuditService.log({
        actorId: dto.resolvedById,
        actionType: 'SCORE_OVERRIDE',
        targetEntity: 'MATCH',
        targetId: matchId,
        details: { disputeId: dispute.id, overwriteResults: results },
        ipAddress: dto.ipAddress
      });
    }

    // Update dispute record
    const updated = await prisma.dispute.update({
      where: { id: dto.disputeId },
      data: {
        status: dto.status,
        resolutionNote: dto.resolutionNote,
        resolvedById: dto.resolvedById,
        resolvedAt: dto.status === 'INVESTIGATING' ? null : new Date()
      },
      include: {
        raisedBy: { select: { id: true, username: true } },
        resolvedBy: { select: { id: true, username: true } }
      }
    });

    // Notify player who raised dispute
    await NotificationService.send({
      userId: dispute.raisedById,
      title: `Dispute Status Updated: ${dispute.tournament.title}`,
      message: `Your dispute has been marked as ${dto.status}. Note: "${dto.resolutionNote}"`,
      type: 'DISPUTE_UPDATE',
      link: `/player/my-tournaments`
    });

    // Audit dispute resolution
    await AuditService.log({
      actorId: dto.resolvedById,
      actionType: 'DISPUTE_RESOLVE',
      targetEntity: 'DISPUTE',
      targetId: dispute.id,
      details: {
        status: dto.status,
        resolutionNote: dto.resolutionNote
      },
      ipAddress: dto.ipAddress
    });

    return updated;
  }
}
