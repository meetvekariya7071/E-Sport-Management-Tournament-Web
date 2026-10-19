import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding foundational database records...');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 1. Seed Roles & Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@esports.com' },
    update: {},
    create: {
      email: 'admin@esports.com',
      username: 'SystemAdmin',
      passwordHash,
      role: 'ADMIN',
      bio: 'Head Platform Administrator'
    }
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@esports.com' },
    update: {},
    create: {
      email: 'organizer@esports.com',
      username: 'ApexOrganizer',
      passwordHash,
      role: 'ORGANIZER',
      bio: 'Premier League Esports Organizer'
    }
  });

  const player1 = await prisma.user.upsert({
    where: { email: 'player1@esports.com' },
    update: {},
    create: {
      email: 'player1@esports.com',
      username: 'ProGamerX',
      passwordHash,
      role: 'PLAYER',
      bio: 'Ranked Radiant Valorant Player'
    }
  });

  const player2 = await prisma.user.upsert({
    where: { email: 'player2@esports.com' },
    update: {},
    create: {
      email: 'player2@esports.com',
      username: 'ShadowSniper',
      passwordHash,
      role: 'PLAYER',
      bio: 'Competitive Duo Partner'
    }
  });

  const referee = await prisma.user.upsert({
    where: { email: 'referee@esports.com' },
    update: {},
    create: {
      email: 'referee@esports.com',
      username: 'MatchOfficial',
      passwordHash,
      role: 'REFEREE',
      bio: 'Certified Tournament Match Referee'
    }
  });

  console.log('[Seed] Created default users:');
  console.log(' - Admin:     admin@esports.com     / Password123!');
  console.log(' - Organizer: organizer@esports.com / Password123!');
  console.log(' - Player 1:  player1@esports.com   / Password123!');
  console.log(' - Player 2:  player2@esports.com   / Password123!');
  console.log(' - Referee:   referee@esports.com   / Password123!');

  // 2. Seed Master Game Catalog
  const valorant = await prisma.game.upsert({
    where: { slug: 'valorant' },
    update: {},
    create: {
      title: 'Valorant',
      slug: 'valorant',
      genre: 'Tactical FPS',
      platform: 'PC',
      coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 5,
      maxTeamSize: 5,
      createdById: admin.id
    }
  });

  const pubg = await prisma.game.upsert({
    where: { slug: 'pubg-battlegrounds' },
    update: {},
    create: {
      title: 'PUBG: BATTLEGROUNDS',
      slug: 'pubg-battlegrounds',
      genre: 'Battle Royale',
      platform: 'PC / Console',
      coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 1,
      maxTeamSize: 4,
      createdById: admin.id
    }
  });

  const chess = await prisma.game.upsert({
    where: { slug: 'speed-chess' },
    update: {},
    create: {
      title: 'Speed Chess',
      slug: 'speed-chess',
      genre: 'Strategy',
      platform: 'Cross-Platform',
      coverImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&auto=format&fit=crop&q=80',
      isTeamBased: false,
      minTeamSize: 1,
      maxTeamSize: 1,
      createdById: admin.id
    }
  });

  console.log('[Seed] Seeded Games: Valorant, PUBG, Speed Chess');

  // 3. Seed Sample Solo Tournament
  const soloTournament = await prisma.tournament.upsert({
    where: { slug: 'speed-chess-winter-open' },
    update: {},
    create: {
      title: 'Speed Chess Winter Open',
      slug: 'speed-chess-winter-open',
      description: 'Annual competitive 1v1 rapid blitz showdown.',
      gameId: chess.id,
      organizerId: organizer.id,
      format: 'SOLO',
      status: 'REGISTRATION_OPEN',
      maxParticipants: 16,
      currentCount: 1,
      startDate: new Date(Date.now() + 86400000 * 7)
    }
  });

  // Seed sample solo participant (teamId is null)
  await prisma.tournamentParticipant.upsert({
    where: {
      tournamentId_userId: {
        tournamentId: soloTournament.id,
        userId: player1.id
      }
    },
    update: {},
    create: {
      tournamentId: soloTournament.id,
      userId: player1.id,
      teamId: null,
      status: 'REGISTERED'
    }
  });

  console.log('[Seed] Seeded sample Solo Tournament with Solo registration (bypassed team).');
  console.log('[Seed] Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
