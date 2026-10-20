import { prisma } from '../config/db';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { broadcastTournamentEvent } from '../config/socket';
import { TournamentService } from './tournament.service';

export class RefereeService {
  /**
   * Get KPI Summary for a referee:
   * Assigned matches (Pending, Live, Completed) and Active Dispute Alerts.
   */
  static async getRefereeKPIs(refereeId: string) {
    const [assignedMatches, openDisputes] = await Promise.all([
      prisma.match.findMany({
        where: { refereeId },
        select: {
          id: true,
          status: true,
          isVerified: true,
          tournamentId: true
        }
      }),
      prisma.dispute.count({
        where: {
          status: { in: ['OPEN', 'INVESTIGATING'] },
          match: { refereeId }
        }
      })
    ]);

    const totalAssigned = assignedMatches.length;
    const awaitingCheckin = assignedMatches.filter(
      (m) => m.status === 'PENDING' || m.status === 'SCHEDULED' || m.status === 'AWAITING_CHECKIN'
    ).length;
    const inProgress = assignedMatches.filter((m) => m.status === 'IN_PROGRESS').length;
    const pendingValidation = assignedMatches.filter(
      (m) => m.status === 'COMPLETED' && !m.isVerified
    ).length;
    const completed = assignedMatches.filter((m) => m.status === 'COMPLETED' && m.isVerified).length;

    return {
      totalAssigned,
      awaitingCheckin,
      inProgress,
      pendingValidation,
      completed,
      activeDisputes: openDisputes
    };
  }

