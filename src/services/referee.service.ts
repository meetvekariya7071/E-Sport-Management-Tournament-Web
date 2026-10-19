import { prisma } from '../config/db';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { broadcastTournamentEvent } from '../config/socket';

export class RefereeService {
  /**
   * Get all matches assigned to a referee
   */
  static async getAssignedMatches(refereeId: string, tournamentId?: string) {
    const where: any = {
      refereeId
    };

    if (tournamentId) {
      where.tournamentId = tournamentId;
    }

    return prisma.match.findMany({
      where,
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            format: true,
            status: true,
            game: { select: { title: true, coverImage: true } }
          }
        },
        round: { select: { id: true, roundNumber: true, name: true } },
        results: {
          include: {
            participant: {
              include: {
                user: { select: { id: true, username: true, email: true } },
                team: { select: { id: true, name: true, tag: true } }
              }
            }
          }
        },
        verifier: {
          select: { id: true, username: true }
        }
      },
      orderBy: [{ tournamentId: 'asc' }, { round: { roundNumber: 'asc' } }, { matchNumber: 'asc' }]
    });
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

    if (match.refereeId && match.refereeId !== refereeId) {
      // Allow if admin, but check caller
      // For general referee check
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
            tag: true
          }
        }
      },
      orderBy: [{ team: { name: 'asc' } }, { registeredAt: 'asc' }]
    });
  }

  /**
   * Check-in / Attendance Checklist update:
   * Status can be: 'CHECKED_IN' (Present), 'NO_SHOW', 'DISQUALIFIED'
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
}
