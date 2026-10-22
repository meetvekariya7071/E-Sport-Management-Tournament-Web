import { prisma } from '../config/db';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { broadcastDisputeEvent, broadcastScoreUpdate } from './socket.service';
import { Roles } from '../types';

export interface CreateDisputeInput {
  tournamentId: string;
  matchId: string;
  claimantId: string;
  reason: string;
  description: string;
  proofUrl?: string;
}

export interface ResolveDisputeInput {
  action: 'INVESTIGATE' | 'ACCEPT_OVERWRITE' | 'DISMISS';
  resolutionNotes: string;
  scoreAdjustments?: Array<{
    participantId: string;
    score: number;
    kills?: number;
    placement?: number;
    isWinner?: boolean;
  }>;
}

export class DisputeService {
  /**
   * Creates a new dispute ticket raised by a player.
   */
  static async createDispute(input: CreateDisputeInput, ipAddress?: string) {
    const { tournamentId, matchId, claimantId, reason, description, proofUrl } = input;

    // Check match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        results: true
      }
    });

    if (!match || match.tournamentId !== tournamentId) {
      throw new Error(`Match '${matchId}' not found in tournament '${tournamentId}'.`);
    }

    // Check claimant is registered in tournament
    const participant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId: claimantId
        }
      }
    });

    if (!participant) {
      throw new Error('You must be a registered participant in this tournament to raise a dispute.');
    }

    // Create the dispute ticket
    const dispute = await prisma.dispute.create({
      data: {
        tournamentId,
        matchId,
        claimantId,
        reason,
        description,
        proofUrl: proofUrl || null,
        status: 'OPEN'
      },
      include: {
        claimant: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        match: {
          select: {
            id: true,
            matchNumber: true,
            status: true
          }
        }
      }
    });

    // Mark match status as DISPUTED
    await prisma.match.update({
      where: { id: matchId },
      data: { status: 'DISPUTED' }
    });

    // 1. Audit Log
    await AuditService.log({
      actorId: claimantId,
      action: 'DISPUTE_RAISED',
      targetEntity: 'DISPUTE',
      targetId: dispute.id,
      ipAddress,
      details: {
        tournamentId,
        matchId,
        reason,
        description
      }
    });

    // 2. Broadcast via socket
    broadcastDisputeEvent(tournamentId, 'created', {
      dispute,
      matchId
    });

    // 3. Notify Organizer
    const staffIds: string[] = [];
    if (match.tournament.organizerId) staffIds.push(match.tournament.organizerId);
    

    await NotificationService.notifyMany(staffIds, {
      title: 'New Match Dispute Raised',
      message: `Dispute raised on Match #${match.matchNumber} in "${match.tournament.title}": ${reason}`,
      type: 'DISPUTE',
      link: `/organizer/disputes`
    });

    return dispute;
  }

  /**
   * Retrieves all disputes scoped to a tournament.
   */
  static async getDisputesByTournament(tournamentId: string, status?: string) {
    const where: any = { tournamentId };
    if (status) {
      where.status = status;
    }

    return prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        claimant: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true
          }
        },
        resolvedBy: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        match: {
          include: {
            round: {
              select: {
                id: true,
                roundNumber: true,
                name: true
              }
            },
            results: {
              include: {
                participant: {
                  include: {
                    user: {
                      select: { id: true, username: true, avatarUrl: true }
                    },
                    team: {
                      select: { id: true, name: true, tag: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Retrieves disputes across tournaments based on user's role.
   */
  static async getDisputesForUser(
    userId: string,
    role: string,
    query: { tournamentId?: string; status?: string }
  ) {
    const where: any = {};
    if (query.tournamentId) {
      where.tournamentId = query.tournamentId;
    }
    if (query.status) {
      where.status = query.status;
    }

    if (role === Roles.ORGANIZER) {
      where.tournament = { organizerId: userId };
    
    } else if (role === Roles.PLAYER) {
      where.claimantId = userId;
    }
    // Admin sees all

    return prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true
          }
        },
        claimant: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        resolvedBy: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        match: {
          include: {
            round: {
              select: {
                roundNumber: true,
                name: true
              }
            },
            results: {
              include: {
                participant: {
                  include: {
                    user: { select: { id: true, username: true } },
                    team: { select: { id: true, name: true } }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Resolves, investigates, or dismisses a dispute ticket.
   */
  static async resolveDispute(
    disputeId: string,
    resolverId: string,
    resolverRole: string,
    input: ResolveDisputeInput,
    ipAddress?: string
  ) {
    const { action, resolutionNotes, scoreAdjustments } = input;

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tournament: true,
        match: {
          include: {
            results: true
          }
        },
        claimant: true
      }
    });

    if (!dispute) {
      throw new Error(`Dispute ticket '${disputeId}' not found.`);
    }

    // RBAC validation: Organizer of tournament or Admin
    
    const isOrganizer = dispute.tournament.organizerId === resolverId;
    const isAdmin = resolverRole === Roles.ADMIN;

    if (!isOrganizer && !isAdmin) {
      throw new Error('Unauthorized: You do not have permissions to resolve disputes for this tournament.');
    }

    const now = new Date();
    let newStatus = 'INVESTIGATING';

    if (action === 'ACCEPT_OVERWRITE') {
      newStatus = 'RESOLVED';
    } else if (action === 'DISMISS') {
      newStatus = 'DISMISSED';
    } else {
      newStatus = 'INVESTIGATING';
    }

    // If scores are overwritten
    if (action === 'ACCEPT_OVERWRITE' && Array.isArray(scoreAdjustments) && scoreAdjustments.length > 0) {
      for (const adj of scoreAdjustments) {
        await prisma.scoreRecord.upsert({
          where: {
            matchId_participantId: {
              matchId: dispute.matchId,
              participantId: adj.participantId
            }
          },
          update: {
            score: adj.score,
            kills: adj.kills ?? 0,
            placement: adj.placement ?? null,
            isWinner: adj.isWinner ?? false
          },
          create: {
            matchId: dispute.matchId,
            participantId: adj.participantId,
            score: adj.score,
            kills: adj.kills ?? 0,
            placement: adj.placement ?? null,
            isWinner: adj.isWinner ?? false,
            tournamentId: dispute.tournamentId
          }
        });
      }

      // Log score override audit
      await AuditService.log({
        actorId: resolverId,
        action: 'SCORE_OVERRIDE',
        targetEntity: 'MATCH',
        targetId: dispute.matchId,
        ipAddress,
        details: {
          disputeId,
          scoreAdjustments,
          resolutionNotes
        }
      });

      // Broadcast updated score
      broadcastScoreUpdate(dispute.tournamentId, {
        matchId: dispute.matchId,
        scores: scoreAdjustments,
        status: 'COMPLETED'
      });
    }

    // Reset match status if dispute is resolved or dismissed
    if (newStatus === 'RESOLVED' || newStatus === 'DISMISSED') {
      await prisma.match.update({
        where: { id: dispute.matchId },
        data: {
          status: 'COMPLETED',
          isVerified: true,
          verifiedById: resolverId,
          verifiedAt: now
        }
      });
    }

    // Update dispute record
    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        resolutionNotes,
        resolvedById: resolverId,
        resolvedAt: now
      },
      include: {
        claimant: {
          select: { id: true, username: true }
        },
        resolvedBy: {
          select: { id: true, username: true, role: true }
        }
      }
    });

    // 1. Audit Log
    await AuditService.log({
      actorId: resolverId,
      action: 'DISPUTE_RESOLVED',
      targetEntity: 'DISPUTE',
      targetId: disputeId,
      ipAddress,
      details: {
        action,
        newStatus,
        resolutionNotes
      }
    });

    // 2. Broadcast via socket
    broadcastDisputeEvent(dispute.tournamentId, 'resolved', {
      disputeId,
      status: newStatus,
      resolutionNotes,
      matchId: dispute.matchId
    });

    // 3. Notify the claimant
    let notifTitle = 'Dispute Update';
    let notifMsg = `Your dispute regarding Match #${dispute.match.matchNumber} in "${dispute.tournament.title}" is now: ${newStatus}. Notes: ${resolutionNotes}`;

    await NotificationService.create({
      userId: dispute.claimantId,
      title: notifTitle,
      message: notifMsg,
      type: 'DISPUTE',
      link: `/player/my-tournaments`
    });

    return updatedDispute;
  }
}