  /**
   * Get all matches assigned to a referee with rich relational metadata
   */
  static async getAssignedMatches(refereeId: string, tournamentId?: string) {
    const where: any = { refereeId };

    if (tournamentId) {
      where.tournamentId = tournamentId;
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            slug: true,
            format: true,
            status: true,
            maxParticipants: true,
            currentCount: true,
            game: { select: { id: true, title: true, coverImage: true, genre: true } }
          }
        },
        round: { select: { id: true, roundNumber: true, name: true } },
        results: {
          include: {
            participant: {
              include: {
                user: { select: { id: true, username: true, email: true } },
                team: {
                  select: {
                    id: true,
                    name: true,
                    tag: true,
                    inviteCode: true,
                    captain: { select: { id: true, username: true } },
                    members: {
                      include: {
                        user: { select: { id: true, username: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        referee: { select: { id: true, username: true, email: true } },
        verifier: { select: { id: true, username: true } }
      },
      orderBy: [{ tournamentId: 'asc' }, { round: { roundNumber: 'asc' } }, { matchNumber: 'asc' }]
    });

    return matches;
  }

  /**
   * Detailed Match Control Room Data:
   * Retrieves match information, roster checklist (Solo or Duo/Squad), and room access tokens.
   */
  static async getMatchControlRoom(matchId: string, refereeId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            game: true,
            organizer: { select: { id: true, username: true, email: true } }
          }
        },
        round: true,
        results: {
          include: {
            participant: {
              include: {
                user: { select: { id: true, username: true, email: true, isBanned: true } },
                team: {
                  include: {
                    captain: { select: { id: true, username: true } },
                    members: {
                      include: {
                        user: { select: { id: true, username: true, isBanned: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        referee: { select: { id: true, username: true, email: true } },
        verifier: { select: { id: true, username: true } },
        disputes: {
          include: {
            raisedBy: { select: { id: true, username: true } }
          }
        }
      }
    });

    if (!match) {
      throw new Error('Match not found.');
    }

    return match;
  }

  /**
   * Match Check-in & Attendance Update:
   * Updates participant check-in status (CHECKED_IN, LATE, NO_SHOW, DISQUALIFIED)
   * or toggles substitute approval for Duo/Squad rosters.
   */
  static async updateMatchCheckin(params: {
    matchId: string;
    participantId: string;
    status?: 'CHECKED_IN' | 'LATE' | 'NO_SHOW' | 'DISQUALIFIED' | 'REGISTERED';
    reason?: string;
    isSubstituteApproved?: boolean;
    checkinNote?: string;
    actorId: string;
    ipAddress?: string;
  }) {
    const { matchId, participantId, status, reason, isSubstituteApproved, checkinNote, actorId, ipAddress } = params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true }
    });

    if (!match) {
      throw new Error('Match not found.');
    }

    const participant = await prisma.tournamentParticipant.findFirst({
      where: { id: participantId, tournamentId: match.tournamentId },
      include: { user: true, team: true }
    });

    if (!participant) {
      throw new Error('Participant not found in this tournament match.');
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'DISQUALIFIED') {
        updateData.disqualifiedBy = actorId;
        updateData.disqualifyReason = reason || 'Referee disciplinary action.';
      }
    }
    if (typeof isSubstituteApproved === 'boolean') {
      updateData.isSubstituteApproved = isSubstituteApproved;
    }
    if (checkinNote !== undefined) {
      updateData.checkinNote = checkinNote;
    }

    const updated = await prisma.tournamentParticipant.update({
      where: { id: participantId },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, email: true } },
        team: { select: { id: true, name: true, tag: true } }
      }
    });

    // Notify player
    if (status) {
      const message =
        status === 'CHECKED_IN'
          ? `You have been marked as Present for Match #${match.matchNumber}.`
          : status === 'LATE'
          ? `You have been marked as Late by referee for Match #${match.matchNumber}.`
          : status === 'NO_SHOW'
          ? `You have been marked as No-Show for Match #${match.matchNumber}.`
          : `You were Disqualified from Match #${match.matchNumber}: ${reason || 'Rule violation'}`;

      await NotificationService.send({
        userId: participant.userId,
        title: `Match Attendance: ${match.tournament.title}`,
        message,
        type: status === 'DISQUALIFIED' ? 'BAN' : 'GENERAL',
        link: `/tournaments/${match.tournamentId}`
      });
    }

    // Broadcast WebSocket update
    broadcastTournamentEvent(match.tournamentId, 'match:checkin:update', {
      matchId,
      participantId,
      status: updated.status,
      isSubstituteApproved: updated.isSubstituteApproved,
      checkinNote: updated.checkinNote
    });

    // Audit log
    await AuditService.log({
      actorId,
      actionType: 'MATCH_CHECKIN_UPDATE',
      targetEntity: 'PARTICIPANT',
      targetId: participantId,
      details: {
        matchId,
        tournamentId: match.tournamentId,
        newStatus: status,
        isSubstituteApproved,
        reason
      },
      ipAddress
    });

    return updated;
  }

  /**
   * Lock Roster & Start Match / Update Match Status:
   * Generates room access token, notifies players, and sets live status.
   */
  static async updateMatchStatus(params: {
    matchId: string;
    status: 'PENDING' | 'SCHEDULED' | 'AWAITING_CHECKIN' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';
    lockRoster?: boolean;
    lobbyCredentials?: string;
    actorId: string;
    ipAddress?: string;
  }) {
    const { matchId, status, lockRoster, lobbyCredentials, actorId, ipAddress } = params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        results: {
          include: {
            participant: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!match) {
      throw new Error('Match not found.');
    }

    const updateData: any = { status };

    // Generate room access token if locking roster or moving to IN_PROGRESS
    let generatedToken = match.roomToken;
    if ((lockRoster || status === 'IN_PROGRESS') && !generatedToken) {
      generatedToken = `LOBBY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      updateData.roomToken = generatedToken;
    }

    if (lobbyCredentials) {
      updateData.lobbyCredentials = lobbyCredentials;
    }

    if (status === 'IN_PROGRESS' && !match.scheduledAt) {
      updateData.scheduledAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        tournament: true,
        results: {
          include: {
            participant: {
              include: {
                user: { select: { id: true, username: true } },
                team: { select: { id: true, name: true } }
              }
            }
          }
        },
        referee: { select: { id: true, username: true } }
      }
    });

    // Notify all match participants of room token and match launch
    if (lockRoster || status === 'IN_PROGRESS') {
      for (const res of match.results) {
        if (res.participant?.userId) {
          await NotificationService.send({
            userId: res.participant.userId,
            title: `Match #${match.matchNumber} Live!`,
            message: `Roster locked. Enter Match Room with Token: [${generatedToken}] for tournament "${match.tournament.title}".`,
            type: 'MATCH_START',
            link: `/tournaments/${match.tournamentId}`
          });
        }
      }
    }

    // Broadcast WebSocket updates
    broadcastTournamentEvent(match.tournamentId, 'match:status:update', {
      matchId: match.id,
      tournamentId: match.tournamentId,
      status,
      roomToken: generatedToken,
      lockRoster: Boolean(lockRoster)
    });

    // Audit log
    await AuditService.log({
      actorId,
      actionType: lockRoster ? 'MATCH_ROSTER_LOCKED' : 'MATCH_STATUS_UPDATE',
      targetEntity: 'MATCH',
      targetId: match.id,
      details: {
        tournamentId: match.tournamentId,
        matchNumber: match.matchNumber,
        status,
        roomToken: generatedToken
      },
      ipAddress
    });

    return updatedMatch;
  }

  /**
   * One-click scorecard verification:
   * Flags scores as officially validated by referee
   */
  static async verifyMatchScorecard(matchId: string, refereeId: string, ipAddress?: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        results: {
          include: {
            participant: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!match) {
      throw new Error('Match not found.');
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedById: refereeId
      },
      include: {
        verifier: { select: { id: true, username: true } },
        results: true
      }
    });

    // Notify organizer that scores have been officially validated
    if (match.tournament.organizerId) {
      await NotificationService.send({
        userId: match.tournament.organizerId,
        title: `Match Verified: Match #${match.matchNumber}`,
        message: `Official referee verification completed for tournament "${match.tournament.title}".`,
        type: 'SCORE_UPDATE',
        link: `/tournaments/${match.tournamentId}`
      });
    }

    // Broadcast update
    broadcastTournamentEvent(match.tournamentId, 'match:verified', {
      matchId: match.id,
      tournamentId: match.tournamentId,
      verifiedById: refereeId
    });

    // Audit log
    await AuditService.log({
      actorId: refereeId,
      actionType: 'REFEREE_VERIFY',
      targetEntity: 'MATCH',
      targetId: match.id,
      details: {
        tournamentId: match.tournamentId,
        matchNumber: match.matchNumber
      },
      ipAddress
    });

    return updatedMatch;
  }

