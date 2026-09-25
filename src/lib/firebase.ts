import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { Member, CardItem, LoanRecord, MatchRecord, DeckRecord, Tournament, ChampionshipPointRecord, MonthlyGoals } from '../types';
import { db, auth } from './firebase-config';
export { db, auth };


// Collection references
export const membersCol = collection(db, 'members');
export const collectionCol = collection(db, 'collection');
export const loansCol = collection(db, 'loans');
export const matchesCol = collection(db, 'matches');
export const decksCol = collection(db, 'decks');
export const trainerLogsCol = collection(db, 'trainer_logs');
export const tournamentsCol = collection(db, 'tournaments');
export const championshipPointsCol = collection(db, 'championship_points');
export const monthlyGoalsCol = collection(db, 'monthly_goals');

// Limpeza segura de dados de teste antigos, mantendo todos os campeonatos 100% manuais
export async function seedTournamentsIfEmpty(_force?: boolean) {
  try {
    const snap = await getDocs(tournamentsCol);
    for (const d of snap.docs) {
      if (d.data().createdById === 'system') {
        await deleteDoc(doc(db, 'tournaments', d.id));
      }
    }
  } catch (error) {
    console.error('Error in seedTournamentsIfEmpty:', error);
  }
}

// Seed default data if database is empty
export async function seedDatabaseIfEmpty() {
  try {
    const snapshot = await getDocs(query(membersCol, limit(1)));
    if (!snapshot.empty) {
      console.log('Database already seeded');
      return;
    }

    console.log('Seeding initial data to Firestore...');

    // 1. Members Seeding
    const defaultMembers: Member[] = [
      {
        id: 'member-felipe',
        name: 'Felipe Wilks',
        role: 'Premium ball',
        nickname: 'felipewilks',
        avatarSprite: 'gengar-gmax',
        wins: 0,
        losses: 0,
        draws: 0,
        favoriteCard: 'Charizard ex',
        favoriteCardImage: 'https://images.pokemontcg.io/sv3/125_hires.png',
        joinDate: '2025-01-10'
      }
    ];

    for (const m of defaultMembers) {
      await setDoc(doc(db, 'members', m.id), m);
    }

    // 2. Collection Seeding (Starts 100% clean/empty as requested)
    // No default cards seeded; users register their own authentic collection

    // 3. Loans Seeding (Empty list to start clean for production)
    const defaultLoans: LoanRecord[] = [];

    for (const l of defaultLoans) {
      await setDoc(doc(db, 'loans', l.id), l);
    }

    // 4. Matches Seeding (Empty list to start clean)
    const defaultMatches: MatchRecord[] = [];

    for (const m of defaultMatches) {
      await setDoc(doc(db, 'matches', m.id), m);
    }

    // 5. Decks Seeding
    const defaultDecks: DeckRecord[] = [
      {
        id: 'deck-1',
        userId: 'member-1',
        userName: 'Guilherme Silva',
        deckName: 'Zard ex Competitivo',
        archetype: 'Charizard ex',
        rawList: `Pokémon: 6
3 Charizard ex OBF 125
2 Charmeleon OBF 124
3 Charmander OBF 26
2 Pidgeot ex OBF 225
2 Pidgey OBF 207
1 Lumineon V BRS 40

Treinador: 10
4 Iono PAF 80
4 Arven SVI 166
2 Boss's Orders PAL 172
4 Ultra Ball SVI 196
4 Rare Candy SVI 191
2 Super Rod PAL 188
2 Buddy-Buddy Poffin TEF 144
1 Counter Catcher PAR 160
1 Prime Catcher TEF 157
2 Forest Seal Stone SIT 156

Energia: 1
6 Basic Fire Energy SVE 2`,
        parsedCards: [
          { name: 'Charizard ex', count: 3, set: 'OBF', number: '125', type: 'Pokémon', imageUrl: 'https://images.pokemontcg.io/sv3/125.png' },
          { name: 'Charmeleon', count: 2, set: 'OBF', number: '124', type: 'Pokémon', imageUrl: 'https://images.pokemontcg.io/sv3/124.png' },
          { name: 'Charmander', count: 3, set: 'OBF', number: '26', type: 'Pokémon', imageUrl: 'https://images.pokemontcg.io/sv3/26.png' },
          { name: 'Pidgeot ex', count: 2, set: 'OBF', number: '225', type: 'Pokémon', imageUrl: 'https://images.pokemontcg.io/sv3/225.png' },
          { name: 'Pidgey', count: 2, set: 'OBF', number: '207', type: 'Pokémon', imageUrl: 'https://images.pokemontcg.io/sv3/207.png' },
          { name: 'Lumineon V', count: 1, set: 'BRS', number: '40', type: 'Pokémon', imageUrl: 'https://images.pokemontcg.io/swsh9/40.png' },
          { name: 'Iono', count: 4, set: 'PAF', number: '80', type: 'Treinador', imageUrl: 'https://images.pokemontcg.io/sv45/80.png' },
          { name: 'Arven', count: 4, set: 'SVI', number: '166', type: 'Treinador', imageUrl: 'https://images.pokemontcg.io/sv1/166.png' },
          { name: 'Prime Catcher', count: 1, set: 'TEF', number: '157', type: 'Treinador', imageUrl: 'https://images.pokemontcg.io/sv5/157.png' },
          { name: 'Basic Fire Energy', count: 6, set: 'SVE', number: '2', type: 'Energia', imageUrl: 'https://images.pokemontcg.io/sve/2.png' }
        ],
        createdAt: '2026-06-20T11:00:00Z'
      }
    ];

    for (const d of defaultDecks) {
      await setDoc(doc(db, 'decks', d.id), d);
    }

    console.log('Firestore Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    handleFirestoreError(error, OperationType.WRITE, 'seed');
  }
}

// Purge all user and test data (matches, collection, tournaments, loans, trainer logs, CP), preserving ONLY decks and member profiles
export async function purgeAllDataExceptDecks(): Promise<{
  deletedMatches: number;
  deletedTournaments: number;
  deletedLoans: number;
  deletedLogs: number;
  deletedCollection: number;
  deletedCP: number;
}> {
  let deletedMatches = 0;
  let deletedTournaments = 0;
  let deletedLoans = 0;
  let deletedLogs = 0;
  let deletedCollection = 0;
  let deletedCP = 0;

  try {
    // 1. Matches (Partidas - zerar tudo)
    const matchesSnap = await getDocs(matchesCol);
    for (const d of matchesSnap.docs) {
      await deleteDoc(doc(db, 'matches', d.id));
      deletedMatches++;
    }

    // 2. Collection (Coleção de cartas compartilhadas - zerar tudo conforme solicitado pelo usuário)
    const collectionSnap = await getDocs(collectionCol);
    for (const d of collectionSnap.docs) {
      await deleteDoc(doc(db, 'collection', d.id));
      deletedCollection++;
    }

    // 3. Tournaments (Campeonatos - zerar tudo)
    const tournamentsSnap = await getDocs(tournamentsCol);
    for (const d of tournamentsSnap.docs) {
      await deleteDoc(doc(db, 'tournaments', d.id));
      deletedTournaments++;
    }

    // 4. Loans (Empréstimos - zerar tudo)
    const loansSnap = await getDocs(loansCol);
    for (const d of loansSnap.docs) {
      await deleteDoc(doc(db, 'loans', d.id));
      deletedLoans++;
    }

    // 5. Trainer Logs (Replays/Logs do PTCGL - zerar tudo)
    const logsSnap = await getDocs(trainerLogsCol);
    for (const d of logsSnap.docs) {
      await deleteDoc(doc(db, 'trainer_logs', d.id));
      deletedLogs++;
    }

    // Limpar cache local de replays
    if (typeof window !== 'undefined' && window.localStorage) {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('trainer_logs_') || k.startsWith('trainer_log_'))) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }

    // 6. Championship Points (Zerar registros de CP)
    const cpSnap = await getDocs(championshipPointsCol);
    for (const d of cpSnap.docs) {
      await deleteDoc(doc(db, 'championship_points', d.id));
      deletedCP++;
    }

    // 7. Reset member stats to 0 while keeping profiles, custom avatars, roles, favorite cards, and nicknames intact
    const membersSnap = await getDocs(membersCol);
    for (const d of membersSnap.docs) {
      await updateDoc(doc(db, 'members', d.id), {
        wins: 0,
        losses: 0,
        draws: 0,
        officialPoints: 0
      });
    }

    console.log(`[Spirits Cleanup] Purge complete: ${deletedMatches} matches, ${deletedCollection} collection cards, ${deletedTournaments} tournaments, ${deletedLoans} loans, ${deletedLogs} logs, ${deletedCP} CP cleared. DECKS PRESERVED.`);
  } catch (err) {
    console.error('[Spirits Cleanup] Error during purge:', err);
  }

  return { deletedMatches, deletedTournaments, deletedLoans, deletedLogs, deletedCollection, deletedCP };
}

