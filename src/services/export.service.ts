import { prisma } from '../config/db';
import { TournamentService } from './tournament.service';

/**
 * Escapes fields for CSV according to RFC 4180
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export class ExportService {
  /**
   * Generates CSV for Tournament Participants.
   * Columns: Slot, Participant ID, In-Game Name, Username, Email, Team Name, Status, Seed, Banned, Registered At
   */
  static async exportParticipantsCsv(tournamentId: string): Promise<{ filename: string; csv: string }> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        title: true,
        slug: true,
        participants: {
          select: {
            id: true,
            inGameName: true,
            status: true,
            seed: true,
            registeredAt: true,
            user: {
              select: {
                username: true,
                email: true,
                isBanned: true
              }
            },
            team: {
              select: {
                name: true
              }
            }
          },
          orderBy: { registeredAt: 'asc' }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    const headers = [
      'Slot',
      'Participant ID',
      'In-Game Name (IGN)',
      'Account Username',
      'User Email',
      'Team Name',
      'Status',
      'Seed',
      'Is Banned',
      'Registered At (UTC)'
    ];

    const rows = tournament.participants.map((p, idx) => [
      idx + 1,
      p.id,
      p.inGameName || p.user.username,
      p.user.username,
      p.user.email,
      p.team?.name || 'N/A (Solo)',
      p.status,
      p.seed || idx + 1,
      p.user.isBanned ? 'YES' : 'NO',
      p.registeredAt.toISOString()
    ]);

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\r\n');

    return {
      filename: `${tournament.slug}-participants.csv`,
      csv
    };
  }

  /**
   * Generates CSV for Tournament Teams (DUO/SQUAD formats).
   * Columns: Slot, Team ID, Team Name, Tag, Invite Code, Captain Name, Captain Email, Roster Size, Members, Created At
   */
  static async exportTeamsCsv(tournamentId: string): Promise<{ filename: string; csv: string }> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        title: true,
        slug: true,
        format: true,
        teams: {
          select: {
            id: true,
            name: true,
            tag: true,
            inviteCode: true,
            createdAt: true,
            captain: {
              select: {
                username: true,
                email: true
              }
            },
            members: {
              select: {
                role: true,
                user: {
                  select: {
                    username: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    const headers = [
      'Slot',
      'Team ID',
      'Team Name',
      'Tag',
      'Invite Code',
      'Captain Username',
      'Captain Email',
      'Roster Size',
      'Roster Members (Role: Name)',
      'Created At (UTC)'
    ];

    const rows = tournament.teams.map((t, idx) => {
      const rosterList = t.members
        .map((m) => `${m.role}: ${m.user.username} (${m.user.email})`)
        .join('; ');

      return [
        idx + 1,
        t.id,
        t.name,
        t.tag || '',
        t.inviteCode || '',
        t.captain.username,
        t.captain.email,
        t.members.length,
        rosterList,
        t.createdAt.toISOString()
      ];
    });

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\r\n');

    return {
      filename: `${tournament.slug}-teams.csv`,
      csv
    };
  }

  /**
   * Generates CSV for Tournament Scores & Standings.
   * Exports both final leaderboard rankings and round-by-round match score breakdown.
   */
  static async exportScoresCsv(tournamentId: string): Promise<{ filename: string; csv: string }> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        title: true,
        slug: true,
        format: true,
        structure: true
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    // Fetch calculated leaderboard
    const standings = await TournamentService.getLeaderboard(tournamentId);

    // Fetch round-by-round match results
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      select: {
        id: true,
        matchNumber: true,
        status: true,
        completedAt: true,
        round: {
          select: {
            roundNumber: true,
            name: true
          }
        },
        results: {
          select: {
            score: true,
            kills: true,
            placement: true,
            isWinner: true,
            participant: {
              select: {
                inGameName: true,
                user: { select: { username: true } },
                team: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { round: { roundNumber: 'asc' } },
        { matchNumber: 'asc' }
      ]
    });

    // Section 1: Official Standings
    const standingsHeaders = [
      'Rank',
      'Competitor Name',
      'Team Tag',
      'Total Points / Score',
      'Total Kills',
      'Matches Played',
      'Total Wins',
      'Best Placement',
      'Status'
    ];

    const standingsRows = standings.map((s: any) => [
      s.rank,
      s.name,
      s.tag || '',
      s.totalScore,
      s.totalKills,
      s.matchesPlayed,
      s.wins,
      s.bestPlacement,
      s.disqualified ? 'DISQUALIFIED' : 'ACTIVE'
    ]);

    // Section 2: Detailed Match Score Matrix
    const matchHeaders = [
      'Round Number',
      'Round Name',
      'Match Number',
      'Competitor',
      'Score Points',
      'Kill Count',
      'Match Placement',
      'Outcome',
      'Match Status'
    ];

    const matchRows: any[] = [];
    matches.forEach((m) => {
      m.results.forEach((res) => {
        const compName = res.participant.team?.name || res.participant.inGameName || res.participant.user.username;
        matchRows.push([
          m.round.roundNumber,
          m.round.name,
          m.matchNumber,
          compName,
          res.score,
          res.kills || 0,
          res.placement || '-',
          res.isWinner ? 'WINNER' : 'DEFEATED',
          m.status
        ]);
      });
    });

    const csvContent = [
      `"=== TOURNAMENT STANDINGS & LEADERBOARD: ${tournament.title} ==="`,
      standingsHeaders.map(escapeCsv).join(','),
      ...standingsRows.map((r) => r.map(escapeCsv).join(',')),
      '',
      `"=== MATCH SCORE BREAKDOWN MATRIX ==="`,
      matchHeaders.map(escapeCsv).join(','),
      ...matchRows.map((r) => r.map(escapeCsv).join(','))
    ].join('\r\n');

    return {
      filename: `${tournament.slug}-scoreboard.csv`,
      csv: csvContent
    };
  }
}