  /**
   * Assign a referee to a tournament or specific match (Admin or Organizer action)
   */
  static async assignReferee(params: {
    tournamentId: string;
    refereeId: string;
    matchId?: string;
    actorId: string;
    ipAddress?: string;
  }) {
    const { tournamentId, refereeId, matchId, actorId, ipAddress } = params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error('Tournament not found.');
    }

    const referee = await prisma.user.findUnique({
      where: { id: refereeId }
    });

    if (!referee) {
      throw new Error('Referee user not found.');
    }

    if (referee.role !== 'REFEREE' && referee.role !== 'ADMIN') {
      throw new Error(`User "${referee.username}" does not have referee privileges (Current role: ${referee.role}).`);
    }

    let assignedCount = 0;
    if (matchId) {
      const match = await prisma.match.findFirst({
        where: { id: matchId, tournamentId }
      });
      if (!match) {
        throw new Error('Specified match not found in this tournament.');
      }
      await prisma.match.update({
        where: { id: matchId },
        data: { refereeId }
      });
      assignedCount = 1;
    } else {
      const updateResult = await prisma.match.updateMany({
        where: { tournamentId },
        data: { refereeId }
      });
      assignedCount = updateResult.count;
    }

    // Send notification to referee
    await NotificationService.send({
      userId: refereeId,
      title: 'Tournament Assignment',
      message: `You have been assigned as official referee for tournament "${tournament.title}".`,
      type: 'MATCH_START',
      link: '/referee/dashboard'
    });

    // Audit log
    await AuditService.log({
      actorId,
      actionType: 'REFEREE_ASSIGN',
      targetEntity: 'TOURNAMENT',
      targetId: tournamentId,
      details: {
        refereeId,
        refereeName: referee.username,
        matchId: matchId || 'ALL_MATCHES',
        assignedCount
      },
      ipAddress
    });

