import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🎮 [LeagueForge ETMS Seeder] Starting database cleanup and full production seed...\n');

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
  console.log(' ✅ All database tables successfully cleared.');

  // =========================================================================
  // 1. ACCOUNTS SETUP (Password: Password123!)
  // =========================================================================
  console.log('\n👤 [2/5] Seeding core accounts (Password: Password123!)...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 1.1 Super Admin: admin@leagueforge.com
  const admin = await prisma.user.create({
    data: {
      email: 'admin@leagueforge.com',
      username: 'SuperAdmin',
      passwordHash,
      role: 'ADMIN',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Platform Overseer & LeagueForge Principal Database Administrator',
      avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80'
    }
  });

  // 1.2 Organizers: organizer1@leagueforge.com & organizer2@leagueforge.com
  const organizer1 = await prisma.user.create({
    data: {
      email: 'organizer1@leagueforge.com',
      username: 'Organizer_1',
      passwordHash,
      role: 'ORGANIZER',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Head Tournament Director & Competitive Ops Lead (Organizer 1)',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
    }
  });

  const organizer2 = await prisma.user.create({
    data: {
      email: 'organizer2@leagueforge.com',
      username: 'Organizer_2',
      passwordHash,
      role: 'ORGANIZER',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      bio: 'Senior League Operations Director (Organizer 2)',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80'
    }
  });

  // 1.3 16 Players: player1@leagueforge.com through player16@leagueforge.com
  // Gamertags: Gamer_01 to Gamer_16
  const players: any[] = [];
  for (let i = 1; i <= 16; i++) {
    const pad = String(i).padStart(2, '0');
    const gamertag = `Gamer_${pad}`;
    const player = await prisma.user.create({
      data: {
        email: `player${i}@leagueforge.com`,
        username: gamertag,
        passwordHash,
        role: 'PLAYER',
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        bio: `Professional Esports Athlete • Gamertag: ${gamertag}`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=Gamer_${pad}`
      }
    });
    players.push(player);
  }

  console.log(' ✅ Seeded 1 Super Admin, 2 Organizers, and 16 Players (player1 to player16).');

  // =========================================================================
  // 2. 5 OFFICIAL GAMES CATALOG
  // =========================================================================
  console.log('\n🎯 [3/5] Seeding 5 official games catalog...');

  // Game 1: BGMI - Gun Game (format: SQUAD_4V4, genre: Battle Royale)
  const gameGunGame = await prisma.game.create({
    data: {
      title: 'BGMI - Gun Game',
      slug: 'bgmi-gun-game',
      genre: 'Battle Royale',
      platform: 'Mobile',
      coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 4,
      maxTeamSize: 4,
      metadata: JSON.stringify({ defaultFormat: 'SQUAD_4V4', modes: ['Gun Game', 'Arms Race'] }),
      createdById: admin.id
    }
  });

  // Game 2: BGMI - Death Match (format: DUO_2V2, genre: Battle Royale)
  const gameDeathMatch = await prisma.game.create({
    data: {
      title: 'BGMI - Death Match',
      slug: 'bgmi-death-match',
      genre: 'Battle Royale',
      platform: 'Mobile',
      coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 2,
      maxTeamSize: 2,
      metadata: JSON.stringify({ defaultFormat: 'DUO_2V2', modes: ['Team Deathmatch', 'Duo Clash'] }),
      createdById: admin.id
    }
  });

  // Game 3: Dota - 2 (format: SQUAD_5V5, genre: MOBA)
  const gameDota2 = await prisma.game.create({
    data: {
      title: 'Dota - 2',
      slug: 'dota-2',
      genre: 'MOBA',
      platform: 'PC',
      coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 5,
      maxTeamSize: 5,
      metadata: JSON.stringify({ defaultFormat: 'SQUAD_5V5', modes: ['Captains Mode', 'Ranked All Pick'] }),
      createdById: admin.id
    }
  });

  // Game 4: FIFA (format: SOLO, genre: Sports)
  const gameFifa = await prisma.game.create({
    data: {
      title: 'FIFA',
      slug: 'fifa-solo',
      genre: 'Sports',
      platform: 'Console',
      coverImage: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80',
      isTeamBased: false,
      minTeamSize: 1,
      maxTeamSize: 1,
      metadata: JSON.stringify({ defaultFormat: 'SOLO', modes: ['1v1 Competitive', 'Kick-Off'] }),
      createdById: admin.id
    }
  });

  // Game 5: CS-2 (format: SQUAD_5V5, genre: Tactical FPS)
  const gameCs2 = await prisma.game.create({
    data: {
      title: 'CS-2',
      slug: 'cs-2',
      genre: 'Tactical FPS',
      platform: 'PC',
      coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
      isTeamBased: true,
      minTeamSize: 5,
      maxTeamSize: 5,
      metadata: JSON.stringify({ defaultFormat: 'SQUAD_5V5', modes: ['Competitive 5v5', 'Defusal'] }),
      createdById: admin.id
    }
  });

  console.log(' ✅ Seeded 5 official games: BGMI - Gun Game, BGMI - Death Match, Dota - 2, FIFA, CS-2.');

  // =========================================================================
  // 3. 4 FULL TOURNAMENTS & COMPLETE ROSTERS
  // =========================================================================
  console.log('\n🏆 [4/5] Seeding 4 full tournaments with complete rosters and match schedules...');

  // -------------------------------------------------------------------------
  // Tournament 1: Live Tournament (Full - 8/8 Teams, 16/16 Players)
  // Title: BGMI 2v2 Duo Clash: Winter Season
  // Game: BGMI - Death Match | Organizer: Organizer 2
  // Format: Duo (2v2) | Max Slots: 8 Teams
  // Dates: Reg: 2026-10-16 to 2026-10-20, Matches: 2026-10-22 to 2026-10-28 (Status: LIVE / IN_PROGRESS)
  // Roster: 8 teams (Team Alpha .. Team Hotel) with 2 players each (Player 1 to 16)
  // -------------------------------------------------------------------------
  const liveTournament = await prisma.tournament.create({
    data: {
      title: 'BGMI 2v2 Duo Clash: Winter Season',
      slug: 'bgmi-2v2-duo-clash-winter-season',
      description: 'Premier Winter Season Duo Championship. 8 elite duo teams battling in live deathmatch brackets for the $10,000 championship purse.',
      bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$10,000 USD',
      structure: 'SINGLE_ELIMINATION',
      gameId: gameDeathMatch.id,
      organizerId: organizer2.id,
      format: 'DUO',
      status: 'IN_PROGRESS',
      maxParticipants: 8,
      currentCount: 8,
      registrationStartDate: new Date('2026-10-16T00:00:00.000Z'),
      registrationEndDate: new Date('2026-10-20T23:59:59.000Z'),
      startDate: new Date('2026-10-22T09:00:00.000Z'),
      endDate: new Date('2026-10-28T23:59:59.000Z')
    }
  });

  const duoTeamConfigs = [
    { name: 'Team Alpha', tag: 'ALPHA', invite: 'ALPH01', p1Index: 0, p2Index: 1 },
    { name: 'Team Bravo', tag: 'BRAVO', invite: 'BRAV02', p1Index: 2, p2Index: 3 },
    { name: 'Team Charlie', tag: 'CHARL', invite: 'CHAR03', p1Index: 4, p2Index: 5 },
    { name: 'Team Delta', tag: 'DELTA', invite: 'DELT04', p1Index: 6, p2Index: 7 },
    { name: 'Team Echo', tag: 'ECHO', invite: 'ECHO05', p1Index: 8, p2Index: 9 },
    { name: 'Team Foxtrot', tag: 'FOXTR', invite: 'FOXT06', p1Index: 10, p2Index: 11 },
    { name: 'Team Golf', tag: 'GOLF', invite: 'GOLF07', p1Index: 12, p2Index: 13 },
    { name: 'Team Hotel', tag: 'HOTEL', invite: 'HOTE08', p1Index: 14, p2Index: 15 }
  ];

  const liveTeams: any[] = [];
  const liveParticipants: any[] = [];

  for (let i = 0; i < duoTeamConfigs.length; i++) {
    const cfg = duoTeamConfigs[i];
    const captain = players[cfg.p1Index];
    const partner = players[cfg.p2Index];

    const team = await prisma.team.create({
      data: {
        tournamentId: liveTournament.id,
        name: cfg.name,
        tag: cfg.tag,
        inviteCode: cfg.invite,
        captainId: captain.id
      }
    });
    liveTeams.push(team);

    await prisma.teamMember.createMany({
      data: [
        { teamId: team.id, userId: captain.id, role: 'CAPTAIN' },
        { teamId: team.id, userId: partner.id, role: 'STARTER' }
      ]
    });

    const part1 = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: liveTournament.id,
        userId: captain.id,
        teamId: team.id,
        inGameName: captain.username,
        status: 'CHECKED_IN',
        seed: i + 1
      }
    });

    const part2 = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: liveTournament.id,
        userId: partner.id,
        teamId: team.id,
        inGameName: partner.username,
        status: 'CHECKED_IN',
        seed: i + 1
      }
    });

    liveParticipants.push(part1, part2);
  }

  // Create Round 1 Quarterfinals fixtures for the Live tournament
  const liveRound1 = await prisma.matchRound.create({
    data: {
      tournamentId: liveTournament.id,
      roundNumber: 1,
      name: 'Quarterfinals (Best of 3)',
      stage: 'QUARTERFINALS'
    }
  });

  // Seed 4 Quarterfinal matches
  const match1 = await prisma.match.create({
    data: {
      tournamentId: liveTournament.id,
      roundId: liveRound1.id,
      matchNumber: 1,
      status: 'IN_PROGRESS',
      isVerified: false,
      scheduledAt: new Date('2026-10-22T10:00:00.000Z')
    }
  });

  const match2 = await prisma.match.create({
    data: {
      tournamentId: liveTournament.id,
      roundId: liveRound1.id,
      matchNumber: 2,
      status: 'PENDING',
      isVerified: false,
      scheduledAt: new Date('2026-10-22T12:00:00.000Z')
    }
  });

  const match3 = await prisma.match.create({
    data: {
      tournamentId: liveTournament.id,
      roundId: liveRound1.id,
      matchNumber: 3,
      status: 'PENDING',
      isVerified: false,
      scheduledAt: new Date('2026-10-22T14:00:00.000Z')
    }
  });

  const match4 = await prisma.match.create({
    data: {
      tournamentId: liveTournament.id,
      roundId: liveRound1.id,
      matchNumber: 4,
      status: 'PENDING',
      isVerified: false,
      scheduledAt: new Date('2026-10-22T16:00:00.000Z')
    }
  });

  // Seed live scores for Match 1 (Team Alpha vs Team Bravo)
  await prisma.scoreRecord.createMany({
    data: [
      {
        tournamentId: liveTournament.id,
        roundNumber: 1,
        matchId: match1.id,
        participantId: liveParticipants[0].id, // Gamer_01 (Alpha Cap)
        score: 18,
        kills: 11,
        isWinner: false
      },
      {
        tournamentId: liveTournament.id,
        roundNumber: 1,
        matchId: match1.id,
        participantId: liveParticipants[1].id, // Gamer_02 (Alpha Partner)
        score: 12,
        kills: 7,
        isWinner: false
      },
      {
        tournamentId: liveTournament.id,
        roundNumber: 1,
        matchId: match1.id,
        participantId: liveParticipants[2].id, // Gamer_03 (Bravo Cap)
        score: 15,
        kills: 9,
        isWinner: false
      },
      {
        tournamentId: liveTournament.id,
        roundNumber: 1,
        matchId: match1.id,
        participantId: liveParticipants[3].id, // Gamer_04 (Bravo Partner)
        score: 14,
        kills: 8,
        isWinner: false
      }
    ]
  });

  console.log(' ✅ Tournament 1 (LIVE): BGMI 2v2 Duo Clash: Winter Season (8 teams, 16 players, live fixtures & scores).');

  // -------------------------------------------------------------------------
  // Tournament 2: Past Tournament (Full - 4/4 Teams, 16/16 Players)
  // Title: BGMI 4v4 Gun Master Invitational
  // Game: BGMI - Gun Game | Organizer: Organizer 1
  // Format: Squad (4v4) | Max Slots: 4 Teams
  // Dates: Reg: 2026-10-07 to 2026-10-10, Matches: 2026-10-12 to 2026-10-18 (Status: COMPLETED)
  // Roster: 4 squads of 4 players covering all 16 players (Player 1 to 16)
  // -------------------------------------------------------------------------
  const pastTournament = await prisma.tournament.create({
    data: {
      title: 'BGMI 4v4 Gun Master Invitational',
      slug: 'bgmi-4v4-gun-master-invitational',
      description: 'Concluded flagship 4v4 Squad Invitational. 4 elite squads fought through elimination brackets to determine the true Gun Master champions.',
      bannerImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$15,000 USD',
      structure: 'SINGLE_ELIMINATION',
      gameId: gameGunGame.id,
      organizerId: organizer1.id,
      format: 'SQUAD',
      status: 'COMPLETED',
      maxParticipants: 4,
      currentCount: 4,
      registrationStartDate: new Date('2026-10-07T00:00:00.000Z'),
      registrationEndDate: new Date('2026-10-10T23:59:59.000Z'),
      startDate: new Date('2026-10-12T09:00:00.000Z'),
      endDate: new Date('2026-10-18T23:59:59.000Z')
    }
  });

  const squadConfigs = [
    { name: 'Apex Predators', tag: 'APEX', invite: 'APEX01', playerIndices: [0, 1, 2, 3] },
    { name: 'Vortex Legion', tag: 'VRTX', invite: 'VRTX02', playerIndices: [4, 5, 6, 7] },
    { name: 'Titan Force', tag: 'TTAN', invite: 'TTAN03', playerIndices: [8, 9, 10, 11] },
    { name: 'Shadow Syndicate', tag: 'SHDW', invite: 'SHDW04', playerIndices: [12, 13, 14, 15] }
  ];

  const pastParticipants: any[] = [];

  for (let i = 0; i < squadConfigs.length; i++) {
    const cfg = squadConfigs[i];
    const captain = players[cfg.playerIndices[0]];
    const squadPlayers = cfg.playerIndices.map((idx) => players[idx]);

    const team = await prisma.team.create({
      data: {
        tournamentId: pastTournament.id,
        name: cfg.name,
        tag: cfg.tag,
        inviteCode: cfg.invite,
        captainId: captain.id
      }
    });

    const memberRows = squadPlayers.map((p, idx) => ({
      teamId: team.id,
      userId: p.id,
      role: idx === 0 ? 'CAPTAIN' : 'STARTER'
    }));

    await prisma.teamMember.createMany({ data: memberRows });

    for (let pIdx = 0; pIdx < squadPlayers.length; pIdx++) {
      const p = squadPlayers[pIdx];
      const part = await prisma.tournamentParticipant.create({
        data: {
          tournamentId: pastTournament.id,
          userId: p.id,
          teamId: team.id,
          inGameName: p.username,
          status: 'CHECKED_IN',
          seed: i + 1
        }
      });
      pastParticipants.push(part);
    }
  }

  // Completed tournament rounds & matches
  const pastSemifinals = await prisma.matchRound.create({
    data: {
      tournamentId: pastTournament.id,
      roundNumber: 1,
      name: 'Semifinals',
      stage: 'SEMIFINALS'
    }
  });

  const pastFinals = await prisma.matchRound.create({
    data: {
      tournamentId: pastTournament.id,
      roundNumber: 2,
      name: 'Grand Championship Finals',
      stage: 'FINALS'
    }
  });

  // Semifinal Match 1: Apex Predators vs Vortex Legion
  const semiMatch1 = await prisma.match.create({
    data: {
      tournamentId: pastTournament.id,
      roundId: pastSemifinals.id,
      matchNumber: 1,
      status: 'COMPLETED',
      isVerified: true,
      verifiedById: organizer1.id,
      verifiedAt: new Date('2026-10-14T15:00:00.000Z'),
      verificationNotes: 'Official scores verified. Apex Predators won 2-1 against Vortex Legion.',
      scheduledAt: new Date('2026-10-14T12:00:00.000Z'),
      completedAt: new Date('2026-10-14T14:30:00.000Z')
    }
  });

  // Semifinal Match 2: Titan Force vs Shadow Syndicate
  const semiMatch2 = await prisma.match.create({
    data: {
      tournamentId: pastTournament.id,
      roundId: pastSemifinals.id,
      matchNumber: 2,
      status: 'COMPLETED',
      isVerified: true,
      verifiedById: organizer1.id,
      verifiedAt: new Date('2026-10-14T19:00:00.000Z'),
      verificationNotes: 'Official scores verified. Titan Force advanced 2-0.',
      scheduledAt: new Date('2026-10-14T16:00:00.000Z'),
      completedAt: new Date('2026-10-14T18:30:00.000Z')
    }
  });

  // Grand Finals: Apex Predators vs Titan Force -> Apex Predators Champions!
  const finalMatch = await prisma.match.create({
    data: {
      tournamentId: pastTournament.id,
      roundId: pastFinals.id,
      matchNumber: 3,
      status: 'COMPLETED',
      isVerified: true,
      verifiedById: organizer1.id,
      verifiedAt: new Date('2026-10-18T20:00:00.000Z'),
      verificationNotes: 'Grand Finals victory verified. Apex Predators crowned Gun Master Champions 2026!',
      scheduledAt: new Date('2026-10-18T16:00:00.000Z'),
      completedAt: new Date('2026-10-18T19:45:00.000Z')
    }
  });

  // Seed final score records (Apex Squad: pastParticipants 0..3)
  for (let i = 0; i < 4; i++) {
    await prisma.scoreRecord.create({
      data: {
        tournamentId: pastTournament.id,
        roundNumber: 2,
        matchId: finalMatch.id,
        participantId: pastParticipants[i].id,
        score: 30 + (4 - i) * 5,
        kills: 14 - i,
        placement: 1,
        isWinner: true
      }
    });
  }

  // Titan Squad runners-up: pastParticipants 8..11
  for (let i = 8; i < 12; i++) {
    await prisma.scoreRecord.create({
      data: {
        tournamentId: pastTournament.id,
        roundNumber: 2,
        matchId: finalMatch.id,
        participantId: pastParticipants[i].id,
        score: 22 - (i - 8) * 3,
        kills: 8 - (i - 8),
        placement: 2,
        isWinner: false
      }
    });
  }

  console.log(' ✅ Tournament 2 (PAST): BGMI 4v4 Gun Master Invitational (4 squads, 16 players, completed championship fixtures & verified scores).');

  // -------------------------------------------------------------------------
  // Tournament 3: Registration Closed / Upcoming 1 (Full - 4/4 Teams, 8/8 Players)
  // Title: BGMI 2v2 Blitz Cup
  // Game: BGMI - Death Match | Organizer: Organizer 2
  // Format: Duo (2v2) | Max Slots: 4 Teams
  // Dates: Reg: 2026-10-17 to 2026-10-20, Matches: 2026-10-26 to 2026-10-30 (Status: UPCOMING)
  // Roster: 4 teams of 2 players using Player 1 to Player 8
  // -------------------------------------------------------------------------
  const upcomingDuoTournament = await prisma.tournament.create({
    data: {
      title: 'BGMI 2v2 Blitz Cup',
      slug: 'bgmi-2v2-blitz-cup',
      description: 'Rapid 2v2 Blitz Cup tournament. Registration is fully closed and locked at 4/4 teams. Kickoff begins October 26th.',
      bannerImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$5,000 USD',
      structure: 'SINGLE_ELIMINATION',
      gameId: gameDeathMatch.id,
      organizerId: organizer2.id,
      format: 'DUO',
      status: 'UPCOMING',
      maxParticipants: 4,
      currentCount: 4,
      registrationStartDate: new Date('2026-10-17T00:00:00.000Z'),
      registrationEndDate: new Date('2026-10-20T23:59:59.000Z'),
      startDate: new Date('2026-10-26T09:00:00.000Z'),
      endDate: new Date('2026-10-30T23:59:59.000Z')
    }
  });

  const blitzConfigs = [
    { name: 'Cyber Phantoms', tag: 'CYBR', invite: 'CYBR01', p1: 0, p2: 1 },
    { name: 'Ghost Recon', tag: 'GHST', invite: 'GHST02', p1: 2, p2: 3 },
    { name: 'Neon Knights', tag: 'NEON', invite: 'NEON03', p1: 4, p2: 5 },
    { name: 'Solar Flares', tag: 'SOLR', invite: 'SOLR04', p1: 6, p2: 7 }
  ];

  for (let i = 0; i < blitzConfigs.length; i++) {
    const cfg = blitzConfigs[i];
    const cap = players[cfg.p1];
    const partner = players[cfg.p2];

    const team = await prisma.team.create({
      data: {
        tournamentId: upcomingDuoTournament.id,
        name: cfg.name,
        tag: cfg.tag,
        inviteCode: cfg.invite,
        captainId: cap.id
      }
    });

    await prisma.teamMember.createMany({
      data: [
        { teamId: team.id, userId: cap.id, role: 'CAPTAIN' },
        { teamId: team.id, userId: partner.id, role: 'STARTER' }
      ]
    });

    await prisma.tournamentParticipant.create({
      data: {
        tournamentId: upcomingDuoTournament.id,
        userId: cap.id,
        teamId: team.id,
        inGameName: cap.username,
        status: 'CHECKED_IN',
        seed: i + 1
      }
    });

    await prisma.tournamentParticipant.create({
      data: {
        tournamentId: upcomingDuoTournament.id,
        userId: partner.id,
        teamId: team.id,
        inGameName: partner.username,
        status: 'CHECKED_IN',
        seed: i + 1
      }
    });
  }

  console.log(' ✅ Tournament 3 (UPCOMING 1): BGMI 2v2 Blitz Cup (4 teams, 8 players: Player 1 to Player 8).');

  // -------------------------------------------------------------------------
  // Tournament 4: Registration Closed / Upcoming 2 (Full - 8/8 Players)
  // Title: FIFA 2026 Solo Masters
  // Game: FIFA | Organizer: Organizer 1
  // Format: Solo (1v1) | Max Slots: 8 Participants
  // Dates: Reg: 2026-10-15 to 2026-10-17, Matches: 2026-10-24 to 2026-10-26 (Status: UPCOMING)
  // Roster: 8 solo participants using Player 1 to Player 8 (NO Team records!)
  // -------------------------------------------------------------------------
  const upcomingSoloTournament = await prisma.tournament.create({
    data: {
      title: 'FIFA 2026 Solo Masters',
      slug: 'fifa-2026-solo-masters',
      description: 'Premier 1v1 console soccer masters tournament. Registration closed at 8/8 capacity. Direct individual seed bracket starting October 24th.',
      bannerImage: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$7,500 USD',
      structure: 'SINGLE_ELIMINATION',
      gameId: gameFifa.id,
      organizerId: organizer1.id,
      format: 'SOLO',
      status: 'UPCOMING',
      maxParticipants: 8,
      currentCount: 8,
      registrationStartDate: new Date('2026-10-15T00:00:00.000Z'),
      registrationEndDate: new Date('2026-10-17T23:59:59.000Z'),
      startDate: new Date('2026-10-24T09:00:00.000Z'),
      endDate: new Date('2026-10-26T23:59:59.000Z')
    }
  });

  // Seed 8 solo participants directly with teamId: null
  for (let i = 0; i < 8; i++) {
    const player = players[i];
    await prisma.tournamentParticipant.create({
      data: {
        tournamentId: upcomingSoloTournament.id,
        userId: player.id,
        teamId: null, // Strictly null for SOLO tournaments
        inGameName: player.username,
        status: 'CHECKED_IN',
        seed: i + 1
      }
    });
  }

  console.log(' ✅ Tournament 4 (UPCOMING 2): FIFA 2026 Solo Masters (8 solo participants, Player 1 to Player 8, NO teams).');

  // =========================================================================
  // 4. SEED SAMPLE NOTIFICATIONS & AUDIT TRAIL
  // =========================================================================
  console.log('\n🔔 [5/5] Seeding notifications and audit logs...');
  await prisma.notification.createMany({
    data: [
      {
        userId: players[0].id, // player1@leagueforge.com
        title: 'Winter Season Match Live',
        message: 'Your Duo match in "BGMI 2v2 Duo Clash: Winter Season" is currently LIVE! Join your match lobby.',
        type: 'SYSTEM',
        link: `/tournaments/${liveTournament.id}`,
        isRead: false
      },
      {
        userId: players[0].id,
        title: 'Gun Master Championship Result',
        message: 'Congratulations! Apex Predators achieved 1st Place in BGMI 4v4 Gun Master Invitational.',
        type: 'SYSTEM',
        link: `/tournaments/${pastTournament.id}`,
        isRead: true
      },
      {
        userId: players[0].id,
        title: 'Blitz Cup Bracket Locked',
        message: 'Roster confirmed for BGMI 2v2 Blitz Cup. Matches kick off on October 26th.',
        type: 'SYSTEM',
        link: `/tournaments/${upcomingDuoTournament.id}`,
        isRead: false
      },
      {
        userId: players[0].id,
        title: 'Solo Masters Seed Assigned',
        message: 'You have been seeded into Seed #1 for FIFA 2026 Solo Masters.',
        type: 'SYSTEM',
        link: `/tournaments/${upcomingSoloTournament.id}`,
        isRead: false
      },
      {
        userId: organizer2.id,
        title: 'Live Bracket In Progress',
        message: 'BGMI 2v2 Duo Clash: Winter Season is actively running with 8 participating duo teams.',
        type: 'SYSTEM',
        link: `/organizer/tournaments`,
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
        targetId: gameGunGame.id,
        ipAddress: '127.0.0.1',
        details: JSON.stringify({ message: 'Catalog standardized to 5 verified LeagueForge titles.' })
      },
      {
        actorId: organizer2.id,
        action: 'TOURNAMENT_KICKOFF',
        targetEntity: 'TOURNAMENT',
        targetId: liveTournament.id,
        ipAddress: '127.0.0.1',
        details: JSON.stringify({ format: 'DUO', status: 'IN_PROGRESS', teams: 8 })
      },
      {
        actorId: organizer1.id,
        action: 'TOURNAMENT_CONCLUDE',
        targetEntity: 'TOURNAMENT',
        targetId: pastTournament.id,
        ipAddress: '127.0.0.1',
        details: JSON.stringify({ format: 'SQUAD', status: 'COMPLETED', champions: 'Apex Predators' })
      }
    ]
  });

  console.log('\n=============================================================');
  console.log('🎉 [LeagueForge ETMS Seeder] Complete Production Dataset Seeded!');
  console.log('=============================================================');
  console.log('🔑 Accounts:');
  console.log(' - Super Admin:  admin@leagueforge.com       / Password123! (Role: ADMIN)');
  console.log(' - Organizer 1:  organizer1@leagueforge.com   / Password123! (Role: ORGANIZER)');
  console.log(' - Organizer 2:  organizer2@leagueforge.com   / Password123! (Role: ORGANIZER)');
  console.log(' - 16 Players:   player1@leagueforge.com to player16@leagueforge.com / Password123!');
  console.log('                 Gamertags: Gamer_01 to Gamer_16 (Role: PLAYER)');
  console.log('🎮 5 Official Games:');
  console.log(' - 1. BGMI - Gun Game      (slug: bgmi-gun-game, SQUAD_4V4, Battle Royale)');
  console.log(' - 2. BGMI - Death Match   (slug: bgmi-death-match, DUO_2V2, Battle Royale)');
  console.log(' - 3. Dota - 2             (slug: dota-2, SQUAD_5V5, MOBA)');
  console.log(' - 4. FIFA                 (slug: fifa-solo, SOLO, Sports)');
  console.log(' - 5. CS-2                 (slug: cs-2, SQUAD_5V5, Tactical FPS)');
  console.log('🏆 4 Tournaments:');
  console.log(' - 1. BGMI 2v2 Duo Clash: Winter Season (LIVE, 8/8 Teams, 16/16 Players, Matches & Scores)');
  console.log(' - 2. BGMI 4v4 Gun Master Invitational  (COMPLETED, 4/4 Teams, 16/16 Players, Verified Finals)');
  console.log(' - 3. BGMI 2v2 Blitz Cup                (UPCOMING, 4/4 Teams, 8/8 Players: P1 to P8)');
  console.log(' - 4. FIFA 2026 Solo Masters            (UPCOMING, 8/8 Solo Participants: P1 to P8, NO Teams)');
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
