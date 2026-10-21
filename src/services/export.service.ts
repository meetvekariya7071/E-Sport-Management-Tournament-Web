import { prisma } from '../config/db';
import { BracketService } from './bracket.service';

/**
 * Escapes a cell for CSV formatting adhering to RFC 4180.
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts array of objects to CSV string.
 */
function toCsv(headers: string[], rows: Array<Array<any>>): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsv).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export class ExportService {
  /**
   * Generates CSV for Tournament Participants.
   * Uses targeted select projection for high-speed retrieval.
   */
  static async exportParticipants(tournamentId: string): Promise<{ filename: string; csv: string }> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        title: true,
        slug: true,
        format: true,
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
                email: true
              }
            },
            team: {
              select: {
                name: true,
                tag: true
              }
            }
          },
          orderBy: { registeredAt: 'asc' }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    const headers = [
      'Slot',
      'In-Game Name (IGN)',
      'Account Username',
      'Email',
      'Status',
      'Team Name',
      'Team Tag',
      'Seed',
      'Registered Date'
    ];

    const rows = tournament.participants.map((p, idx) => [
      idx + 1,
      p.inGameName || p.user.username,
      p.user.username,
      p.user.email,
      p.status,
      p.team?.name || 'N/A',
      p.team?.tag || 'N/A',
      p.seed ?? 'Unseeded',
      new Date(p.registeredAt).toISOString()
    ]);

    const csv = toCsv(headers, rows);
    const filename = `${tournament.slug}-participants-${Date.now()}.csv`;
    return { filename, csv };
  }

  /**
   * Generates CSV for Tournament Teams (DUO/SQUAD).
   */
  static async exportTeams(tournamentId: string): Promise<{ filename: string; csv: string }> {
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
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    if (tournament.format === 'SOLO') {
      throw new Error('BAD_REQUEST: Team export is not applicable for SOLO tournaments.');
    }

    const headers = [
      'Slot',
      'Team Name',
      'Tag',
      'Invite Code',
      'Captain Username',
      'Captain Email',
      'Roster Size',
      'Roster Members',
      'Created Date'
    ];

    const rows = tournament.teams.map((t, idx) => [
      idx + 1,
      t.name,
      t.tag || '',
      t.inviteCode || '',
      t.captain.username,
      t.captain.email,
      t.members.length,
      t.members.map((m) => `${m.user.username} (${m.role})`).join('; '),
      new Date(t.createdAt).toISOString()
    ]);

    const csv = toCsv(headers, rows);
    const filename = `${tournament.slug}-teams-${Date.now()}.csv`;
    return { filename, csv };
  }

  /**
   * Generates CSV for Tournament Scoreboard and Leaderboard Standings.
   */
  static async exportScores(tournamentId: string): Promise<{ filename: string; csv: string }> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        title: true,
        slug: true,
        structure: true,
        participants: {
          select: {
            id: true,
            inGameName: true,
            user: { select: { username: true, email: true } },
            team: { select: { name: true, tag: true } }
          }
        },
        rounds: {
          select: {
            roundNumber: true,
            name: true,
            stage: true,
            matches: {
              select: {
                matchNumber: true,
                status: true,
                results: {
                  select: {
                    participantId: true,
                    score: true,
                    kills: true,
                    placement: true,
                    isWinner: true
                  }
                }
              }
            }
          },
          orderBy: { roundNumber: 'asc' }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    // Compute dynamic standings
    const standings = BracketService.computeStandings(
      tournament.participants,
      tournament.rounds,
      tournament.structure
    );

    // Section 1: Aggregated Standings
    const standingsHeaders = [
      'Rank',
      'Competitor Name',
      'Team Tag',
      'Type',
      'Matches Played',
      'Rank Points',
      'Kill Points',
      'Total Kills',
      'Wins',
      'Total Score / Points'
    ];

    const standingsRows = standings.map((s) => [
      s.rank,
      s.name,
      s.tag || '',
      s.isTeam ? 'Team' : 'Solo Player',
      s.matchesPlayed,
      s.rankPoints,
      s.killPoints,
      s.totalKills,
      s.wins,
      s.totalPoints
    ]);

    let csv = '# TOURNAMENT OVERALL STANDINGS & LEADERBOARD\r\n';
    csv += toCsv(standingsHeaders, standingsRows);
    csv += '\r\n\r\n# INDIVIDUAL MATCH SCORES BREAKDOWN\r\n';

    // Section 2: Detailed Match breakdown
    const matchHeaders = [
      'Round Number',
      'Round Name',
      'Match Number',
      'Competitor Name',
      'Score',
      'Kills',
      'Placement',
      'Is Winner'
    ];

    const matchRows: Array<Array<any>> = [];
    const participantNameMap = new Map<string, string>();
    for (const p of tournament.participants) {
      participantNameMap.set(p.id, p.team?.name || p.inGameName || p.user.username);
    }

    for (const r of tournament.rounds) {
      for (const m of r.matches) {
        for (const res of m.results) {
          matchRows.push([
            r.roundNumber,
            r.name,
            m.matchNumber,
            participantNameMap.get(res.participantId) || 'Unknown',
            res.score,
            res.kills || 0,
            res.placement ?? 'N/A',
            res.isWinner ? 'YES' : 'NO'
          ]);
        }
      }
    }

    csv += toCsv(matchHeaders, matchRows);
    const filename = `${tournament.slug}-scores-${Date.now()}.csv`;
    return { filename, csv };
  }
}