    return {
      success: true,
      message: matchId
        ? `Referee ${referee.username} assigned to match.`
        : `Referee ${referee.username} assigned to ${assignedCount} match(es) in tournament.`,
      assignedCount
    };
  }

  /**
   * Get participant check-in roster for a tournament
   */
  static async getTournamentRoster(tournamentId: string) {
    return prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isBanned: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            inviteCode: true,
            members: {
              include: {
                user: { select: { id: true, username: true } }
              }
            }
          }
        }
      },
      orderBy: [{ team: { name: 'asc' } }, { registeredAt: 'asc' }]
    });
  }

  /**
   * Read-only Tournament Database Inspection for Referees
   */
  static async getTournamentDatabase(tournamentId: string, refereeId?: string) {
    return TournamentService.getTournamentDatabase(tournamentId, refereeId || '', false, true);
  }

  /**
   * Check-in / Attendance Checklist update for tournament participants
   */
  static async updateParticipantCheckin(
    tournamentId: string,
    participantId: string,
    status: 'CHECKED_IN' | 'NO_SHOW' | 'DISQUALIFIED' | 'REGISTERED',
    actorId: string,
    reason?: string,
    ipAddress?: string
  ) {
    const participant = await prisma.tournamentParticipant.findFirst({
      where: { id: participantId, tournamentId },
      include: { user: true, tournament: true }
    });

    if (!participant) {
      throw new Error('Participant not found in this tournament.');
    }

    const updated = await prisma.tournamentParticipant.update({
      where: { id: participantId },
      data: {
        status,
        disqualifiedBy: status === 'DISQUALIFIED' ? actorId : null,
        disqualifyReason: status === 'DISQUALIFIED' ? reason || 'Rule violation' : null
      },
      include: {
        user: { select: { id: true, username: true } },
        team: { select: { id: true, name: true } }
      }
    });

    // Notify player
    await NotificationService.send({
      userId: participant.userId,
      title: `Check-in Status: ${participant.tournament.title}`,
      message:
        status === 'CHECKED_IN'
          ? 'You have been marked as Present for the tournament.'
          : status === 'NO_SHOW'
          ? 'You have been marked as No Show by tournament officials.'
          : `You have been Disqualified: ${reason || 'Rule violation'}`,
      type: status === 'DISQUALIFIED' ? 'BAN' : 'GENERAL',
      link: `/tournaments/${tournamentId}`
    });

    // Audit log
    await AuditService.log({
      actorId,
      actionType: status === 'DISQUALIFIED' ? 'PARTICIPANT_DISQUALIFY' : 'CHECKIN_UPDATE',
      targetEntity: 'PARTICIPANT',
      targetId: participantId,
      details: {
        tournamentId,
        participantName: participant.user.username,
        newStatus: status,
        reason
      },
      ipAddress
    });

    return updated;
  }

  /**
   * Score Verification & Official Sign-off with comparison and override support
   * Actions: 'APPROVE' (finalize and advance bracket) or 'OVERRIDE' (edit points/kills/winner with notes)
   */
  static async verifyScorecardWithOverride(params: {
    matchId: string;
    refereeId: string;
    action: 'APPROVE' | 'OVERRIDE';
    refereeNote: string;
    results?: Array<{
      participantId: string;
      score: number;
      kills?: number;
      placement?: number;
      isWinner?: boolean;
    }>;
    ipAddress?: string;
  }) {
    const { matchId, refereeId, action, refereeNote, results, ipAddress } = params;

    if (!refereeNote || !refereeNote.trim()) {
      throw new Error('Mandatory referee note is required for score verification/override.');
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
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
      throw new Error('Match not found.');
    }

    let updatedMatch: any;

    if (action === 'OVERRIDE') {
      if (!results || !Array.isArray(results) || results.length === 0) {
        throw new Error('Overriding scores requires at least one participant result.');
      }

      await prisma.$transaction(async (tx) => {
        for (const item of results) {
          await tx.matchResult.upsert({
            where: {
              matchId_participantId: {
                matchId,
                participantId: item.participantId
              }
            },
            update: {
              score: item.score,
              kills: item.kills ?? 0,
              placement: item.placement ?? null,
              isWinner: item.isWinner ?? false
            },
            create: {
              matchId,
              participantId: item.participantId,
              score: item.score,
              kills: item.kills ?? 0,
              placement: item.placement ?? null,
              isWinner: item.isWinner ?? false
            }
          });
        }

        const explicitWinner = results.find((r) => r.isWinner);
        const sorted = [...results].sort((a, b) => (b.score || 0) - (a.score || 0));
        const winnerParticipantId = explicitWinner
          ? explicitWinner.participantId
          : sorted.length > 0
          ? sorted[0].participantId
          : match.winnerParticipantId;

        updatedMatch = await tx.match.update({
          where: { id: matchId },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
            verifiedById: refereeId,
            refereeNote: refereeNote.trim(),
            status: 'COMPLETED',
            completedAt: new Date(),
            winnerParticipantId: winnerParticipantId || match.winnerParticipantId
          },
          include: {
            verifier: { select: { id: true, username: true } },
            results: {
              include: {
                participant: {
                  include: { user: { select: { id: true, username: true } } }
                }
              }
            }
          }
        });

        // Bracket advance if SINGLE_ELIMINATION
        if (
          match.tournament.structure === 'SINGLE_ELIMINATION' &&
          updatedMatch.winnerParticipantId &&
          updatedMatch.nextMatchId
        ) {
          await tx.matchResult.upsert({
            where: {
              matchId_participantId: {
                matchId: updatedMatch.nextMatchId,
                participantId: updatedMatch.winnerParticipantId
              }
            },
            update: {},
            create: {
              matchId: updatedMatch.nextMatchId,
              participantId: updatedMatch.winnerParticipantId,
              score: 0,
              kills: 0,
              isWinner: false
            }
          });

          const nextCount = await tx.matchResult.count({
            where: { matchId: updatedMatch.nextMatchId }
          });
          if (nextCount >= 2) {
            await tx.match.update({
              where: { id: updatedMatch.nextMatchId },
              data: { status: 'SCHEDULED' }
            });
          }
        }
      });

      broadcastTournamentEvent(match.tournamentId, 'match:update_score', {
        matchId,
        tournamentId: match.tournamentId,
        reason: 'Referee Score Override',
        refereeNote
      });

      await AuditService.log({
        actorId: refereeId,
        actionType: 'SCORE_OVERRIDE',
        targetEntity: 'MATCH',
        targetId: match.id,
        details: {
          tournamentId: match.tournamentId,
          matchNumber: match.matchNumber,
          refereeNote,
          overriddenResults: results
        },
        ipAddress
      });
    } else {
      // APPROVE & FINALIZE
      let winnerParticipantId = match.winnerParticipantId;
      if (!winnerParticipantId && match.results.length > 0) {
        const explicitWinner = match.results.find((r) => r.isWinner);
        const sorted = [...match.results].sort((a, b) => b.score - a.score);
        winnerParticipantId = explicitWinner ? explicitWinner.participantId : sorted[0].participantId;
      }

      await prisma.$transaction(async (tx) => {
        updatedMatch = await tx.match.update({
          where: { id: matchId },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
            verifiedById: refereeId,
            refereeNote: refereeNote.trim(),
            status: 'COMPLETED',
            completedAt: match.completedAt || new Date(),
            winnerParticipantId: winnerParticipantId || undefined
          },
          include: {
            verifier: { select: { id: true, username: true } },
            results: {
              include: {
                participant: {
                  include: { user: { select: { id: true, username: true } } }
                }
              }
            }
          }
        });

        // Bracket advance if SINGLE_ELIMINATION
        if (
          match.tournament.structure === 'SINGLE_ELIMINATION' &&
          updatedMatch.winnerParticipantId &&
          updatedMatch.nextMatchId
        ) {
          await tx.matchResult.upsert({
            where: {
              matchId_participantId: {
                matchId: updatedMatch.nextMatchId,
                participantId: updatedMatch.winnerParticipantId
              }
            },
            update: {},
            create: {
              matchId: updatedMatch.nextMatchId,
              participantId: updatedMatch.winnerParticipantId,
              score: 0,
              kills: 0,
              isWinner: false
            }
          });

          const nextCount = await tx.matchResult.count({
            where: { matchId: updatedMatch.nextMatchId }
          });
          if (nextCount >= 2) {
            await tx.match.update({
              where: { id: updatedMatch.nextMatchId },
              data: { status: 'SCHEDULED' }
            });
          }
        }
      });

      await AuditService.log({
        actorId: refereeId,
        actionType: 'REFEREE_VERIFY',
        targetEntity: 'MATCH',
        targetId: match.id,
        details: {
          tournamentId: match.tournamentId,
          matchNumber: match.matchNumber,
          refereeNote
        },
        ipAddress
      });
    }

    // Broadcast verification event
    broadcastTournamentEvent(match.tournamentId, 'match:verified', {
      matchId: match.id,
      tournamentId: match.tournamentId,
      verifiedById: refereeId,
      action
    });

    // Notify organizer
    if (match.tournament.organizerId) {
      await NotificationService.send({
        userId: match.tournament.organizerId,
        title: `Scorecard Verified: Match #${match.matchNumber}`,
        message: `Official scorecard ${
          action === 'OVERRIDE' ? 'overridden and approved' : 'approved and finalized'
        } by referee. Note: "${refereeNote}"`,
        type: 'SCORE_UPDATE',
        link: `/tournaments/${match.tournamentId}`
      });
    }

    return updatedMatch;
  }

  /**
   * Fetch dispute queue for matches assigned to the referee
   */
  static async getRefereeDisputes(refereeId: string, status?: string) {
    const where: any = {
      match: { refereeId }
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        raisedBy: { select: { id: true, username: true, email: true } },
        accusedUser: { select: { id: true, username: true, email: true } },
        resolvedBy: { select: { id: true, username: true } },
        tournament: { select: { id: true, title: true, format: true } },
        match: {
          include: {
            round: { select: { roundNumber: true, name: true } },
            results: {
              include: {
                participant: {
                  include: {
                    user: { select: { id: true, username: true, email: true } },
                    team: { select: { id: true, name: true, tag: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return disputes.map((d) => {
      const complainingResult = d.match?.results.find((r) => r.participant.user.id === d.raisedById);
      const complainingTeam = complainingResult?.participant.team?.name || null;

      let accusedName = d.accusedUser?.username || null;
      let accusedTeam: string | null = null;
      let accusedParticipantId = d.accusedParticipantId;

      if (!accusedName && d.match?.results) {
        const opposingResult = d.match.results.find((r) => r.participant.user.id !== d.raisedById);
        if (opposingResult) {
          accusedName = opposingResult.participant.user.username;
          accusedTeam = opposingResult.participant.team?.name || null;
          if (!accusedParticipantId) accusedParticipantId = opposingResult.participant.id;
        }
      }

      return {
        id: d.id,
        tournamentId: d.tournamentId,
        tournamentTitle: d.tournament.title,
        tournamentFormat: d.tournament.format,
        matchId: d.matchId,
        matchNumber: d.match?.matchNumber,
        roundName: d.match?.round?.name,
        incidentCategory: d.reason,
        description: d.description,
        proofUrl: d.proofUrl,
        status: d.status,
        actionTaken: d.actionTaken,
        resolutionNote: d.resolutionNote,
        resolvedAt: d.resolvedAt,
        resolvedBy: d.resolvedBy?.username,
        createdAt: d.createdAt,
        complaining: {
          id: d.raisedById,
          username: d.raisedBy.username,
          email: d.raisedBy.email,
          team: complainingTeam,
          participantId: complainingResult?.participant.id
        },
        accused: {
          id: d.accusedUserId,
          username: accusedName || 'Opposing Team / Competitor',
          team: accusedTeam,
          participantId: accusedParticipantId
        },
        matchResults: d.match?.results.map((r) => ({
          participantId: r.participant.id,
          username: r.participant.user.username,
          teamName: r.participant.team?.name,
          score: r.score,
          kills: r.kills,
          placement: r.placement,
          isWinner: r.isWinner
        }))
      };
    });
  }

  /**
   * Dispute Resolution Suite: Uphold (overturn match, forfeit, dock points) or Dismiss
   */
  static async resolveRefereeDispute(params: {
    disputeId: string;
    refereeId: string;
    action: 'UPHOLD' | 'DISMISS' | 'INVESTIGATE';
    actionTaken?: 'UPHELD' | 'DISMISSED' | 'FORFEIT_AWARDED' | 'POINTS_DOCKED';
    resolutionNote: string;
    forfeitWinnerParticipantId?: string;
    dockedParticipantId?: string;
    dockPoints?: number;
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
  }) {
    const {
      disputeId,
      refereeId,
      action,
      actionTaken,
      resolutionNote,
      forfeitWinnerParticipantId,
      dockedParticipantId,
      dockPoints,
      overwriteScore,
      ipAddress
    } = params;

    if (!resolutionNote || !resolutionNote.trim()) {
      throw new Error('Mandatory resolution note / explanation is required.');
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tournament: true,
        match: {
          include: { results: true }
        },
        raisedBy: true
      }
    });

    if (!dispute) {
      throw new Error('Dispute ticket not found.');
    }

    const targetStatus =
      action === 'DISMISS' ? 'DISMISSED' : action === 'INVESTIGATE' ? 'INVESTIGATING' : 'RESOLVED';
    const computedActionTaken = actionTaken || (action === 'DISMISS' ? 'DISMISSED' : 'UPHELD');

    if (action === 'UPHOLD') {
      // 1. Forfeit / Walkover award
      if (forfeitWinnerParticipantId && dispute.matchId) {
        await prisma.$transaction(async (tx) => {
          await tx.matchResult.updateMany({
            where: { matchId: dispute.matchId! },
            data: { isWinner: false }
          });
          await tx.matchResult.update({
            where: {
              matchId_participantId: {
                matchId: dispute.matchId!,
                participantId: forfeitWinnerParticipantId
              }
            },
            data: { isWinner: true }
          });
          await tx.match.update({
            where: { id: dispute.matchId! },
            data: {
              status: 'COMPLETED',
              winnerParticipantId: forfeitWinnerParticipantId,
              completedAt: new Date()
            }
          });
        });

        broadcastTournamentEvent(dispute.tournamentId, 'match:forfeit_awarded', {
          matchId: dispute.matchId,
          forfeitWinnerParticipantId,
          disputeId
        });
      }

      // 2. Dock points
      if (dockedParticipantId && dockPoints && dispute.matchId) {
        const existing = await prisma.matchResult.findUnique({
          where: {
            matchId_participantId: {
              matchId: dispute.matchId,
              participantId: dockedParticipantId
            }
          }
        });
        if (existing) {
          const newScore = Math.max(0, existing.score - dockPoints);
          await prisma.matchResult.update({
            where: {
              matchId_participantId: {
                matchId: dispute.matchId,
                participantId: dockedParticipantId
              }
            },
            data: { score: newScore }
          });

          broadcastTournamentEvent(dispute.tournamentId, 'match:update_score', {
            matchId: dispute.matchId,
            participantId: dockedParticipantId,
            newScore,
            reason: `Points docked (-${dockPoints}) due to dispute #${dispute.id.slice(0, 6)}`
          });
        }
      }

      // 3. Overwrite score if provided
      if (overwriteScore && overwriteScore.matchId) {
        await prisma.$transaction(async (tx) => {
          for (const item of overwriteScore.results) {
            await tx.matchResult.upsert({
              where: {
                matchId_participantId: {
                  matchId: overwriteScore.matchId,
                  participantId: item.participantId
                }
              },
              update: {
                score: item.score,
                kills: item.kills ?? 0,
                placement: item.placement ?? null,
                isWinner: item.isWinner ?? false
              },
              create: {
                matchId: overwriteScore.matchId,
                participantId: item.participantId,
                score: item.score,
                kills: item.kills ?? 0,
                placement: item.placement ?? null,
                isWinner: item.isWinner ?? false
              }
            });
          }
        });
      }
    }

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: targetStatus,
        actionTaken: computedActionTaken,
        resolutionNote: resolutionNote.trim(),
        resolvedById: refereeId,
        resolvedAt: targetStatus === 'INVESTIGATING' ? null : new Date()
      },
      include: {
        raisedBy: { select: { id: true, username: true } },
        resolvedBy: { select: { id: true, username: true } }
      }
    });

    // Notify player who raised dispute
    await NotificationService.send({
      userId: dispute.raisedById,
      title: `Dispute Decision: ${dispute.tournament.title}`,
      message:
        targetStatus === 'DISMISSED'
          ? `Your dispute ticket has been dismissed by the referee. Reason: "${resolutionNote}"`
          : `Your dispute ticket has been upheld (${computedActionTaken}). Note: "${resolutionNote}"`,
      type: 'DISPUTE_UPDATE',
      link: `/player/my-tournaments`
    });

    // Audit log
    await AuditService.log({
      actorId: refereeId,
      actionType: 'DISPUTE_RESOLVE',
      targetEntity: 'DISPUTE',
      targetId: disputeId,
      details: {
        targetStatus,
        actionTaken: computedActionTaken,
        resolutionNote
      },
      ipAddress
    });

    return updated;
  }

  /**
   * Disciplinary & Flagging Actions:
   * Referees can issue immediate in-tournament sanctions:
   * - 'WARNING': Logs warning on player's tournament record
   * - 'MATCH_DISQUALIFY': Disqualifies player/team from current match
   * - 'ESCALATE_ADMIN': Flags player for platform-wide ban review with attached match evidence
   */
  static async sanctionPlayer(params: {
    targetId: string;
    refereeId: string;
    sanctionType: 'WARNING' | 'MATCH_DISQUALIFY' | 'ESCALATE_ADMIN';
    reason: string;
    tournamentId?: string;
    matchId?: string;
    proofUrl?: string;
    ipAddress?: string;
  }) {
    const { targetId, refereeId, sanctionType, reason, tournamentId, matchId, proofUrl, ipAddress } = params;

    if (!reason || !reason.trim()) {
      throw new Error('Mandatory reason/evidence is required for disciplinary sanctions.');
    }

    const referee = await prisma.user.findUnique({
      where: { id: refereeId },
      select: { username: true }
    });

    // Locate participant
    const participant = await prisma.tournamentParticipant.findFirst({
      where: {
        OR: [
          { id: targetId },
          { userId: targetId, ...(tournamentId ? { tournamentId } : {}) }
        ]
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
        tournament: { select: { id: true, title: true } },
        team: { select: { id: true, name: true } }
      }
    });

    if (!participant) {
      throw new Error('Tournament participant not found for sanctioning.');
    }

    const stamp = `[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} - Ref ${
      referee?.username || 'Official'
    }]: ${reason.trim()}`;

    let updatedParticipant: any;

    if (sanctionType === 'WARNING') {
      const existingNotes = participant.warningNotes ? `${participant.warningNotes}\n${stamp}` : stamp;
      updatedParticipant = await prisma.tournamentParticipant.update({
        where: { id: participant.id },
        data: {
          warningsCount: { increment: 1 },
          warningNotes: existingNotes
        },
        include: { user: true, team: true }
      });

      await NotificationService.send({
        userId: participant.userId,
        title: `Official Warning: ${participant.tournament.title}`,
        message: `You have received an official disciplinary warning: "${reason}". Continuous infractions will lead to match forfeiture.`,
        type: 'GENERAL',
        link: `/player/my-tournaments`
      });

      await AuditService.log({
        actorId: refereeId,
        actionType: 'PLAYER_WARNING',
        targetEntity: 'PARTICIPANT',
        targetId: participant.id,
        details: {
          participantName: participant.user.username,
          tournamentId: participant.tournamentId,
          reason,
          warningsCount: updatedParticipant.warningsCount
        },
        ipAddress
      });
    } else if (sanctionType === 'MATCH_DISQUALIFY') {
      updatedParticipant = await prisma.tournamentParticipant.update({
        where: { id: participant.id },
        data: {
          isMatchDisqualified: true,
          status: 'DISQUALIFIED',
          disqualifiedBy: refereeId,
          disqualifyReason: reason.trim()
        },
        include: { user: true, team: true }
      });

      if (matchId) {
        await prisma.matchResult.updateMany({
          where: { matchId, participantId: participant.id },
          data: { isWinner: false }
        });

        const opponents = await prisma.matchResult.findMany({
          where: { matchId, participantId: { not: participant.id } }
        });

        if (opponents.length === 1) {
          await prisma.matchResult.update({
            where: { id: opponents[0].id },
            data: { isWinner: true }
          });
          await prisma.match.update({
            where: { id: matchId },
            data: {
              status: 'COMPLETED',
              winnerParticipantId: opponents[0].participantId,
              completedAt: new Date()
            }
          });
        }

        broadcastTournamentEvent(participant.tournamentId, 'match:disqualification', {
          matchId,
          disqualifiedParticipantId: participant.id,
          reason
        });
      }

      await NotificationService.send({
        userId: participant.userId,
        title: `Match Disqualification: ${participant.tournament.title}`,
        message: `You have been disqualified from the match by tournament officials: "${reason}".`,
        type: 'BAN',
        link: `/player/my-tournaments`
      });

      await AuditService.log({
        actorId: refereeId,
        actionType: 'PLAYER_MATCH_DISQUALIFY',
        targetEntity: 'PARTICIPANT',
        targetId: participant.id,
        details: {
          participantName: participant.user.username,
          tournamentId: participant.tournamentId,
          matchId,
          reason
        },
        ipAddress
      });
    } else if (sanctionType === 'ESCALATE_ADMIN') {
      updatedParticipant = await prisma.tournamentParticipant.update({
        where: { id: participant.id },
        data: {
          isEscalatedToAdmin: true,
          escalationReason: reason.trim()
        },
        include: { user: true, team: true }
      });

      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      });

      for (const adm of admins) {
        await NotificationService.send({
          userId: adm.id,
          title: `Player Escalation: ${participant.user.username}`,
          message: `Referee ${referee?.username || 'Official'} escalated player ${
            participant.user.username
          } in "${participant.tournament.title}" for platform-wide ban review. Reason: "${reason}". Proof: ${
            proofUrl || 'Attached in audit log'
          }`,
          type: 'BAN',
          link: `/admin/users`
        });
      }

      await AuditService.log({
        actorId: refereeId,
        actionType: 'PLAYER_ADMIN_ESCALATION',
        targetEntity: 'USER',
        targetId: participant.userId,
        details: {
          participantId: participant.id,
          username: participant.user.username,
          tournamentId: participant.tournamentId,
          matchId,
          reason,
          proofUrl
        },
        ipAddress
      });
    }

    return {
      success: true,
      sanctionType,
      message:
        sanctionType === 'WARNING'
          ? `Warning issued to ${participant.user.username}. Total warnings: ${updatedParticipant.warningsCount}`
          : sanctionType === 'MATCH_DISQUALIFY'
          ? `Participant ${participant.user.username} disqualified from match.`
          : `Player ${participant.user.username} escalated to administrators for ban review.`,
      participant: updatedParticipant
    };
  }
}
