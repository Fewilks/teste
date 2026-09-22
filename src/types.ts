export interface Member {
  id: string;
  name: string;
  role: 'pokeball' | 'greatball' | 'ultraball' | 'masterball' | 'Premium ball';
  nickname?: string;
  avatarSprite: string; // e.g. "pikachu", "charizard"
  wins: number;
  losses: number;
  draws: number;
  favoriteCard?: string;
  favoriteCardImage?: string;
  joinDate: string;
}

export interface CardItem {
  id: string; // set-number e.g. "obf-125"
  name: string;
  imageUrl: string;
  setCode: string;
  setName: string;
  setNumber: string;
  quantity: number;
  ownerId: string;
  ownerName: string;
  isLendable: boolean;
  lentToUserId?: string | null;
  lentToUserName?: string | null;
  pendingRequestUserId?: string | null;
  pendingRequestUserName?: string | null;
  createdAt: string;
}

export interface LoanRecord {
  id: string;
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  ownerId: string;
  ownerName: string;
  borrowerId: string;
  borrowerName: string;
  quantity: number;
  status: 'pending' | 'active' | 'returned' | 'declined';
  requestedAt: string;
  loanedAt?: string;
  returnedAt?: string;
}

export interface MatchRecord {
  id: string;
  player1Id: string; // Spirits Member ID
  player1Name: string;
  player1Sprite: string;
  player2Name: string; // Can be anyone (Spirits member or rival)
  player2IsMember: boolean;
  player2Id?: string;
  deckName: string;
  deckArchetype: string;
  opponentDeck: string;
  format: 'MD1' | 'MD3' | 'MD5';
  result: 'win' | 'loss' | 'draw';
  score: string; // e.g. "2-1", "1-0"
  playedAt: string;
  notes?: string;
}

export interface ParsedDeckCard {
  name: string;
  count: number;
  set?: string;
  number?: string;
  type: 'Pokémon' | 'Treinador' | 'Energia';
  imageUrl?: string;
}

export interface DeckRecord {
  id: string;
  userId: string;
  userName: string;
  deckName: string;
  archetype: string;
  pokemon1?: string;
  pokemon2?: string;
  rawList: string;
  parsedCards: ParsedDeckCard[];
  createdAt: string;
}

export interface MetaDeck {
  name: string;
  archetype: string;
  share: number; // meta percentage
  winRate: number;
  imageUrl: string;
  cards: { name: string; count: number }[];
  description: string;
  updatedAt?: string;
  rawList?: string;
  pokemon1?: string;
  pokemon2?: string;
  sprites?: string[];
}

export interface BattleTurnAction {
  id: string;
  type: 'draw' | 'play' | 'supporter' | 'item' | 'stadium' | 'ability' | 'energy' | 'retreat' | 'attack' | 'prize' | 'knockout' | 'other';
  player: 'player1' | 'player2';
  playerName: string;
  cardName?: string;
  description: string;
  damage?: number;
  prizesTaken?: number;
}

export interface BattleTurnSnapshot {
  turnNumber: number; // 0 for setup, 1, 2, 3...
  turnTitle: string; // e.g. "Turno # 1 - Turno de k6p"
  player: 'player1' | 'player2';
  playerName: string;
  actions: BattleTurnAction[];
  p1Active?: string;
  p1Bench: string[];
  p1PrizesRemaining: number;
  p2Active?: string;
  p2Bench: string[];
  p2PrizesRemaining: number;
  stadiumInPlay?: string;
  p1ActiveDamage?: number;
  p2ActiveDamage?: number;
  p1ActiveEnergies?: string[];
  p2ActiveEnergies?: string[];
  isGameOver?: boolean;
  winner?: 'player1' | 'player2';
  gameEndReason?: string;
  evolvedCards?: string[];
  p1KnockedOutThisTurn?: string;
  p2KnockedOutThisTurn?: string;
  evolutions?: {
    player: 'player1' | 'player2';
    fromCard: string;
    toCard: string;
    isSpotActive: boolean;
    benchIndex?: number;
  }[];
}

export interface TrainerLogMatch {
  id: string;
  userId: string;
  player1Name: string;
  player2Name: string;
  playerDeckArchetype: string;
  opponentDeckArchetype: string;
  playerDeckName?: string;
  result: 'win' | 'loss' | 'draw';
  wentFirst: boolean;
  totalTurns: number;
  p1PrizesTaken: number;
  p2PrizesTaken: number;
  finalScore?: string;
  format: string; // 'Standard' | 'Expanded'
  date: string;
  rawLog: string;
  turns: BattleTurnSnapshot[];
  notes?: string;
  syncedToMatches?: boolean;
}
