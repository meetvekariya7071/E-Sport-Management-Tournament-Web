import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🎮 [ETMS Seeder] Starting database cleanup and clean demo seed...\n');

  // =========================================================================
  // 0. PURGE EXISTING DATA (Strict Reverse Dependency Order)
  // =========================================================================
  console.log('🧹 [1/5] Purging existing database records in reverse dependency order...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.scoreRecord.deleteMany();
  await prisma.match.deleteMany();
  await prisma.matchRound.deleteMany();
  await prisma.tournamentParticipant.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.game.deleteMany();
  await prisma.user.deleteMany();
  console.log(' ✅ All extraneous tables and test records successfully cleared.');

  // =========================================================================
  // 1. SEED USER ACCOUNTS (Standard Demo Password: PASSWORD123!)
  // =========================================================================
  console.log('\n👤 [2/5] Seeding core demo user accounts (Password: PASSWORD123!)...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('PASSWORD123!', salt);

  // 1.1 Super Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@esports.com',
      username: 'ApexAdmin',
      passwordHash,
      role: 'ADMIN',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Platform Lead Systems Architect & Global Overseer',
      avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80'
    }
  });

  // 1.2 Organizer (Single demo organizer responsible for all tournaments)
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@esports.com',
      username: 'NexusHost',
      passwordHash,
      role: 'ORGANIZER',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Head Tournament Organizer & Competition Director',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
    }
  });

  // 1.3 Referee (Official Fair Play & Anti-Cheat Adjudicator)
  const referee = await prisma.user.create({
    data: {
      email: 'referee@esports.com',
      username: 'JudgeDredd',
      passwordHash,
      role: 'REFEREE',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Official Fair Play & Anti-Cheat Adjudicator',
      avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=80'
    }
  });

  // Secondary alias for referee
  const ref1 = await prisma.user.create({
    data: {
      email: 'ref1@esports.com',
      username: 'RefStaff1',
      passwordHash,
      role: 'REFEREE',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Assistant Referee Staff',
      avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=80'
    }
  });

  // 1.4 Player 1 (Solo)
  const player1 = await prisma.user.create({
    data: {
      email: 'player1@esports.com',
      username: 'ShadowViper',
      passwordHash,
      role: 'PLAYER',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Solo Competitive Athlete - IGN: ViperX',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowViper'
    }
  });

  // 1.5 Player 2 (Partner)
  const player2 = await prisma.user.create({
    data: {
      email: 'player2@esports.com',
      username: 'NovaBlast',
      passwordHash,
      role: 'PLAYER',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Duo Competitive Partner - IGN: Nova_99',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=NovaBlast'
    }
  });

  console.log(' ✅ Seeded demo accounts: Super Admin, Organizer, Referee, Player 1, Player 2.');

  // =========================================================================
  // 2. SEED GAMES CATALOG (Strictly 5 Recognized Titles)
  // =========================================================================
  console.log('\n🎯 [3/5] Seeding core Games Catalog (5 core e-sports titles)...');

  const valorant = await prisma.game.create({
    data: {
      title: 'Valorant',
      slug: 'valorant',
      genre: 'Tactical FPS',
      platform: 'PC',
      coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 1,
      maxTeamSize: 5,
      createdById: admin.id
    }
  });

  const bgmi = await prisma.game.create({
    data: {
      title: 'BGMI / PUBG Mobile',
      slug: 'bgmi-pubg-mobile',
      genre: 'Battle Royale',
      platform: 'Mobile',
      coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 1,
      maxTeamSize: 4,
      createdById: admin.id
    }
  });

  const cs2 = await prisma.game.create({
    data: {
      title: 'Counter-Strike 2',
      slug: 'counter-strike-2',
      genre: 'Tactical FPS',
      platform: 'PC',
      coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 1,
      maxTeamSize: 5,
      createdById: admin.id
    }
  });

  const rocketLeague = await prisma.game.create({
    data: {
      title: 'Rocket League',
      slug: 'rocket-league',
      genre: 'Vehicular Sports',
      platform: 'Cross-Platform',
      coverImage: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 1,
      maxTeamSize: 3,
      createdById: admin.id
    }
  });

  const dota2 = await prisma.game.create({
    data: {
      title: 'Dota 2',
      slug: 'dota-2',
      genre: 'MOBA',
      platform: 'PC',
      coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 1,
      maxTeamSize: 5,
      createdById: admin.id
    }
  });

  console.log(' ✅ Seeded 5 games: Valorant, BGMI / PUBG Mobile, Counter-Strike 2, Rocket League, Dota 2.');

  // =========================================================================
  // 3. SEED TOURNAMENTS (Exactly 3, all linked to the single demo Organizer)
  // =========================================================================
  console.log('\n🏆 [4/5] Seeding exactly 3 Tournaments under Organizer NexusHost...');

  // -------------------------------------------------------------------------
  // Tournament 1: SOLO Format (No Teams Generated, Solo Participant & Scores)
  // -------------------------------------------------------------------------
  const soloTournament = await prisma.tournament.create({
    data: {
      title: 'BGMI Solo Survival Cup 2026',
      slug: 'bgmi-solo-survival-cup-2026',
      description: 'High-octane solo survival tournament. Multi-round points leaderboard based on kills + placement.',
      bannerImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$5,000 USD',
      structure: 'LEADERBOARD_POINTS',
      gameId: bgmi.id,
      organizerId: organizer.id,
      format: 'SOLO',
      status: 'IN_PROGRESS',
      maxParticipants: 16,
      currentCount: 1,
      registrationStartDate: new Date(Date.now() - 86400000 * 5),
      registrationEndDate: new Date(Date.now() - 3600000 * 4),
      startDate: new Date(Date.now() - 3600000 * 2),
      endDate: new Date(Date.now() + 86400000 * 2)
    }
  });

  // Participant Entry for Player 1 (Strictly teamId: null, NO team records)
  const soloParticipant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: soloTournament.id,
      userId: player1.id,
      teamId: null,
      inGameName: 'ViperX',
      status: 'CHECKED_IN',
      seed: 1
    }
  });

  // Round & Match with ScoreRecord
  const soloRound = await prisma.matchRound.create({
    data: {
      tournamentId: soloTournament.id,
      roundNumber: 1,
      name: 'Map 1 - Erangel Drop',
      stage: 'MATCH'
    }
  });

  const soloMatch = await prisma.match.create({
    data: {
      tournamentId: soloTournament.id,
      roundId: soloRound.id,
      matchNumber: 1,
      refereeId: referee.id,
      status: 'COMPLETED',
      isVerified: true,
      verifiedById: referee.id,
      verifiedAt: new Date(),
      verificationNotes: 'Match verified and scorecard sealed by referee.',
      scheduledAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 1800000)
    }
  });

  await prisma.scoreRecord.create({
    data: {
      tournamentId: soloTournament.id,
      roundNumber: 1,
      matchId: soloMatch.id,
      participantId: soloParticipant.id,
      score: 25,
      kills: 7,
      placement: 1,
      isWinner: true
    }
  });

  console.log(' ✅ Tournament 1 (SOLO): Seeded BGMI Solo Survival Cup (Player 1 participant & scores, NO teams).');

  // -------------------------------------------------------------------------
  // Tournament 2: DUO Format (Team record linking Player 1 & 2 with invite code)
  // -------------------------------------------------------------------------
  const duoTournament = await prisma.tournament.create({
    data: {
      title: 'Rocket League 2v2 Turbo Clash',
      slug: 'rocket-league-2v2-turbo-clash',
      description: 'Competitive 2v2 aerial action. Elite duo teams battling through high-speed bracket fixtures.',
      bannerImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$8,000 USD',
      structure: 'SINGLE_ELIMINATION',
      gameId: rocketLeague.id,
      organizerId: organizer.id,
      format: 'DUO',
      status: 'IN_PROGRESS',
      maxParticipants: 8,
      currentCount: 2,
      registrationStartDate: new Date(Date.now() - 86400000 * 6),
      registrationEndDate: new Date(Date.now() - 3600000 * 5),
      startDate: new Date(Date.now() - 3600000 * 3),
      endDate: new Date(Date.now() + 86400000 * 3)
    }
  });

  // Team linking Player 1 (Captain) & Player 2 (Partner)
  const duoTeam = await prisma.team.create({
    data: {
      tournamentId: duoTournament.id,
      name: 'Aero Storm',
      tag: 'AERO',
      inviteCode: 'AERO99',
      captainId: player1.id
    }
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: duoTeam.id, userId: player1.id, role: 'CAPTAIN' },
      { teamId: duoTeam.id, userId: player2.id, role: 'STARTER' }
    ]
  });

  const duoParticipant1 = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: duoTournament.id,
      userId: player1.id,
      teamId: duoTeam.id,
      inGameName: 'ViperX',
      status: 'CHECKED_IN',
      seed: 1
    }
  });

  const duoParticipant2 = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: duoTournament.id,
      userId: player2.id,
      teamId: duoTeam.id,
      inGameName: 'Nova_99',
      status: 'CHECKED_IN',
      seed: 1
    }
  });

  // Round & Match with Score table for Duo
  const duoRound = await prisma.matchRound.create({
    data: {
      tournamentId: duoTournament.id,
      roundNumber: 1,
      name: 'Quarterfinals Match 1',
      stage: 'QUARTERFINALS'
    }
  });

  const duoMatch = await prisma.match.create({
    data: {
      tournamentId: duoTournament.id,
      roundId: duoRound.id,
      matchNumber: 1,
      refereeId: referee.id,
      status: 'IN_PROGRESS',
      isVerified: false,
      scheduledAt: new Date(Date.now() - 3600000 * 2)
    }
  });

  // Sample Dispute Ticket assigned for Referee resolution
  await prisma.dispute.create({
    data: {
      id: 'dispute-demo-001',
      tournamentId: duoTournament.id,
      matchId: duoMatch.id,
      claimantId: player2.id,
      reason: 'INCORRECT_SCORE',
      description: 'Player requesting referee verification of goal assist telemetry during overtime.',
      status: 'OPEN',
      proofUrl: 'https://clips.twitch.tv/example_esports_clip'
    }
  });

  await prisma.scoreRecord.createMany({
    data: [
      {
        tournamentId: duoTournament.id,
        roundNumber: 1,
        matchId: duoMatch.id,
        participantId: duoParticipant1.id,
        score: 4,
        kills: 3,
        isWinner: true
      },
      {
        tournamentId: duoTournament.id,
        roundNumber: 1,
        matchId: duoMatch.id,
        participantId: duoParticipant2.id,
        score: 4,
        kills: 1,
        isWinner: true
      }
    ]
  });

  console.log(' ✅ Tournament 2 (DUO): Seeded Rocket League 2v2 (Team "Aero Storm", Invite Code "AERO99", P1 & P2 linked, Score records).');

  // -------------------------------------------------------------------------
  // Tournament 3: SQUAD Format (Status: REGISTRATION_OPEN, Clean Slate)
  // -------------------------------------------------------------------------
  const squadTournament = await prisma.tournament.create({
    data: {
      title: 'Valorant Masters: Tactical Showdown',
      slug: 'valorant-masters-tactical-showdown',
      description: 'Premier 5v5 tactical squad elimination tournament. Registration is open for registered teams.',
      bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$20,000 USD',
      structure: 'SINGLE_ELIMINATION',
      gameId: valorant.id,
      organizerId: organizer.id,
      format: 'SQUAD',
      status: 'REGISTRATION_OPEN',
      maxParticipants: 16,
      currentCount: 0,
      registrationStartDate: new Date(Date.now() - 86400000 * 2),
      registrationEndDate: new Date(Date.now() + 86400000 * 4),
      startDate: new Date(Date.now() + 86400000 * 5),
      endDate: new Date(Date.now() + 86400000 * 8)
    }
  });

  console.log(' ✅ Tournament 3 (SQUAD): Seeded Valorant Masters (Status: REGISTRATION_OPEN, clean slate with open slots).');

  // -------------------------------------------------------------------------
  // Tournament 4: FUTURE / OPENING SOON (Registration has not opened yet)
  // -------------------------------------------------------------------------
  const futureTournament = await prisma.tournament.create({
    data: {
      title: 'CS2 Pro League: Season 4 Major',
      slug: 'cs2-pro-league-season-4-major',
      description: 'Major tier counter-strike showdown featuring premier squads. Global open qualifiers start soon.',
      bannerImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$50,000 USD',
      structure: 'DOUBLE_ELIMINATION',
      gameId: cs2.id,
      organizerId: organizer.id,
      format: 'SQUAD',
      status: 'DRAFT',
      maxParticipants: 32,
      currentCount: 0,
      registrationStartDate: new Date(Date.now() + 86400000 * 4),
      registrationEndDate: new Date(Date.now() + 86400000 * 9),
      startDate: new Date(Date.now() + 86400000 * 10),
      endDate: new Date(Date.now() + 86400000 * 14)
    }
  });

  console.log(' ✅ Tournament 4 (FUTURE): Seeded CS2 Pro League (Opening soon).');

  // -------------------------------------------------------------------------
  // Tournament 5: PAST / COMPLETED (Historical event, finals concluded)
  // -------------------------------------------------------------------------
  const pastTournament = await prisma.tournament.create({
    data: {
      title: 'Dota 2 Aegis Champions Invitational',
      slug: 'dota-2-aegis-champions-invitational',
      description: 'Concluded world-class Dota 2 showdown. Final championship brackets, replays, and podium archived.',
      bannerImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$35,000 USD',
      structure: 'SINGLE_ELIMINATION',
      gameId: dota2.id,
      organizerId: organizer.id,
      format: 'SQUAD',
      status: 'COMPLETED',
      maxParticipants: 16,
      currentCount: 16,
      registrationStartDate: new Date(Date.now() - 86400000 * 20),
      registrationEndDate: new Date(Date.now() - 86400000 * 15),
      startDate: new Date(Date.now() - 86400000 * 14),
      endDate: new Date(Date.now() - 86400000 * 5)
    }
  });

  console.log(' ✅ Tournament 5 (PAST): Seeded Dota 2 Aegis Champions (Completed showdown).');

  // =========================================================================
  // 4. SEED SAMPLE NOTIFICATIONS & AUDIT LOGS
  // =========================================================================
  console.log('\n🔔 [5/5] Seeding minimal notifications & audit trail...');
  await prisma.notification.createMany({
    data: [
      {
        userId: player1.id,
        title: 'Team Roster Ready',
        message: 'You have formed the duo team "Aero Storm" for Rocket League 2v2 Turbo Clash.',
        type: 'INVITE',
        link: `/tournaments/${duoTournament.id}`,
        isRead: false
      },
      {
        userId: player2.id,
        title: 'Joined Duo Team',
        message: 'You were added to "Aero Storm" by Captain ShadowViper.',
        type: 'INVITE',
        link: `/tournaments/${duoTournament.id}`,
        isRead: false
      },
      {
        userId: organizer.id,
        title: 'Tournament Published',
        message: 'Valorant Masters: Tactical Showdown is now open for registration.',
        type: 'SYSTEM',
        link: `/tournaments/${squadTournament.id}`,
        isRead: false
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: 'GAME_CATALOG_SYNC',
        targetEntity: 'GAME',
        targetId: valorant.id,
        ipAddress: '127.0.0.1',
        details: JSON.stringify({ message: 'Catalog standardized to 5 verified e-sports titles.' })
      },
      {
        actorId: organizer.id,
        action: 'TOURNAMENT_CREATE',
        targetEntity: 'TOURNAMENT',
        targetId: squadTournament.id,
        ipAddress: '127.0.0.1',
        details: JSON.stringify({ format: 'SQUAD', status: 'REGISTRATION_OPEN' })
      }
    ]
  });

  console.log('\n=============================================================');
  console.log('🎉 [ETMS Seeder] Clean Demo Dataset Seeded Successfully!');
  console.log('=============================================================');
  console.log('🔑 Demo User Accounts:');
  console.log(' - Super Admin:  admin@esports.com     / PASSWORD123! (Role: ADMIN)');
  console.log(' - Organizer:    organizer@esports.com / PASSWORD123! (Role: ORGANIZER)');
  console.log(' - Referee:      referee@esports.com   / PASSWORD123! (Role: REFEREE)');
  console.log(' - Player 1:     player1@esports.com   / PASSWORD123! (Role: PLAYER)');
  console.log(' - Player 2:     player2@esports.com   / PASSWORD123! (Role: PLAYER)');
  console.log('🎮 Games Catalog (5):');
  console.log(' - Valorant, BGMI / PUBG Mobile, Counter-Strike 2, Rocket League, Dota 2');
  console.log('🏆 Tournaments (3 by Organizer NexusHost):');
  console.log(' - 1. BGMI Solo Survival Cup (SOLO, Player 1 participant, Scores, NO teams)');
  console.log(' - 2. Rocket League 2v2 Turbo Clash (DUO, Aero Storm [AERO99], P1 & P2, Scores)');
  console.log(' - 3. Valorant Masters: Tactical Showdown (SQUAD, REGISTRATION_OPEN, Clean slate)');
  console.log('=============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ [Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