export const purgeTestDataKeepCore = purgeAllDataExceptDecks;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- CHAMPIONSHIP POINTS & MONTHLY GOALS HELPERS ---

export async function addChampionshipPoints(data: Omit<ChampionshipPointRecord, 'id' | 'createdAt'>): Promise<string> {
  const newDocRef = doc(championshipPointsCol);
  const record: ChampionshipPointRecord = {
    ...data,
    id: newDocRef.id,
    createdAt: new Date().toISOString()
  };
  await setDoc(newDocRef, record);

  // Update member total points in member document
  try {
    const memRef = doc(db, 'members', data.memberId);
    const memSnap = await getDoc(memRef);
    if (memSnap.exists()) {
      const currentPts = memSnap.data().officialPoints || 0;
      await updateDoc(memRef, {
        officialPoints: currentPts + data.points
      });
    }
  } catch (err) {
    console.error('Error updating member official points:', err);
  }

  return newDocRef.id;
}

export async function deleteChampionshipPointRecord(id: string, memberId: string, points: number): Promise<void> {
  await deleteDoc(doc(db, 'championship_points', id));
  try {
    const memRef = doc(db, 'members', memberId);
    const memSnap = await getDoc(memRef);
    if (memSnap.exists()) {
      const currentPts = memSnap.data().officialPoints || 0;
      await updateDoc(memRef, {
        officialPoints: Math.max(0, currentPts - points)
      });
    }
  } catch (err) {
    console.error('Error updating member points after deletion:', err);
  }
}

