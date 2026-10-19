import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('   ETMS Clean Database Reset & Seeding Script');
  console.log('====================================================');

  // =========================================================================
  // 1. REVERSE-ORDER PURGE TO PREVENT FOREIGN-KEY CASCADE CONFLICTS
  // =========================================================================
  console.log('\n[1/4] Purging existing database records in reverse dependency order...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.matchResult.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.round.deleteMany({});
  await prisma.tournamentParticipant.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.tournament.deleteMany({});
  await prisma.game.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✓ Successfully cleared all tables.');

  // =========================================================================
  // 2. SEED CORE DEMO USERS (Password: PASSWORD123!)
  // =========================================================================
  console.log('\n[2/4] Seeding core quick-login demo accounts...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('PASSWORD123!', salt);

  // Super Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@esports.com',
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
      bio: 'Master Platform Super Administrator'
    }
  });

  // Dedicated Demo Organizer (Owns all 3 tournaments)
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@esports.com',
      username: 'organizer',
      passwordHash,
      role: 'ORGANIZER',
      bio: 'Official Tournaments Lead Host'
    }
  });

  // Player 1 (Solo competitor & Duo Captain)
  const player1 = await prisma.user.create({
    data: {
      email: 'player1@esports.com',
      username: 'player1',
      passwordHash,
      role: 'PLAYER',
      bio: 'Pro Solo Marksman & Apex Duo Captain'
    }
  });

  // Player 2 (Duo Partner)
  const player2 = await prisma.user.create({
    data: {
      email: 'player2@esports.com',
      username: 'player2',
      passwordHash,
      role: 'PLAYER',
      bio: 'Apex Duo Tactical Flanker'
    }
  });

  // Referee (For referee dashboard and score verification)
  const referee = await prisma.user.create({
    data: {
      email: 'referee@esports.com',
      username: 'referee',
      passwordHash,
      role: 'REFEREE',
      bio: 'Certified Senior Esports Referee'
    }
  });

  console.log(`✓ Seeded 5 core users (All with password: PASSWORD123!):`);
  console.log(`  - Admin:      admin@esports.com`);
  console.log(`  - Organizer:  organizer@esports.com`);
  console.log(`  - Player 1:   player1@esports.com`);
  console.log(`  - Player 2:   player2@esports.com`);
  console.log(`  - Referee:    referee@esports.com`);

  // =========================================================================
  // 3. SEED STRICT 5 CORE ESPORTS TITLES
  // =========================================================================
  console.log('\n[3/4] Seeding core recognized e-sports titles (Strictly 5 Games)...');

  const valorant = await prisma.game.create({
    data: {
      title: 'Valorant',
      slug: 'valorant',
      genre: 'FPS',
      platform: 'PC',
      coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
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
      coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
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
      genre: 'FPS',
      platform: 'PC',
      coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
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
      genre: 'Sports',
      platform: 'Cross-Platform',
      coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
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
      coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      isTeamBased: true,
      minTeamSize: 1,
      maxTeamSize: 5,
      createdById: admin.id
    }
  });

  console.log('✓ Seeded 5 official titles: Valorant, BGMI, CS2, Rocket League, Dota 2.');

  // =========================================================================
  // 4. SEED EXACTLY 3 TOURNAMENTS (ALL OWNED BY THE DEMO ORGANIZER)
  // =========================================================================
  console.log('\n[4/4] Seeding exactly 3 tournaments by demo organizer...');

  // -------------------------------------------------------------------------
  // Tournament 1: SOLO Battle Royale (Sub-DB: Player 1, Leaderboard Score, No Team)
  // -------------------------------------------------------------------------
  const tourneySolo = await prisma.tournament.create({
    data: {
      title: 'Solo Apex Battlegrounds Championship',
      slug: 'solo-apex-battlegrounds-championship',
      description: 'The premier Solo Battle Royale championship. Points aggregate Kill Points + Placement Rank.',
      bannerImage: bgmi.coverImage,
      prizePool: '$5,000 USD',
      structure: 'LEADERBOARD_POINTS',
      format: 'SOLO',
      status: 'COMPLETED',
      maxParticipants: 16,
      currentCount: 1,
      gameId: bgmi.id,
      organizerId: organizer.id,
      startDate: new Date(Date.now() - 3 * 86400000),
      endDate: new Date(Date.now() - 1 * 86400000)
    }
  });

  // Solo Participant (teamId MUST be null)
  const soloParticipant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: tourneySolo.id,
      userId: player1.id,
      teamId: null,
      inGameName: 'ShadowViper',
      status: 'CHECKED_IN',
      seed: 1
    }
  });

  // Solo Score Table
  const soloRound = await prisma.round.create({
    data: {
      tournamentId: tourneySolo.id,
      roundNumber: 1,
      name: 'Round 1 - Erangel Finals'
    }
  });

  const soloMatch = await prisma.match.create({
    data: {
      tournamentId: tourneySolo.id,
      roundId: soloRound.id,
      matchNumber: 1,
      status: 'COMPLETED',
      isVerified: true,
      verifiedById: referee.id,
      verifiedAt: new Date(),
      completedAt: new Date(Date.now() - 2 * 86400000)
    }
  });

  await prisma.matchResult.create({
    data: {
      matchId: soloMatch.id,
      participantId: soloParticipant.id,
      score: 95,
      kills: 9,
      placement: 1,
      isWinner: true
    }
  });

  console.log(`✓ Tournament 1 (SOLO): "${tourneySolo.title}" (Participant: Player 1, 0 teams created).`);

  // -------------------------------------------------------------------------
  // Tournament 2: DUO Knockout (Sub-DB: Team "Apex Duo", Player 1 & 2, Score)
  // -------------------------------------------------------------------------
  const tourneyDuo = await prisma.tournament.create({
    data: {
      title: 'Rocket League Duo Clash Series',
      slug: 'rocket-league-duo-clash-series',
      description: 'High-octane 2v2 Rocket League Knockout Bracket. Coordinated aerial strikes and teamplay.',
      bannerImage: rocketLeague.coverImage,
      prizePool: '$3,500 USD',
      structure: 'SINGLE_ELIMINATION',
      format: 'DUO',
      status: 'IN_PROGRESS',
      maxParticipants: 8,
      currentCount: 2,
      gameId: rocketLeague.id,
      organizerId: organizer.id,
      startDate: new Date(Date.now() - 1 * 86400000),
      endDate: new Date(Date.now() + 2 * 86400000)
    }
  });

  // Team Record linking Player 1 & 2
  const duoTeam = await prisma.team.create({
    data: {
      tournamentId: tourneyDuo.id,
      name: 'Apex Duo',
      tag: 'APX',
      inviteCode: 'DUO101',
      captainId: player1.id
    }
  });

  // Team Members
  await prisma.teamMember.create({
    data: {
      teamId: duoTeam.id,
      userId: player1.id,
      role: 'CAPTAIN'
    }
  });

  await prisma.teamMember.create({
    data: {
      teamId: duoTeam.id,
      userId: player2.id,
      role: 'STARTER'
    }
  });

  // Tournament Participants linked to Team
  const duoPart1 = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: tourneyDuo.id,
      userId: player1.id,
      teamId: duoTeam.id,
      inGameName: 'ShadowViper',
      status: 'CHECKED_IN',
      seed: 1
    }
  });

  const duoPart2 = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: tourneyDuo.id,
      userId: player2.id,
      teamId: duoTeam.id,
      inGameName: 'NovaBlast',
      status: 'CHECKED_IN',
      seed: 1
    }
  });

  // Duo Match & Score Record
  const duoRound = await prisma.round.create({
    data: {
      tournamentId: tourneyDuo.id,
      roundNumber: 1,
      name: 'Semifinals'
    }
  });

  const duoMatch = await prisma.match.create({
    data: {
      tournamentId: tourneyDuo.id,
      roundId: duoRound.id,
      matchNumber: 1,
      status: 'COMPLETED',
      isVerified: true,
      verifiedById: referee.id,
      verifiedAt: new Date(),
      completedAt: new Date()
    }
  });

  await prisma.matchResult.create({
    data: {
      matchId: duoMatch.id,
      participantId: duoPart1.id,
      score: 4,
      kills: 3,
      isWinner: true
    }
  });

  await prisma.matchResult.create({
    data: {
      matchId: duoMatch.id,
      participantId: duoPart2.id,
      score: 4,
      kills: 2,
      isWinner: true
    }
  });

  console.log(`✓ Tournament 2 (DUO): "${tourneyDuo.title}" (Team: Apex Duo, Code: DUO101, Players: 1 & 2).`);

  // -------------------------------------------------------------------------
  // Tournament 3: SQUAD Upcoming / Registration Open (Clean slate)
  // -------------------------------------------------------------------------
  const tourneySquad = await prisma.tournament.create({
    data: {
      title: 'CS2 Masters Squad Invitational',
      slug: 'cs2-masters-squad-invitational',
      description: 'Competitive 5v5 Tactical Shooter Tournament. Registration is open to all qualified squads.',
      bannerImage: cs2.coverImage,
      prizePool: '$10,000 USD',
      structure: 'SINGLE_ELIMINATION',
      format: 'SQUAD',
      status: 'REGISTRATION_OPEN',
      maxParticipants: 16,
      currentCount: 0,
      gameId: cs2.id,
      organizerId: organizer.id,
      startDate: new Date(Date.now() + 5 * 86400000),
      endDate: new Date(Date.now() + 10 * 86400000)
    }
  });

  console.log(`✓ Tournament 3 (SQUAD): "${tourneySquad.title}" (Status: REGISTRATION_OPEN, 0 participants).`);

  // Seed sample audit log entry
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actionType: 'DATABASE_INITIALIZATION',
      targetEntity: 'SYSTEM',
      targetId: 'ETMS_ROOT',
      details: JSON.stringify({
        environment: 'development',
        usersCount: 5,
        gamesCount: 5,
        tournamentsCount: 3
      }),
      context: 'Initial clean seeding with standard demo credentials'
    }
  });

  console.log('\n====================================================');
  console.log('   Clean Reset & Seeding Completed Successfully!    ');
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
