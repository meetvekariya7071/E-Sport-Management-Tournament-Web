import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';
import { BracketService } from '../src/services/bracket.service';

describe('Operational Safeguards, Roster Edges & Bracket Recovery Suite', () => {
  const timestamp = Date.now();
  let testGame: any;
  let organizer: any;
  let organizerToken: string;
  let captainUser: any;
  let captainToken: string;
  let player1: any;
  let player2: any;
  let substituteUser: any;
  let spectatorUser: any;
  let spectatorToken: string;

  let bracketTournamentId: string;
  let pointsTournamentId: string;
  let duoTeamId: string;
  let round1MatchId: string;
  let finalMatchId: string;
  let comp1ParticipantId: string;
  let comp2ParticipantId: string;

  beforeAll(async () => {
    // 1. Game
    testGame = await prisma.game.create({
      data: {
        title: `Operations Test Game ${timestamp}`,
        slug: `ops-game-${timestamp}`,
        genre: 'Tactical Arena',
        minTeamSize: 1,
        maxTeamSize: 4,
        isTeamBased: true
      }
    });

    // 2. Organizer
    organizer = await prisma.user.create({
      data: {
        email: `ops_org_${timestamp}@esports.com`,
        username: `ops_org_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'ORGANIZER'
      }
    });
    organizerToken = jwt.sign(
      { sub: organizer.id, email: organizer.email, role: 'ORGANIZER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Captain & Players
    captainUser = await prisma.user.create({
      data: {
        email: `captain_${timestamp}@esports.com`,
        username: `captain_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });
    captainToken = jwt.sign(
      { sub: captainUser.id, email: captainUser.email, role: 'PLAYER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    player1 = await prisma.user.create({
      data: {
        email: `player1_${timestamp}@esports.com`,
        username: `player1_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });

    player2 = await prisma.user.create({
      data: {
        email: `player2_${timestamp}@esports.com`,
        username: `player2_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });

    substituteUser = await prisma.user.create({
      data: {
        email: `sub_${timestamp}@esports.com`,
        username: `sub_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });

    spectatorUser = await prisma.user.create({
      data: {
        email: `spectator_${timestamp}@esports.com`,
        username: `spectator_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });
    spectatorToken = jwt.sign(
      { sub: spectatorUser.id, email: spectatorUser.email, role: 'PLAYER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Create Single Elimination Tournament
    const elimTourney = await prisma.tournament.create({
      data: {
        title: `Bracket Ops Tourney ${timestamp}`,
        slug: `bracket-ops-${timestamp}`,
        gameId: testGame.id,
        organizerId: organizer.id,
        format: 'DUO',
        structure: 'SINGLE_ELIMINATION',
        maxParticipants: 4,
        status: 'IN_PROGRESS',
        startDate: new Date()
      }
    });
    bracketTournamentId = elimTourney.id;

    // Team 1
    const team1 = await prisma.team.create({
      data: {
        tournamentId: bracketTournamentId,
        name: `Alpha Squad ${timestamp}`,
        inviteCode: `ALP${timestamp.toString().slice(-3)}`,
        captainId: captainUser.id
      }
    });
    duoTeamId = team1.id;

    await prisma.teamMember.createMany({
      data: [
        { teamId: team1.id, userId: captainUser.id, role: 'CAPTAIN' },
        { teamId: team1.id, userId: player1.id, role: 'STARTER' }
      ]
    });

    const part1 = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: bracketTournamentId,
        userId: captainUser.id,
        teamId: team1.id,
        status: 'CHECKED_IN'
      }
    });
    comp1ParticipantId = part1.id;

    // Team 2
    const team2 = await prisma.team.create({
      data: {
        tournamentId: bracketTournamentId,
        name: `Beta Squad ${timestamp}`,
        inviteCode: `BET${timestamp.toString().slice(-3)}`,
        captainId: player2.id
      }
    });

    await prisma.teamMember.create({
      data: { teamId: team2.id, userId: player2.id, role: 'CAPTAIN' }
    });

    const part2 = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: bracketTournamentId,
        userId: player2.id,
        teamId: team2.id,
        status: 'CHECKED_IN'
      }
    });
    comp2ParticipantId = part2.id;

    // Rounds & Matches (Round 1 -> Finals)
    const r1 = await prisma.matchRound.create({
      data: {
        tournamentId: bracketTournamentId,
        roundNumber: 1,
        name: 'Semifinals',
        stage: 'SEMIFINALS'
      }
    });

    const r2 = await prisma.matchRound.create({
      data: {
        tournamentId: bracketTournamentId,
        roundNumber: 2,
        name: 'Grand Finals',
        stage: 'FINALS'
      }
    });

    const finalsMatch = await prisma.match.create({
      data: {
        tournamentId: bracketTournamentId,
        roundId: r2.id,
        matchNumber: 1,
        status: 'PENDING'
      }
    });
    finalMatchId = finalsMatch.id;

    const match1 = await prisma.match.create({
      data: {
        tournamentId: bracketTournamentId,
        roundId: r1.id,
        matchNumber: 1,
        status: 'SCHEDULED',
        nextMatchId: finalMatchId,
        nextMatchSlot: 1
      }
    });
    round1MatchId = match1.id;

    await prisma.scoreRecord.createMany({
      data: [
        {
          tournamentId: bracketTournamentId,
          matchId: round1MatchId,
          participantId: comp1ParticipantId,
          roundNumber: 1,
          score: 0,
          isWinner: false
        },
        {
          tournamentId: bracketTournamentId,
          matchId: round1MatchId,
          participantId: comp2ParticipantId,
          roundNumber: 1,
          score: 0,
          isWinner: false
        }
      ]
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.tournament.deleteMany({
      where: {
        id: { in: [bracketTournamentId, pointsTournamentId].filter(Boolean) }
      }
    });
    await prisma.game.deleteMany({ where: { id: testGame.id } });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            organizer.id,
            captainUser.id,
            player1.id,
            player2.id,
            substituteUser.id,
            spectatorUser.id
          ]
        }
      }
    });
  });

  describe('1. Roster Substitution Engine', () => {
    it('Should allow Team Captain to swap an inactive starter with a substitute', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${bracketTournamentId}/teams/${duoTeamId}/substitute`)
        .set('Authorization', `Bearer ${captainToken}`)
        .send({
          outgoingUserId: player1.id,
          incomingIdentifier: substituteUser.username,
          inGameName: 'SubAce'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify team members: player1 is now SUBSTITUTE, substituteUser is STARTER
      const oldMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: duoTeamId, userId: player1.id } }
      });
      expect(oldMember?.role).toBe('SUBSTITUTE');

      const newMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: duoTeamId, userId: substituteUser.id } }
      });
      expect(newMember?.role).toBe('STARTER');
    });

    it('Should reject substitution if requester is not captain or organizer', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${bracketTournamentId}/teams/${duoTeamId}/substitute`)
        .set('Authorization', `Bearer ${spectatorToken}`)
        .send({
          outgoingUserId: substituteUser.id,
          incomingIdentifier: player1.id
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. Custom Lobby Room Credentials Distribution', () => {
    it('Should allow Organizer to publish room credentials', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${bracketTournamentId}/matches/${round1MatchId}/credentials`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          customRoomId: 'BGMI-ROOM-9941',
          customRoomPassword: 'LobbyPass@77',
          roomInstructions: 'Server: Frankfurt 1. Join Discord voice channel #A.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match.customRoomId).toBe('BGMI-ROOM-9941');
    });

    it('Should allow checked-in match participant to access room credentials', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${bracketTournamentId}/matches/${round1MatchId}/credentials`)
        .set('Authorization', `Bearer ${captainToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.customRoomId).toBe('BGMI-ROOM-9941');
      expect(res.body.customRoomPassword).toBe('LobbyPass@77');
    });

    it('Should forbid unassigned spectator from accessing room credentials', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${bracketTournamentId}/matches/${round1MatchId}/credentials`)
        .set('Authorization', `Bearer ${spectatorToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Walkover / Bye Advancement Handler', () => {
    it('Should award walkover to winner and auto-advance to next round fixture', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${bracketTournamentId}/matches/${round1MatchId}/walkover`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          winnerParticipantId: comp1ParticipantId,
          forfeitParticipantId: comp2ParticipantId,
          reason: 'Opponent team failed to check in within 15 minutes.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.advancedPayload).toBeDefined();
      expect(res.body.advancedPayload.nextMatchId).toBe(finalMatchId);

      // Verify Round 1 match is COMPLETED
      const m1 = await prisma.match.findUnique({ where: { id: round1MatchId } });
      expect(m1?.status).toBe('COMPLETED');

      // Verify winner is seeded into Finals fixture
      const finalsScore = await prisma.scoreRecord.findUnique({
        where: {
          matchId_participantId: {
            matchId: finalMatchId,
            participantId: comp1ParticipantId
          }
        }
      });
      expect(finalsScore).toBeDefined();

      // Verify forfeit participant is marked DISQUALIFIED
      const p2 = await prisma.tournamentParticipant.findUnique({
        where: { id: comp2ParticipantId }
      });
      expect(p2?.status).toBe('DISQUALIFIED');
    });

    it('Should auto-hide room credentials once the match concludes', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${bracketTournamentId}/matches/${round1MatchId}/credentials`)
        .set('Authorization', `Bearer ${captainToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isConcluded).toBe(true);
      expect(res.body.customRoomId).toBeNull();
    });
  });

  describe('4. Match Rollback & Bracket Advancement Reversal', () => {
    it('Should revert match to SCHEDULED and safely clear downstream bracket advances', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${bracketTournamentId}/matches/${round1MatchId}/rollback`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify target match is back to SCHEDULED
      const m1 = await prisma.match.findUnique({ where: { id: round1MatchId } });
      expect(m1?.status).toBe('SCHEDULED');
      expect(m1?.completedAt).toBeNull();

      // Verify winner was removed from Finals fixture
      const finalsScore = await prisma.scoreRecord.findUnique({
        where: {
          matchId_participantId: {
            matchId: finalMatchId,
            participantId: comp1ParticipantId
          }
        }
      });
      expect(finalsScore).toBeNull();
    });
  });

  describe('5. Configurable Tie-Breaker Engine', () => {
    it('Should properly sort standings using Priority 1 (Points), Priority 2 (Kills), and Priority 3 (Final Round)', () => {
      const participants = [
        { id: 'partA', user: { username: 'PlayerA' } },
        { id: 'partB', user: { username: 'PlayerB' } },
        { id: 'partC', user: { username: 'PlayerC' } }
      ];

      // Round 1 and Round 2 (Final round)
      const rounds = [
        {
          roundNumber: 1,
          matches: [
            {
              id: 'm-r1',
              status: 'COMPLETED',
              results: [
                { participantId: 'partA', score: 0, kills: 4, placement: 2 }, // 6 placement pts + 4 kills = 10 pts
                { participantId: 'partB', score: 0, kills: 0, placement: 1 }, // 10 placement pts + 0 kills = 10 pts
                { participantId: 'partC', score: 0, kills: 1, placement: 3 }  // 5 placement pts + 1 kill = 6 pts
              ]
            }
          ]
        },
        {
          roundNumber: 2,
          matches: [
            {
              id: 'm-r2',
              status: 'COMPLETED',
              results: [
                { participantId: 'partA', score: 0, kills: 0, placement: 1 }, // 10 placement pts + 0 kills = 10 pts (Total: 20 pts, 4 kills, Final: 1st)
                { participantId: 'partB', score: 0, kills: 4, placement: 2 }, // 6 placement pts + 4 kills = 10 pts (Total: 20 pts, 4 kills, Final: 2nd)
                { participantId: 'partC', score: 0, kills: 2, placement: 3 }
              ]
            }
          ]
        }
      ];

      // Both PartA and PartB have identical totalPoints (20) and identical totalKills (4).
      // Priority 3: Best placement in the final round (PartA was 1st, PartB was 2nd).
      const standings = BracketService.computeStandings(
        participants,
        rounds,
        'LEADERBOARD_POINTS',
        ['TOTAL_POINTS', 'TOTAL_KILLS', 'FINAL_ROUND_PLACEMENT', 'HEAD_TO_HEAD']
      );

      expect(standings[0].participantId).toBe('partA');
      expect(standings[1].participantId).toBe('partB');
      expect(standings[0].rank).toBe(1);
      expect(standings[1].rank).toBe(2);
      expect(standings[0].tieBreakerBadge).toContain('Final Round');
    });

    it('Should allow Organizer to reconfigure tie-breaker priority order via API', async () => {
      const res = await request(app)
        .patch(`/api/tournaments/${bracketTournamentId}/tie-breakers`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          tieBreakerRules: ['TOTAL_POINTS', 'TOTAL_KILLS', 'HEAD_TO_HEAD', 'FINAL_ROUND_PLACEMENT']
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tieBreakerRules).toEqual([
        'TOTAL_POINTS',
        'TOTAL_KILLS',
        'HEAD_TO_HEAD',
        'FINAL_ROUND_PLACEMENT'
      ]);
    });
  });
});