export async function ensureInitialChampionshipData(): Promise<void> {
  try {
    // 1. Ensure Felipe Sausanavicius exists with Master Ball rank and 50 official points
    const memSnap = await getDocs(membersCol);
    const sausanavicius = memSnap.docs.find(d => {
      const data = d.data();
      return (data.name && data.name.toLowerCase().includes('sausanavicius')) || 
             (data.nickname && data.nickname.toLowerCase().includes('sausanavicius'));
    });

    let sausanaviciusId = sausanavicius ? sausanavicius.id : 'member-felipe-sausanavicius';

    if (!sausanavicius) {
      const newMember: Member = {
        id: sausanaviciusId,
        name: 'Felipe Sausanavicius',
        role: 'masterball',
        nickname: 'Sausanavicius',
        avatarSprite: 'charizard',
        wins: 0,
        losses: 0,
        draws: 0,
        officialPoints: 50,
        favoriteCard: 'Charizard ex',
        favoriteCardImage: 'https://images.pokemontcg.io/sv3/125.png',
        joinDate: '2025-02-15'
      };
      await setDoc(doc(db, 'members', sausanaviciusId), newMember);
    } else {
      const currentPts = sausanavicius.data().officialPoints;
      if (currentPts === undefined) {
        await updateDoc(doc(db, 'members', sausanavicius.id), {
          officialPoints: 0
        });
      }
    }

    // 2. Ensure Monthly Goals exist for the current month
    const goalsSnap = await getDocs(monthlyGoalsCol);
    if (goalsSnap.empty) {
      const defaultGoals: MonthlyGoals = {
        id: 'current-goals',
        monthYear: '2026-09',
        targetTournaments: 6,
        targetMatches: 30,
        targetWinRate: 60,
        targetOfficialPoints: 100,
        notes: 'Foco da equipe Spirits para o mês: disputar Copas e Desafios de Liga para acumular CP e garantir vagas oficiais!',
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'monthly_goals', defaultGoals.id), defaultGoals);
    }
  } catch (err) {
    console.error('Error ensuring initial championship data:', err);
  }
}

export async function saveMonthlyGoals(goals: MonthlyGoals): Promise<void> {
  await setDoc(doc(db, 'monthly_goals', goals.id || 'current-goals'), {
    ...goals,
    updatedAt: new Date().toISOString()
  });
}


