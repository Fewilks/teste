import { 
  collection, 
  doc, 
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
import { Member, CardItem, LoanRecord, MatchRecord, DeckRecord } from '../types';
import { db, auth } from './firebase-config';
export { db, auth };


// Collection references
export const membersCol = collection(db, 'members');
export const collectionCol = collection(db, 'collection');
export const loansCol = collection(db, 'loans');
export const matchesCol = collection(db, 'matches');
export const decksCol = collection(db, 'decks');
export const trainerLogsCol = collection(db, 'trainer_logs');

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

    // 2. Collection Seeding (Card sharing pool)
    const defaultCards: CardItem[] = [
      {
        id: 'sv3-125',
        name: 'Charizard ex',
        imageUrl: 'https://images.pokemontcg.io/sv3/125.png',
        setCode: 'sv3',
        setName: 'Obsidian Flames',
        setNumber: '125',
        quantity: 4,
        ownerId: 'member-1',
        ownerName: 'Guilherme Silva',
        isLendable: true,
        lentToUserId: null,
        lentToUserName: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sv4-163',
        name: 'Roaring Moon ex',
        imageUrl: 'https://images.pokemontcg.io/sv4/163.png',
        setCode: 'sv4',
        setName: 'Paradox Rift',
        setNumber: '163',
        quantity: 3,
        ownerId: 'member-2',
        ownerName: 'Thiago Pereira',
        isLendable: true,
        lentToUserId: 'member-4',
        lentToUserName: 'Matheus Santos',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sv1-86',
        name: 'Gardevoir ex',
        imageUrl: 'https://images.pokemontcg.io/sv1/86.png',
        setCode: 'sv1',
        setName: 'Scarlet & Violet Base Set',
        setNumber: '86',
        quantity: 4,
        ownerId: 'member-3',
        ownerName: 'Lucas Souza',
        isLendable: true,
        lentToUserId: null,
        lentToUserName: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sv3-135',
        name: 'Pidgeot ex',
        imageUrl: 'https://images.pokemontcg.io/sv3/135.png',
        setCode: 'sv3',
        setName: 'Obsidian Flames',
        setNumber: '135',
        quantity: 2,
        ownerId: 'member-1',
        ownerName: 'Guilherme Silva',
        isLendable: true,
        lentToUserId: null,
        lentToUserName: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'pgo-55',
        name: 'Snorlax',
        imageUrl: 'https://images.pokemontcg.io/pgo/55.png',
        setCode: 'pgo',
        setName: 'Pokémon GO',
        setNumber: '55',
        quantity: 4,
        ownerId: 'member-4',
        ownerName: 'Matheus Santos',
        isLendable: false,
        lentToUserId: null,
        lentToUserName: null,
        createdAt: new Date().toISOString()
      }
    ];

    for (const c of defaultCards) {
      await setDoc(doc(db, 'collection', c.id), c);
    }

    // 3. Loans Seeding
    const defaultLoans: LoanRecord[] = [
      {
        id: 'loan-1',
        cardId: 'sv4-163',
        cardName: 'Roaring Moon ex',
        cardImageUrl: 'https://images.pokemontcg.io/sv4/163.png',
        ownerId: 'member-2',
        ownerName: 'Thiago Pereira',
        borrowerId: 'member-4',
        borrowerName: 'Matheus Santos',
        quantity: 2,
        status: 'active',
        requestedAt: '2026-06-15T10:00:00Z',
        loanedAt: '2026-06-15T14:30:00Z'
      },
      {
        id: 'loan-2',
        cardId: 'sv3-135',
        cardName: 'Pidgeot ex',
        cardImageUrl: 'https://images.pokemontcg.io/sv3/135.png',
        ownerId: 'member-1',
        ownerName: 'Guilherme Silva',
        borrowerId: 'member-3',
        borrowerName: 'Lucas Souza',
        quantity: 1,
        status: 'pending',
        requestedAt: '2026-06-23T18:00:00Z'
      }
    ];

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

