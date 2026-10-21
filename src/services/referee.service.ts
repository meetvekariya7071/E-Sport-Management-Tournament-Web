import { prisma } from '../config/db';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import {
  broadcastMatchVerification,
  broadcastParticipantStatus,
  broadcastScoreUpdate,
  broadcastBracketAdvance,
  broadcastDisputeEvent
} from './socket.service';
import { Roles, MatchStatuses, ParticipantStatuses, TournamentStatuses } from '../types';

export class RefereeService {
  /**
   * Fetches matches assigned to the referee or scoped to an assigned tournament.
   */
  static async getAssignedMatches(userId: string, role: string, tournamentId?: string) {
    const where: any = {};

    if (tournamentId) {
      where.tournamentId = tournamentId;
    }

    if (role === Roles.REFEREE) {
      where.OR = [
        { refereeId: userId },
        { tournament: { organizerId: userId } }
      ];
    } else if (role === Roles.ORGANIZER) {
      where.tournament = { organizerId: userId };
    }
    // Admins see all matches

    const matches = await prisma.match.findMany({
      where,
      orderBy: [
        { round: { roundNumber: 'asc' } },
        { matchNumber: 'asc' }
      ],
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            format: true,
            status: true,
            structure: true,
            game: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                platform: true
              }
            }
          }
        },
        round: {
          select: {
            id: true,
            roundNumber: true,
            name: true,
            stage: true
          }
        },
        referee: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        results: {
          include: {
            participant: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true
                  }
                },
                team: {
                  select: {
                    id: true,
                    name: true,
                    tag: true
                  }
                }
              }
            }
          }
        },
        disputes: {
          select: {
            id: true,
            status: true,
            reason: true,
            createdAt: true
          }
        }
      }
    });

    return matches;
  }

  /**
   * Fetch single match details for the Score Verification page.
   */
  static async getMatchById(matchId: string, userId: string, role: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            game: true,
            organizer: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        round: true,
        referee: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        results: {
          include: {
            participant: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true
                  }
                },
                team: {
                  include: {
                    members: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            username: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        disputes: {
          include: {
            claimant: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      throw new Error(`Match with ID '${matchId}' not found.`);
    }

    return match;
  }

  /**
   * POST /api/referee/matches/:id/verify-score
   * Verifies match scores, optionally updating/overriding scores,
   * stamps verification metadata (isVerified: true), and advances bracket.
   */
  static async verifyMatchScore(
    matchId: string,
    verifierId: string,
    role: string,
    payload: {
      notes?: string;
      override?: boolean;
      scores?: Array<{
        participantId: string;
        score: number;
        kills?: number;
        placement?: number | null;
        isWinner?: boolean;
      }>;
    },
    ipAddress?: string
  ) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            participants: {
              include: {
                user: true,
                team: true
              }
            }
          }
        },
        round: true,
        results: {
          include: {
            participant: {
              include: { user: true, team: true }
            }
          }
        }
      }
    });

    if (!match) {
      throw new Error(`Match with ID '${matchId}' not found.`);
    }

    const isAssignedReferee = match.refereeId === verifierId;
    const isOrganizer = match.tournament.organizerId === verifierId;
    const isAdmin = role === Roles.ADMIN;

    if (!isAssignedReferee && !isOrganizer && !isAdmin) {
      throw new Error('Unauthorized: You are not assigned to referee or manage this match.');
    }

    const now = new Date();
    const verificationNotes = payload.notes?.trim() || 'Scorecard officially validated by referee.';
    let advancedPayload: any = null;

    const updatedMatch = await prisma.$transaction(async (tx) => {
      // 1. If scores provided, update/override them
      if (payload.scores && Array.isArray(payload.scores) && payload.scores.length > 0) {
        let highestScore = -Infinity;
        let winnerId: string | null = null;

        for (const item of payload.scores) {
          if (item.isWinner) {
            winnerId = item.participantId;
            break;
          }
          if (Number(item.score) > highestScore) {
            highestScore = Number(item.score);
            winnerId = item.participantId;
          }
        }

        for (const item of payload.scores) {
          const isCurrentWinner = item.participantId === winnerId;
          await tx.scoreRecord.upsert({
            where: {
              matchId_participantId: {
                matchId,
                participantId: item.participantId
              }
            },
            update: {
              score: Number(item.score),
              kills: item.kills ? Number(item.kills) : 0,
              placement: item.placement ? Number(item.placement) : null,
              isWinner: isCurrentWinner,
              tournamentId: match.tournamentId,
              roundNumber: match.round.roundNumber
            },
            create: {
              tournamentId: match.tournamentId,
              roundNumber: match.round.roundNumber,
              matchId,
              participantId: item.participantId,
              score: Number(item.score),
              kills: item.kills ? Number(item.kills) : 0,
              placement: item.placement ? Number(item.placement) : null,
              isWinner: isCurrentWinner
            }
          });
        }

        // Bracket advancement if single elimination
        if (match.tournament.structure === 'SINGLE_ELIMINATION' && match.nextMatchId && winnerId) {
          const nextMatch = await tx.match.findUnique({
            where: { id: match.nextMatchId }
          });

          if (nextMatch) {
            await tx.scoreRecord.upsert({
              where: {
                matchId_participantId: {
                  matchId: nextMatch.id,
                  participantId: winnerId
                }
              },
              update: {
                tournamentId: match.tournamentId,
                score: 0,
                kills: 0,
                isWinner: false
              },
              create: {
                tournamentId: match.tournamentId,
                matchId: nextMatch.id,
                participantId: winnerId,
                score: 0,
                kills: 0,
                isWinner: false
              }
            });

            if (nextMatch.status === MatchStatuses.PENDING) {
              await tx.match.update({
                where: { id: nextMatch.id },
                data: { status: MatchStatuses.SCHEDULED }
              });
            }

            const winnerParticipant = match.tournament.participants.find((p) => p.id === winnerId);
            const winnerName =
              winnerParticipant?.team?.name || winnerParticipant?.user.username || 'Winner';

            advancedPayload = {
              sourceMatchId: matchId,
              winnerParticipantId: winnerId,
              winnerName,
              nextMatchId: nextMatch.id,
              nextMatchSlot: match.nextMatchSlot || 1,
              targetRoundNumber: match.round.roundNumber + 1
            };
          }
        }
      } else {
        // No score override: verify existing scores and advance if needed
        const existingResults = await tx.scoreRecord.findMany({
          where: { matchId }
        });

        if (existingResults.length === 0) {
          throw new Error('Cannot verify scorecard: No score records have been submitted for this match yet.');
        }

        const winner = existingResults.find((r) => r.isWinner);
        if (match.tournament.structure === 'SINGLE_ELIMINATION' && match.nextMatchId && winner) {
          const nextMatch = await tx.match.findUnique({
            where: { id: match.nextMatchId }
          });

          if (nextMatch) {
            await tx.scoreRecord.upsert({
              where: {
                matchId_participantId: {
                  matchId: nextMatch.id,
                  participantId: winner.participantId
                }
              },
              update: {
                tournamentId: match.tournamentId
              },
              create: {
                tournamentId: match.tournamentId,
                matchId: nextMatch.id,
                participantId: winner.participantId,
                score: 0,
                kills: 0,
                isWinner: false
              }
            });

            const winnerParticipant = match.tournament.participants.find((p) => p.id === winner.participantId);
            const winnerName =
              winnerParticipant?.team?.name || winnerParticipant?.user.username || 'Winner';

            advancedPayload = {
              sourceMatchId: matchId,
              winnerParticipantId: winner.participantId,
              winnerName,
              nextMatchId: nextMatch.id,
              nextMatchSlot: match.nextMatchSlot || 1,
              targetRoundNumber: match.round.roundNumber + 1
            };
          }
        }
      }

      // Mark match as verified and completed
      return tx.match.update({
        where: { id: matchId },
        data: {
          isVerified: true,
          verifiedById: verifierId,
          verifiedAt: now,
          verificationNotes,
          status: MatchStatuses.COMPLETED,
          completedAt: now
        },
        include: {
          verifiedBy: {
            select: {
              id: true,
              username: true,
              role: true
            }
          },
          results: {
            include: {
              participant: {
                include: { user: true, team: true }
              }
            }
          }
        }
      });
    });

    // 2. Audit Trail
    await AuditService.log({
      actorId: verifierId,
      action: payload.override ? 'SCORE_OVERRIDE' : 'REFEREE_VERIFIED',
      targetEntity: 'MATCH',
      targetId: matchId,
      ipAddress,
      details: {
        tournamentId: match.tournamentId,
        matchNumber: match.matchNumber,
        verificationNotes,
        scoresOverridden: Boolean(payload.override),
        verifiedAt: now.toISOString()
      }
    });

    // 3. Real-time Socket Broadcasts
    broadcastMatchVerification(match.tournamentId, {
      matchId,
      isVerified: true,
      verifiedBy: updatedMatch.verifiedBy,
      verifiedAt: now.toISOString(),
      verificationNotes
    });

    if (payload.scores) {
      broadcastScoreUpdate(match.tournamentId, {
        matchId,
        roundId: match.roundId,
        scores: payload.scores,
        status: MatchStatuses.COMPLETED
      });
    }

    if (advancedPayload) {
      broadcastBracketAdvance(match.tournamentId, advancedPayload);
    }

    // 4. Notifications
    const participantUserIds = match.results
      .map((r: any) => r.participant.user?.id)
      .filter((uid: any): uid is string => Boolean(uid) && uid !== verifierId);

    if (match.tournament.organizerId && match.tournament.organizerId !== verifierId) {
      participantUserIds.push(match.tournament.organizerId);
    }

    await NotificationService.notifyMany(participantUserIds, {
      title: 'Match Scores Verified by Referee',
      message: `Scorecard for Match #${match.matchNumber} in "${match.tournament.title}" has been signed off: ${verificationNotes}`,
      type: 'SCORE_UPDATE',
      link: `/tournaments/${match.tournamentId}`
    });

    return updatedMatch;
  }

  /**
   * One-click scorecard verification by referee or admin (Alias).
   */
  static async verifyMatchScorecard(
    matchId: string,
    verifierId: string,
    role: string,
    notes?: string,
    ipAddress?: string
  ) {
    return this.verifyMatchScore(
      matchId,
      verifierId,
      role,
      { notes, override: false },
      ipAddress
    );
  }

  /**
   * GET /api/referee/disputes
   * Fetches open and assigned tickets for referee's matches.
   */
  static async getAssignedDisputes(
    userId: string,
    role: string,
    query?: { status?: string; tournamentId?: string }
  ) {
    const where: any = {};

    if (query?.tournamentId) {
      where.tournamentId = query.tournamentId;
    }

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (role === Roles.REFEREE) {
      where.OR = [
        { match: { refereeId: userId } },
        { tournament: { organizerId: userId } }
      ];
    } else if (role === Roles.ORGANIZER) {
      where.tournament = { organizerId: userId };
    }
    // Admins see all

    const disputes = await prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            slug: true,
            format: true,
            status: true
          }
        },
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
                name: true,
                stage: true
              }
            },
            results: {
              include: {
                participant: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true
                      }
                    },
                    team: {
                      select: {
                        id: true,
                        name: true,
                        tag: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return disputes;
  }

  /**
   * PATCH /api/referee/disputes/:disputeId
   * Uphold or Dismiss dispute tickets with notification and match override logic.
   */
  static async resolveDispute(
    disputeId: string,
    resolverId: string,
    resolverRole: string,
    payload: {
      action: 'UPHOLD' | 'DISMISS' | 'INVESTIGATE';
      resolutionNotes: string;
      overturnResult?: {
        type?: 'FORFEIT_WALKOVER' | 'DOCK_POINTS' | 'OVERWRITE_SCORES';
        winnerParticipantId?: string;
        forfeitParticipantId?: string;
        dockedParticipantId?: string;
        pointsDeducted?: number;
        scoreAdjustments?: Array<{
          participantId: string;
          score: number;
          kills?: number;
          placement?: number | null;
          isWinner?: boolean;
        }>;
      };
    },
    ipAddress?: string
  ) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tournament: true,
        match: {
          include: {
            round: true,
            results: {
              include: {
                participant: {
                  include: { user: true, team: true }
                }
              }
            }
          }
        },
        claimant: true
      }
    });

    if (!dispute) {
      throw new Error(`Dispute ticket '${disputeId}' not found.`);
    }

    const isReferee = dispute.match.refereeId === resolverId;
    const isOrganizer = dispute.tournament.organizerId === resolverId;
    const isAdmin = resolverRole === Roles.ADMIN;

    if (!isReferee && !isOrganizer && !isAdmin) {
      throw new Error('Unauthorized: You do not have permissions to resolve disputes for this match.');
    }

    const now = new Date();
    const action = payload.action;
    let newStatus = 'INVESTIGATING';

    if (action === 'UPHOLD') {
      newStatus = 'RESOLVED';
    } else if (action === 'DISMISS') {
      newStatus = 'DISMISSED';
    }

    const overturn = payload.overturnResult;

    // Apply Overturns when Upholding
    if (action === 'UPHOLD' && overturn) {
      // 1. Forfeit / Walkover
      if (overturn.type === 'FORFEIT_WALKOVER' && overturn.winnerParticipantId) {
        const winnerId = overturn.winnerParticipantId;
        const forfeitId =
          overturn.forfeitParticipantId ||
          dispute.match.results.find((r) => r.participantId !== winnerId)?.participantId;

        await prisma.$transaction(async (tx) => {
          // Award win to designated participant
          await tx.scoreRecord.updateMany({
            where: {
              matchId: dispute.matchId,
              participantId: winnerId
            },
            data: {
              isWinner: true,
              score: 1,
              metadata: JSON.stringify({ walkoverAwarded: true, disputeId })
            }
          });

          // Disqualify / forfeit the offending participant
          if (forfeitId) {
            await tx.scoreRecord.updateMany({
              where: {
                matchId: dispute.matchId,
                participantId: forfeitId
              },
              data: {
                isWinner: false,
                score: 0,
                metadata: JSON.stringify({ forfeited: true, disputeId })
              }
            });

            await tx.tournamentParticipant.update({
              where: { id: forfeitId },
              data: {
                status: ParticipantStatuses.DISQUALIFIED,
                disqualifiedBy: resolverId,
                disqualifyReason: `Dispute #${disputeId.slice(0, 8)} Upheld: Match Forfeit`
              }
            });
          }

          // Advance winner if single elimination
          if (dispute.tournament.structure === 'SINGLE_ELIMINATION' && dispute.match.nextMatchId) {
            await tx.scoreRecord.upsert({
              where: {
                matchId_participantId: {
                  matchId: dispute.match.nextMatchId,
                  participantId: winnerId
                }
              },
              update: {
                tournamentId: dispute.tournamentId
              },
              create: {
                tournamentId: dispute.tournamentId,
                matchId: dispute.match.nextMatchId,
                participantId: winnerId,
                score: 0,
                isWinner: false
              }
            });
          }
        });
      }

      // 2. Dock Points
      if (overturn.type === 'DOCK_POINTS' && overturn.dockedParticipantId && overturn.pointsDeducted) {
        const existingRecord = await prisma.scoreRecord.findUnique({
          where: {
            matchId_participantId: {
              matchId: dispute.matchId,
              participantId: overturn.dockedParticipantId
            }
          }
        });

        if (existingRecord) {
          const newScore = Math.max(0, existingRecord.score - Number(overturn.pointsDeducted));
          await prisma.scoreRecord.update({
            where: { id: existingRecord.id },
            data: {
              score: newScore,
              metadata: JSON.stringify({
                pointsDocked: overturn.pointsDeducted,
                disputeId,
                originalScore: existingRecord.score
              })
            }
          });
        }
      }

      // 3. Overwrite Scores
      if (overturn.type === 'OVERWRITE_SCORES' && Array.isArray(overturn.scoreAdjustments)) {
        for (const adj of overturn.scoreAdjustments) {
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
              tournamentId: dispute.tournamentId,
              roundNumber: dispute.match.round.roundNumber,
              matchId: dispute.matchId,
              participantId: adj.participantId,
              score: adj.score,
              kills: adj.kills ?? 0,
              placement: adj.placement ?? null,
              isWinner: adj.isWinner ?? false
            }
          });
        }
      }

      broadcastScoreUpdate(dispute.tournamentId, {
        matchId: dispute.matchId,
        status: 'COMPLETED'
      });
    }

    // Update Dispute Ticket
    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        resolutionNotes: payload.resolutionNotes,
        resolvedById: resolverId,
        resolvedAt: now
      },
      include: {
        resolvedBy: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        claimant: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    // Reset Match status if was marked DISPUTED
    if (newStatus === 'RESOLVED' || newStatus === 'DISMISSED') {
      await prisma.match.update({
        where: { id: dispute.matchId },
        data: {
          status: 'COMPLETED',
          isVerified: action === 'UPHOLD' ? true : dispute.match.isVerified
        }
      });
    }

    // Audit Log
    await AuditService.log({
      actorId: resolverId,
      action: action === 'UPHOLD' ? 'DISPUTE_UPHELD' : 'DISPUTE_DISMISSED',
      targetEntity: 'DISPUTE',
      targetId: disputeId,
      ipAddress,
      details: {
        action,
        matchId: dispute.matchId,
        tournamentId: dispute.tournamentId,
        resolutionNotes: payload.resolutionNotes,
        overturnType: overturn?.type
      }
    });

    // Broadcast socket event
    broadcastDisputeEvent(dispute.tournamentId, 'resolved', {
      disputeId,
      status: newStatus,
      action,
      resolutionNotes: payload.resolutionNotes
    });

    // Send notifications to claimant and match competitors
    let claimantTitle = 'Dispute Decision';
    let claimantMsg = `Your dispute regarding Match #${dispute.match.matchNumber} has been ${action === 'UPHOLD' ? 'UPHELD' : 'DISMISSED'}. Official Notes: ${payload.resolutionNotes}`;

    await NotificationService.create({
      userId: dispute.claimantId,
      title: claimantTitle,
      message: claimantMsg,
      type: 'DISPUTE',
      link: `/tournaments/${dispute.tournamentId}`
    });

    return updatedDispute;
  }

  /**
   * POST /api/referee/players/:id/sanction
   * Issues warnings, match disqualifications, or escalations to admin.
   */
  static async sanctionPlayer(
    targetId: string,
    operatorId: string,
    role: string,
    payload: {
      action: 'ISSUE_WARNING' | 'DISQUALIFY_MATCH' | 'ESCALATE_ADMIN';
      reason: string;
      tournamentId?: string;
      matchId?: string;
      evidenceUrl?: string;
      notes?: string;
    },
    ipAddress?: string
  ) {
    // Target could be a TournamentParticipant.id or a User.id
    let participant = await prisma.tournamentParticipant.findUnique({
      where: { id: targetId },
      include: {
        user: true,
        tournament: true,
        team: true
      }
    });

    let targetUser = participant?.user;

    if (!participant) {
      // Check if targetId is a User.id directly
      targetUser = await prisma.user.findUnique({
        where: { id: targetId }
      }) as any;

      if (!targetUser) {
        throw new Error(`Target player '${targetId}' not found.`);
      }

      // If tournamentId provided, find participant
      if (payload.tournamentId) {
        participant = await prisma.tournamentParticipant.findUnique({
          where: {
            tournamentId_userId: {
              tournamentId: payload.tournamentId,
              userId: targetUser.id
            }
          },
          include: {
            user: true,
            tournament: true,
            team: true
          }
        });
      }
    }

    const operator = await prisma.user.findUnique({
      where: { id: operatorId },
      select: { username: true, role: true }
    });

    const now = new Date();
    const action = payload.action;
    const tournamentTitle = participant?.tournament?.title || 'Tournament';

    if (action === 'ISSUE_WARNING') {
      // 1. Audit Log
      await AuditService.log({
        actorId: operatorId,
        action: 'PLAYER_WARNED',
        targetEntity: 'USER',
        targetId: targetUser!.id,
        ipAddress,
        details: {
          reason: payload.reason,
          tournamentId: payload.tournamentId || participant?.tournamentId,
          matchId: payload.matchId,
          evidenceUrl: payload.evidenceUrl,
          notes: payload.notes
        }
      });

      // 2. Notification to player
      await NotificationService.create({
        userId: targetUser!.id,
        title: 'Official Tournament Warning',
        message: `You have received an official warning in "${tournamentTitle}". Reason: ${payload.reason}`,
        type: 'SYSTEM',
        link: participant ? `/tournaments/${participant.tournamentId}` : undefined
      });

      return {
        success: true,
        action,
        message: `Official warning issued to ${targetUser!.username}.`,
        targetUser: { id: targetUser!.id, username: targetUser!.username }
      };
    }

    if (action === 'DISQUALIFY_MATCH') {
      // 1. Mark participant as DISQUALIFIED
      if (participant) {
        await prisma.tournamentParticipant.update({
          where: { id: participant.id },
          data: {
            status: ParticipantStatuses.DISQUALIFIED,
            disqualifiedBy: operatorId,
            disqualifyReason: payload.reason
          }
        });

        // If matchId provided, mark score record as non-winner & forfeit
        if (payload.matchId) {
          await prisma.scoreRecord.updateMany({
            where: {
              matchId: payload.matchId,
              participantId: participant.id
            },
            data: {
              isWinner: false,
              score: 0,
              metadata: JSON.stringify({
                disqualified: true,
                reason: payload.reason,
                disqualifiedBy: operatorId
              })
            }
          });

          // Award win to opponent in 1v1 / 2-team matches
          const otherCompetitor = await prisma.scoreRecord.findFirst({
            where: {
              matchId: payload.matchId,
              participantId: { not: participant.id }
            }
          });

          if (otherCompetitor) {
            await prisma.scoreRecord.update({
              where: { id: otherCompetitor.id },
              data: {
                isWinner: true,
                score: Math.max(1, otherCompetitor.score)
              }
            });
          }

          broadcastScoreUpdate(participant.tournamentId, {
            matchId: payload.matchId,
            status: 'COMPLETED'
          });
        }

        broadcastParticipantStatus(participant.tournamentId, {
          participantId: participant.id,
          userId: targetUser!.id,
          status: ParticipantStatuses.DISQUALIFIED,
          updatedBy: operatorId
        });
      }

      // 2. Audit Log
      await AuditService.log({
        actorId: operatorId,
        action: 'MATCH_DISQUALIFIED',
        targetEntity: 'PARTICIPANT',
        targetId: participant?.id || targetUser!.id,
        ipAddress,
        details: {
          reason: payload.reason,
          tournamentId: payload.tournamentId || participant?.tournamentId,
          matchId: payload.matchId,
          evidenceUrl: payload.evidenceUrl
        }
      });

      // 3. Notification to player
      await NotificationService.create({
        userId: targetUser!.id,
        title: 'Match Disqualification Notice',
        message: `You have been disqualified from "${tournamentTitle}". Reason: ${payload.reason}`,
        type: 'BAN',
        link: participant ? `/tournaments/${participant.tournamentId}` : undefined
      });

      return {
        success: true,
        action,
        message: `Player ${targetUser!.username} has been disqualified.`,
        targetUser: { id: targetUser!.id, username: targetUser!.username }
      };
    }

    if (action === 'ESCALATE_ADMIN') {
      // 1. Audit Log of escalation
      await AuditService.log({
        actorId: operatorId,
        action: 'ADMIN_ESCALATION',
        targetEntity: 'USER',
        targetId: targetUser!.id,
        ipAddress,
        details: {
          reason: payload.reason,
          tournamentId: payload.tournamentId || participant?.tournamentId,
          matchId: payload.matchId,
          evidenceUrl: payload.evidenceUrl,
          notes: payload.notes,
          refereeUsername: operator?.username
        }
      });

      // 2. High priority notification to all Admins
      const admins = await prisma.user.findMany({
        where: { role: Roles.ADMIN },
        select: { id: true }
      });

      const adminUserIds = admins.map((a) => a.id);
      await NotificationService.notifyMany(adminUserIds, {
        title: 'URGENT: Player Escalated for Ban Review',
        message: `Referee ${operator?.username || 'Staff'} escalated player "${targetUser!.username}" for platform ban review in ${tournamentTitle}. Reason: ${payload.reason}`,
        type: 'BAN',
        link: `/admin`
      });

      // 3. Notification to player
      await NotificationService.create({
        userId: targetUser!.id,
        title: 'Account Flagged for Review',
        message: `Your conduct in "${tournamentTitle}" has been flagged and escalated to Platform Administrators for official review. Reason: ${payload.reason}`,
        type: 'SYSTEM'
      });

      return {
        success: true,
        action,
        message: `Player ${targetUser!.username} successfully escalated to Platform Administrators.`,
        targetUser: { id: targetUser!.id, username: targetUser!.username }
      };
    }

    throw new Error(`Unsupported sanction action '${action}'.`);
  }

  /**
   * Participant check-in checklist: Mark players as 'PRESENT', 'CHECKED_IN', 'NO_SHOW', or 'DISQUALIFIED'.
   */
  static async updateParticipantCheckIn(
    participantId: string,
    status: string,
    operatorId: string,
    role: string,
    reason?: string,
    ipAddress?: string
  ) {
    const participant = await prisma.tournamentParticipant.findUnique({
      where: { id: participantId },
      include: {
        tournament: true,
        user: true
      }
    });

    if (!participant) {
      throw new Error(`Participant with ID '${participantId}' not found.`);
    }

    const isOrganizer = participant.tournament.organizerId === operatorId;
    const isAdmin = role === Roles.ADMIN;
    const isReferee = role === Roles.REFEREE;

    if (!isOrganizer && !isAdmin && !isReferee) {
      throw new Error('Unauthorized: Only Referees, Organizers, and Admins can update attendance.');
    }

    const validStatuses = ['REGISTERED', 'CHECKED_IN', 'PRESENT', 'NO_SHOW', 'DISQUALIFIED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status };

    if (status === 'DISQUALIFIED') {
      updateData.disqualifiedBy = operatorId;
      updateData.disqualifyReason = reason || 'Disqualified by tournament referee/admin.';
    }

    const updatedParticipant = await prisma.tournamentParticipant.update({
      where: { id: participantId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            tag: true
          }
        }
      }
    });

    await AuditService.log({
      actorId: operatorId,
      action: 'CHECKIN_UPDATE',
      targetEntity: 'PARTICIPANT',
      targetId: participantId,
      ipAddress,
      details: {
        tournamentId: participant.tournamentId,
        participantUserId: participant.userId,
        oldStatus: participant.status,
        newStatus: status,
        reason
      }
    });

    broadcastParticipantStatus(participant.tournamentId, {
      participantId,
      userId: participant.userId,
      status,
      updatedBy: operatorId
    });

    if (participant.userId && participant.userId !== operatorId) {
      let notifTitle = 'Attendance Status Updated';
      let notifMsg = `Your check-in status for "${participant.tournament.title}" has been updated to ${status}.`;

      if (status === 'DISQUALIFIED') {
        notifTitle = 'Disqualification Notice';
        notifMsg = `You have been disqualified from "${participant.tournament.title}". Reason: ${reason || 'Rule violation'}.`;
      } else if (status === 'NO_SHOW') {
        notifTitle = 'Marked as No Show';
        notifMsg = `You were marked as No Show for "${participant.tournament.title}". Contact tournament staff if this is an error.`;
      }

      await NotificationService.create({
        userId: participant.userId,
        title: notifTitle,
        message: notifMsg,
        type: status === 'DISQUALIFIED' ? 'BAN' : 'CHECK_IN',
        link: `/tournaments/${participant.tournamentId}`
      });
    }

    return updatedParticipant;
  }

  /**
   * Retrieves participant attendance checklist for a tournament.
   */
  static async getCheckInList(tournamentId: string) {
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      orderBy: { registeredAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            bio: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            tag: true
          }
        }
      }
    });

    return participants;
  }
}
