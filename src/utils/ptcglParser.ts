import { BattleTurnAction, BattleTurnSnapshot, TrainerLogMatch } from '../types';

// ============================================================================
// ARCHETYPE DETECTION
// ============================================================================

export interface ArchetypeDefinition {
  name: string;
  keywords: string[];
  sprites: [string, string];
}

export const KNOWN_ARCHETYPES: ArchetypeDefinition[] = [
  { name: 'Charizard ex', keywords: ['charizard ex', 'charmander', 'charmeleon', 'pidgeot ex', 'dusknoir', 'dusclops', 'duskull'], sprites: ['charizard', 'pidgeot'] },
  { name: 'Dragapult ex', keywords: ['dragapult ex', 'drakloak', 'dreepy'], sprites: ['dragapult', 'pidgeot'] },
  { name: 'Lugia VSTAR', keywords: ['lugia vstar', 'lugia v', 'archeops', 'cinccino', 'minccino'], sprites: ['lugia', 'archeops'] },
  { name: 'Gardevoir ex', keywords: ['gardevoir ex', 'kirlia', 'ralts', 'scream tail', 'drifloon', 'munkidori'], sprites: ['gardevoir', 'scream-tail'] },
  { name: 'Raging Bolt ex', keywords: ['raging bolt ex', 'ogerpon', 'teal mask ogerpon', 'sandy shocks'], sprites: ['raging-bolt', 'ogerpon'] },
  { name: 'Miraidon ex', keywords: ['miraidon ex', 'iron hands ex', 'raikou v', 'zapdos', 'electric generator'], sprites: ['miraidon', 'iron-hands'] },
  { name: 'Roaring Moon', keywords: ['roaring moon ex', 'roaring moon', 'dark patch', 'remendo escuro'], sprites: ['roaring-moon', 'darkrai'] },
  { name: 'Terapagos ex', keywords: ['terapagos ex', 'noctowl', 'hoothoot', 'bouffalant', 'fan rotom', 'area zero'], sprites: ['terapagos', 'noctowl'] },
  { name: 'Iron Thorns ex', keywords: ['iron thorns ex', 'espinho ferroso ex', 'crushing hammer'], sprites: ['iron-thorns', 'substitute'] },
  { name: 'Gholdengo ex', keywords: ['gholdengo ex', 'gimmighoul', 'scizor', 'scyther'], sprites: ['gholdengo', 'scizor'] },
  { name: 'Ancient Box', keywords: ['flutter mane', 'koraidon', 'ancient booster'], sprites: ['flutter-mane', 'koraidon'] },
  { name: 'Lost Zone Box', keywords: ['comfey', 'sableye', 'cramorant', 'colress', 'mirage gate'], sprites: ['comfey', 'sableye'] },
  { name: 'Origin Forme Palkia VSTAR', keywords: ['palkia vstar', 'palkia v', 'origin forme palkia'], sprites: ['palkia-origin', 'greninja'] },
  { name: 'Snorlax Stall', keywords: ['snorlax', 'rotom v', 'penny', 'miss fortune sisters'], sprites: ['snorlax', 'rotom'] },
  { name: 'Mega Lopunny ex', keywords: ['mega lopunny ex', 'mega lopunny'], sprites: ['lopunny', 'buneary'] },
];

function matchesArchetypeKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(text);
}

export function detectArchetypeFromCards(cardNames: string[]): { name: string; sprites: [string, string] } {
  const normalizedText = cardNames.join(' ').toLowerCase();
  for (const arch of KNOWN_ARCHETYPES) {
    if (arch.keywords.some(kw => matchesArchetypeKeyword(normalizedText, kw))) {
      return { name: arch.name, sprites: arch.sprites };
    }
  }
  if (matchesArchetypeKeyword(normalizedText, 'charizard')) return { name: 'Charizard ex', sprites: ['charizard', 'pidgeot'] };
  if (matchesArchetypeKeyword(normalizedText, 'dragapult')) return { name: 'Dragapult ex', sprites: ['dragapult', 'pidgeot'] };
  if (matchesArchetypeKeyword(normalizedText, 'gardevoir')) return { name: 'Gardevoir ex', sprites: ['gardevoir', 'scream-tail'] };
  if (matchesArchetypeKeyword(normalizedText, 'lugia')) return { name: 'Lugia VSTAR', sprites: ['lugia', 'archeops'] };
  if (matchesArchetypeKeyword(normalizedText, 'bolt')) return { name: 'Raging Bolt ex', sprites: ['raging-bolt', 'ogerpon'] };
  if (matchesArchetypeKeyword(normalizedText, 'miraidon')) return { name: 'Miraidon ex', sprites: ['miraidon', 'iron-hands'] };
  if (matchesArchetypeKeyword(normalizedText, 'moon')) return { name: 'Roaring Moon', sprites: ['roaring-moon', 'darkrai'] };
  if (matchesArchetypeKeyword(normalizedText, 'terapagos')) return { name: 'Terapagos ex', sprites: ['terapagos', 'noctowl'] };
  if (matchesArchetypeKeyword(normalizedText, 'lopunny')) return { name: 'Mega Lopunny ex', sprites: ['lopunny', 'buneary'] };

  const firstMon = cardNames.find(c => !c.toLowerCase().includes('ball') && !c.toLowerCase().includes('energy') && !c.toLowerCase().includes('research') && !c.toLowerCase().includes('iono'));
  if (firstMon) {
    const cleanMon = firstMon.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return { name: `${firstMon} Deck`, sprites: [cleanMon || 'substitute', 'substitute'] };
  }
  return { name: 'Deck Personalizado', sprites: ['substitute', 'substitute'] };
}

// ============================================================================
// CARD NAME EXTRACTION
// ============================================================================

function extractCardName(text: string): string {
  const nowActive = text.match(/^([^.\n]+?)\s+de\s+[^.\n]+?\s+agora\s+está\s+no\s+Campo\s+Ativo/i);
  if (nowActive) return nowActive[1].trim();

  const evoPt = text.match(/evoluiu\s+(?:o\s+)?(.+?)\s+para\s+([^.\n]+?)(?:\s+no\s+(?:Campo Ativo|Banco)|\.|$)/i);
  if (evoPt) return evoPt[2].trim();
  const evoEn = text.match(/evolved\s+.+?\s+into\s+([^.\n]+?)(?:\s+(?:in the Active Spot|on the Bench)|\.|$)/i);
  if (evoEn) return evoEn[1].trim();

  const promoPt = text.match(/promoveu\s+([^.\n]+?)\s+para/i);
  if (promoPt) return promoPt[1].trim();
  const promoEn = text.match(/promoted\s+([^.\n]+?)\s+to/i);
  if (promoEn) return promoEn[1].trim();

  const attackUserPt = text.match(/^([^.\n]+?)\s+de\s+[a-z0-9\s]+\s+usou/i);
  if (attackUserPt) return attackUserPt[1].trim();
  const attackUserEn = text.match(/^[a-z0-9\s]+'s\s+([^.\n]+?)\s+used/i);
  if (attackUserEn) return attackUserEn[1].trim();

  const energyMatchPt = text.match(/ligou\s+([^.\n]+?)\s+(?:a|ao|no)\s+/i);
  if (energyMatchPt) return energyMatchPt[1].trim();
  const energyMatchEn = text.match(/attached\s+([^.\n]+?)\s+to\s+/i);
  if (energyMatchEn) return energyMatchEn[1].trim();

  const placedMatchPt = text.match(/jogou\s+([^.\n]+?)\s+no\s+(?:Campo Ativo|Banco)/i);
  if (placedMatchPt) return placedMatchPt[1].trim();
  const placedMatchEn = text.match(/(?:played|put)\s+([^.\n]+?)\s+(?:in the Active Spot|onto the Bench|to the Bench)/i);
  if (placedMatchEn) return placedMatchEn[1].trim();

  const koPt = text.match(/^([^.\n!]+?)\s+de\s+[^.\n!]+?\s+foi\s+Nocauteado/i);
  if (koPt) return koPt[1].trim();
  const koEn = text.match(/^([^.\n!]+?)\s+was\s+Knocked\s+Out/i);
  if (koEn) return koEn[1].trim();

  let cleaned = text
    .replace(/^[a-z0-9\s]+?\s+(?:played|jogou|colocou|drew|comprou|attached|ligou|anexou|evolved|evoluiu|promoveu|promoted)\s+/i, '')
    .replace(/\s+(?:to the Active Spot|to the Bench|no Campo Ativo|no Banco|in the Active Spot).*/i, '')
    .replace(/\s*(?:e descartou|and discarded|procurou|and searched|\.).*$/i, '')
    .trim();

  return cleaned || text;
}

function isCardMatch(cardA?: string, cardB?: string, mon?: PokemonInPlay): boolean {
  if (!cardA || !cardB) return false;
  const a = cardA.toLowerCase().trim();
  const b = cardB.toLowerCase().trim();
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;

  // If a PokemonInPlay is provided, check any pre-evolution in its evolution stack
  if (mon && mon.stageCards) {
    for (const sc of mon.stageCards) {
      const scLower = sc.toLowerCase().trim();
      if (scLower === b || scLower.startsWith(b) || b.startsWith(scLower)) return true;
    }
  }

  // Evolutionary lineage alias for Dudunsparce / Dunsparce
  if ((a.includes('dudunsparce') || a.includes('dunsparce')) && (b.includes('dudunsparce') || b.includes('dunsparce'))) {
    return true;
  }

  return false;
}

function isEnergyCard(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('energia') || n.includes('energy');
}

// ============================================================================
// INTERNAL STATE MODEL
// ============================================================================

interface PokemonInPlay {
  name: string;
  damage: number;
  energies: string[];
  stageCards: string[];
}

function makePokemon(name: string): PokemonInPlay {
  return { name, damage: 0, energies: [], stageCards: [name] };
}

function removePokemonFromPlay(
  side: { active: () => PokemonInPlay | undefined; setActive: (p?: PokemonInPlay) => void; bench: () => PokemonInPlay[]; setBench: (b: PokemonInPlay[]) => void },
  searchName: string
): { removed: boolean; wasActive: boolean; removedMon?: PokemonInPlay } {
  const act = side.active();
  if (act && isCardMatch(act.name, searchName, act)) {
    side.setActive(undefined);
    return { removed: true, wasActive: true, removedMon: act };
  }
  const bench = side.bench();
  const idx = bench.findIndex(b => isCardMatch(b.name, searchName, b));
  if (idx !== -1) {
    const [removedMon] = bench.splice(idx, 1);
    side.setBench([...bench]);
    return { removed: true, wasActive: false, removedMon };
  }
  return { removed: false, wasActive: false };
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// MAIN PARSER
// ============================================================================

export function parsePTCGLLog(rawLog: string, loggedInUserName?: string): TrainerLogMatch {
  const lines = rawLog.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // ------------------------------------------------------------------
  // 1) DETECÇÃO DE JOGADORES
  // ------------------------------------------------------------------
  let detectedPlayer1 = '';
  let detectedPlayer2 = '';

  for (const line of lines) {
    const t1En = line.match(/^Turn\s*#?\s*1\s*-\s*(.+?)(?:'s|\s+)\s*Turn/i);
    const t1Pt = line.match(/^Turno\s*#?\s*1\s*-\s*Turno\s+de\s+(.+)$/i);
    if (t1En) { detectedPlayer1 = t1En[1].trim(); break; }
    if (t1Pt) { detectedPlayer1 = t1Pt[1].trim(); break; }
  }
  for (const line of lines) {
    const t2En = line.match(/^Turn\s*#?\s*2\s*-\s*(.+?)(?:'s|\s+)\s*Turn/i);
    const t2Pt = line.match(/^Turno\s*#?\s*2\s*-\s*Turno\s+de\s+(.+)$/i);
    if (t2En) { detectedPlayer2 = t2En[1].trim(); break; }
    if (t2Pt) { detectedPlayer2 = t2Pt[1].trim(); break; }
  }

  if (!detectedPlayer1 || !detectedPlayer2) {
    for (const line of lines) {
      const handPt = line.match(/^(.+?)\s+comprou\s+7\s+cartas\s+para\s+a\s+mão\s+inicial/i);
      const handEn = line.match(/^(.+?)\s+drew\s+7\s+cards\s+for\s+the\s+opening\s+hand/i);
      const handPlayer = (handPt ? handPt[1] : handEn ? handEn[1] : '').trim();
      if (handPlayer && !handPlayer.toLowerCase().includes('carta')) {
        if (!detectedPlayer1) detectedPlayer1 = handPlayer;
        else if (!detectedPlayer2 && handPlayer.toLowerCase() !== detectedPlayer1.toLowerCase()) {
          detectedPlayer2 = handPlayer;
        }
      }
    }
  }

  if (!detectedPlayer1) detectedPlayer1 = 'Jogador 1';
  if (!detectedPlayer2) detectedPlayer2 = 'Jogador 2';

  let p1Name = detectedPlayer1;
  let p2Name = detectedPlayer2;

  if (loggedInUserName) {
    const cleanUser = loggedInUserName.toLowerCase().trim();
    if (detectedPlayer2.toLowerCase().trim() === cleanUser) {
      p1Name = detectedPlayer2;
      p2Name = detectedPlayer1;
    } else if (detectedPlayer1.toLowerCase().trim() === cleanUser) {
      p1Name = detectedPlayer1;
      p2Name = detectedPlayer2;
    }
  }

  const resolveActorName = (name: string): 'player1' | 'player2' | null => {
    const n = name.toLowerCase().trim();
    if (n === 'você' || n === 'voce' || n === 'you') return 'player1';
    if (p1Name.toLowerCase() === n) return 'player1';
    if (p2Name.toLowerCase() === n) return 'player2';
    return null;
  };

  // ------------------------------------------------------------------
  // 2) QUEM COMEÇOU
  // ------------------------------------------------------------------
  let isP1First = true;
  for (const line of lines) {
    const l = line.toLowerCase();
    if ((l.includes('decidiu jogar primeiro') || l.includes('decided to go first'))) {
      if (l.includes(p1Name.toLowerCase())) { isP1First = true; break; }
      if (l.includes(p2Name.toLowerCase())) { isP1First = false; break; }
    }
  }

  // ------------------------------------------------------------------
  // 3) DIVISÃO EM BLOCOS DE TURNO
  // ------------------------------------------------------------------
  interface RawTurnBlock {
    turnNumber: number;
    title: string;
    rawLines: string[];
    player: 'player1' | 'player2';
    playerName: string;
  }

  const rawTurns: RawTurnBlock[] = [];
  let currentBlock: RawTurnBlock = {
    turnNumber: 0,
    title: 'Preparação / Setup',
    rawLines: [],
    player: 'player1',
    playerName: p1Name
  };
  let sequentialTurnNumber = 0;

  const detectTurnHeader = (line: string): { turnNumber?: number; playerName: string } | null => {
    let m = line.match(/^(?:Turn|Turno)\s*#?\s*(\d+)\s*-\s*(.+)$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      const remainder = m[2].trim();
      const inner = remainder.match(/(?:Turno\s+de|Turn\s+of)\s+(.+)$/i) || remainder.match(/^(.+?)(?:'s\s+Turn)?$/i);
      const name = (inner ? inner[1] : remainder).replace(/'s\s*Turn$/i, '').trim();
      return { turnNumber: num, playerName: name };
    }
    m = line.match(/^(?:Turno\s+de)\s+(.+)$/i);
    if (m) return { playerName: m[1].trim() };
    m = line.match(/^(.+?)'s\s+Turn$/i);
    if (m) return { playerName: m[1].trim() };
    m = line.match(/^Turn\s+of\s+(.+)$/i);
    if (m) return { playerName: m[1].trim() };
    return null;
  };

  for (const line of lines) {
    const header = detectTurnHeader(line);
    if (header) {
      if (currentBlock.rawLines.length > 0 || currentBlock.turnNumber > 0) {
        rawTurns.push(currentBlock);
      }
      const resolved = resolveActorName(header.playerName);
      const player: 'player1' | 'player2' = resolved || 'player1';
      const playerName = player === 'player1' ? p1Name : p2Name;
      const tNum = header.turnNumber ?? ++sequentialTurnNumber;
      currentBlock = { turnNumber: tNum, title: line, rawLines: [], player, playerName };
      if (header.turnNumber === undefined) sequentialTurnNumber = tNum;
    } else {
      currentBlock.rawLines.push(line);
    }
  }
  if (currentBlock.rawLines.length > 0) rawTurns.push(currentBlock);

  // ------------------------------------------------------------------
  // 4) ESTADO GLOBAL
  // ------------------------------------------------------------------
  let p1Active: PokemonInPlay | undefined = undefined;
  let p1Bench: PokemonInPlay[] = [];
  let p1PrizesRemaining = 6;
  let p2Active: PokemonInPlay | undefined = undefined;
  let p2Bench: PokemonInPlay[] = [];
  let p2PrizesRemaining = 6;
  let stadiumInPlay: string | undefined = undefined;

  let p1PrizesTaken = 0;
  let p2PrizesTaken = 0;
  let matchResult: 'win' | 'loss' | 'draw' = 'win';
  let isGameOver = false;
  let gameOverWinner: 'player1' | 'player2' | undefined = undefined;
  let gameEndReason: string | undefined = undefined;

  const p1Cards: string[] = [];
  const p2Cards: string[] = [];

  const getSide = (actor: 'player1' | 'player2') => actor === 'player1'
    ? {
        active: () => p1Active,
        setActive: (p?: PokemonInPlay) => { p1Active = p; },
        bench: () => p1Bench,
        setBench: (b: PokemonInPlay[]) => { p1Bench = b; }
      }
    : {
        active: () => p2Active,
        setActive: (p?: PokemonInPlay) => { p2Active = p; },
        bench: () => p2Bench,
        setBench: (b: PokemonInPlay[]) => { p2Bench = b; }
      };

  const processedTurns: BattleTurnSnapshot[] = [];

  const ACTION_VERB_RE = /\b(usou|jogou|ligou|anexou|evoluiu|promoveu|recuou|comprou|drew|played|attached|evolved|promoted|retreated|used|ativou|activated|foi|was|pegou|took|descartad|discarded|embaralhou|shuffled|colocou|put|rendeu|concedeu|conceded|surrender)\b/i;

  // ------------------------------------------------------------------
  // 5) PROCESSAR CADA BLOCO
  // ------------------------------------------------------------------
  for (const block of rawTurns) {
    const actions: BattleTurnAction[] = [];
    let p1KnockedOutThisTurn: string | undefined = undefined;
    let p2KnockedOutThisTurn: string | undefined = undefined;
    const turnEvolutions: {
      player: 'player1' | 'player2';
      fromCard: string;
      toCard: string;
      isSpotActive: boolean;
      benchIndex?: number;
    }[] = [];
    const evolvedCardsInTurn: string[] = [];

    let lastMainAction: 'benchDraw' | 'draw' | 'search' | 'other' = 'other';

    for (let i = 0; i < block.rawLines.length; i++) {
      const rawLine = block.rawLines[i];
      const isBullet = /^[•\-*]\s+/.test(rawLine);
      const line = isBullet ? rawLine.replace(/^[•\-*]\s+/, '').trim() : rawLine;
      const lower = line.toLowerCase();
      const actionId = `turn-${block.turnNumber}-act-${i}`;

      const hasP1 = lower.includes(p1Name.toLowerCase());
      const hasP2 = lower.includes(p2Name.toLowerCase());
      const hasYou = /\b(você|voce|you)\b/i.test(lower);

      let actor: 'player1' | 'player2' = block.player;
      if (hasYou) actor = 'player1';
      else if (hasP1 && !hasP2) actor = 'player1';
      else if (hasP2 && !hasP1) actor = 'player2';

      const actorName = actor === 'player1' ? p1Name : p2Name;
      const side = getSide(actor);

      // ================================================================
      // HABILIDADE DE DUDUNSPARCE (Fuga e Compra / Run Away Draw)
      // Dudunsparce e o Dunsparce do qual evoluiu são embaralhados no baralho
      // ================================================================
      const isDudunsparceAbility = lower.includes('dudunsparce') && (
        lower.includes('fuga') || lower.includes('draw') || lower.includes('correr') ||
        lower.includes('habilidade') || lower.includes('ability') || lower.includes('ativou') ||
        lower.includes('usou') || lower.includes('used') || lower.includes('embaralhou') || lower.includes('shuffled')
      );

      if (isDudunsparceAbility && (lower.includes('fuga') || lower.includes('run away') || lower.includes('correr') || lower.includes('habilidade') || lower.includes('ability') || lower.includes('embaralhou') || lower.includes('shuffled') || lower.includes('comprou'))) {
        let ownerActor: 'player1' | 'player2' = actor;
        if (hasP2 && !hasP1) ownerActor = 'player2';
        else if (hasP1 && !hasP2) ownerActor = 'player1';
        let ownerSide = getSide(ownerActor);

        let res = removePokemonFromPlay(ownerSide, 'Dudunsparce');
        if (!res.removed) {
          res = removePokemonFromPlay(ownerSide, 'Dunsparce');
        }
        if (!res.removed) {
          const otherActor = ownerActor === 'player1' ? 'player2' : 'player1';
          const otherSide = getSide(otherActor);
          const otherRes = removePokemonFromPlay(otherSide, 'Dudunsparce') || removePokemonFromPlay(otherSide, 'Dunsparce');
          if (otherRes.removed) {
            ownerActor = otherActor;
            ownerSide = otherSide;
            res = otherRes;
          }
        }

        const effectiveActorName = ownerActor === 'player1' ? p1Name : p2Name;
        actions.push({
          id: actionId,
          type: 'ability',
          player: ownerActor,
          playerName: effectiveActorName,
          cardName: 'Dudunsparce',
          description: line
        });
        lastMainAction = 'other';
        continue;
      }

      // ================================================================
      // EMBARALHAMENTO OU RETORNO DE POKÉMON DO CAMPO (Baralho / Mão)
      // ================================================================
      const isShuffleOrReturn = (
        (lower.includes('embaralhou') || lower.includes('shuffled') || lower.includes('embaralhad') || lower.includes('retornou') || lower.includes('devolveu') || lower.includes('de volta')) &&
        (lower.includes('baralho') || lower.includes('deck') || lower.includes('mão') || lower.includes('hand'))
      );

      if (isShuffleOrReturn) {
        let ownerActor: 'player1' | 'player2' = actor;
        if (hasP2 && !hasP1) ownerActor = 'player2';
        else if (hasP1 && !hasP2) ownerActor = 'player1';
        const ownerSide = getSide(ownerActor);
        const otherActor = ownerActor === 'player1' ? 'player2' : 'player1';
        const otherSide = getSide(otherActor);

        const namesToRemove: string[] = [];

        // Verifica se a própria linha já nomeia Dudunsparce, Dunsparce ou outro Pokémon
        if (lower.includes('dudunsparce')) namesToRemove.push('Dudunsparce');
        if (lower.includes('dunsparce') && !namesToRemove.includes('Dudunsparce')) namesToRemove.push('Dunsparce');

        const directMatch = line.match(/(?:embaralhou|shuffled|retornou|devolveu)\s+(?:o\s+|a\s+)?([A-Za-z0-9\s'\-]+?)\s+(?:e\s+todas|no\s+baralho|no\s+próprio\s+baralho|para\s+a\s+mão|into\s+(?:their|the)\s+deck|to\s+(?:their|the)\s+hand)/i);
        if (directMatch) {
          const extracted = directMatch[1].trim();
          if (extracted && !namesToRemove.some(n => isCardMatch(n, extracted))) {
            namesToRemove.push(extracted);
          }
        }

        // Lê linhas com bullet points abaixo do embaralhamento
        for (let j = i + 1; j < Math.min(i + 8, block.rawLines.length); j++) {
          const nextRaw = block.rawLines[j];
          const nextIsBullet = /^[•\-*]\s+/.test(nextRaw);
          if (!nextIsBullet) {
            if (nextRaw.trim().length === 0) continue;
            break;
          }
          const nextLine = nextRaw.replace(/^[•\-*]\s+/, '').trim();
          if (!nextLine) continue;
          if (/^\d+\s+(?:cartas|cards)/i.test(nextLine) || /foram embaralhad/i.test(nextLine) || /were shuffled/i.test(nextLine)) {
            continue;
          }
          if (ACTION_VERB_RE.test(nextLine) && !nextLine.toLowerCase().includes('dudunsparce') && !nextLine.toLowerCase().includes('dunsparce')) {
            break;
          }

          for (const part of nextLine.split(/,\s*/)) {
            const clean = part.trim();
            if (clean && clean.length > 1) namesToRemove.push(clean);
          }
        }

        if (namesToRemove.length > 0) {
          for (const nm of namesToRemove) {
            let res = removePokemonFromPlay(ownerSide, nm);
            if (!res.removed) {
              removePokemonFromPlay(otherSide, nm);
            }
          }
        }

        actions.push({
          id: actionId, type: 'other', player: ownerActor,
          playerName: ownerActor === 'player1' ? p1Name : p2Name,
          cardName: namesToRemove.join(', '),
          description: line
        });
        lastMainAction = 'other';
        continue;
      }

      // DANO PREVENIDO
      const damagePreventedMatch = line.match(/^o\s+dano\s+(?:em|de|no|na)\s+(.+?)\s+(?:foi|foram)\s+prevenid[ao]s?/i);
      if (damagePreventedMatch) {
        const protectedCard = damagePreventedMatch[1].trim();
        actions.push({
          id: actionId, type: 'ability', player: actor, playerName: actorName,
          cardName: protectedCard, description: line
        });
        lastMainAction = 'other';
        continue;
      }

      // ATIVAÇÃO PASSIVA
      const passiveActivationMatch = line.match(/^(.+?)\s+foi\s+ativad[ao](?:\s|\.|$|!)/i);
      if (passiveActivationMatch) {
        const activatedCard = passiveActivationMatch[1].trim();
        actions.push({
          id: actionId, type: 'ability', player: actor, playerName: actorName,
          cardName: activatedCard, description: line
        });
        lastMainAction = 'other';
        continue;
      }

      // BULLET
      if (isBullet && lastMainAction === 'benchDraw' && !ACTION_VERB_RE.test(line)) {
        const parts = line.split(/,\s*/);
        for (const p of parts) {
          const clean = p.trim();
          if (!clean) continue;
          if (actor === 'player1') p1Cards.push(clean); else p2Cards.push(clean);
          if (side.bench().length < 5) side.bench().push(makePokemon(clean));
        }
        actions.push({
          id: actionId, type: 'other', player: actor, playerName: actorName,
          cardName: line, description: rawLine
        });
        continue;
      }

      // DESCARTA
      const discardedFromMatch = line.match(/^(.+?)\s+foi\s+descartad[ao]\s+de\s+(.+?)(?:\s+de\s+(.+))?\.?$/i);
      if (discardedFromMatch && lower.includes('descartad')) {
        const energyName = discardedFromMatch[1].trim();
        const targetName = discardedFromMatch[2].trim();
        const ownerHint = discardedFromMatch[3]?.trim();

        const ownerActor: 'player1' | 'player2' =
          ownerHint && ownerHint.toLowerCase() === p2Name.toLowerCase() ? 'player2'
          : ownerHint && ownerHint.toLowerCase() === p1Name.toLowerCase() ? 'player1'
          : targetName.toLowerCase() === p2Name.toLowerCase() ? 'player2'
          : targetName.toLowerCase() === p1Name.toLowerCase() ? 'player1'
          : actor;

        const targetSide = getSide(ownerActor);

        const tryRemove = (mon: PokemonInPlay | undefined): boolean => {
          if (!mon || !isCardMatch(mon.name, targetName)) return false;
          const idx = mon.energies.findIndex(e => isEnergyCard(e) || isCardMatch(e, energyName));
          if (idx !== -1) mon.energies.splice(idx, 1);
          return true;
        };
        if (!tryRemove(targetSide.active())) {
          for (const mon of targetSide.bench()) {
            if (tryRemove(mon)) break;
          }
        }

        actions.push({
          id: actionId, type: 'energy',
          player: ownerActor, playerName: ownerActor === 'player1' ? p1Name : p2Name,
          cardName: energyName, description: line
        });
        lastMainAction = 'other';
        continue;
      }

      // DRAW
      if (lower.includes('drew') || lower.includes('comprou')) {
        if ((lower.includes('jogou') || lower.includes('played')) && (lower.includes('banco') || lower.includes('bench'))) {
          lastMainAction = 'benchDraw';
        } else {
          lastMainAction = 'draw';
        }
        actions.push({ id: actionId, type: 'draw', player: actor, playerName: actorName, description: line });
        continue;
      }

      // PRÊMIO
      if (lower.includes('prize card') || lower.includes('carta de prêmio') || lower.includes('cartas de prêmio') ||
          lower.includes('pegou um prêmio') || lower.includes('took a prize') || lower.includes('todas as cartas de prêmio')) {
        let count = 1;
        if (lower.includes('todas as cartas') || lower.includes('all prize')) {
          count = actor === 'player1' ? p1PrizesRemaining : p2PrizesRemaining;
        } else {
          const m = line.match(/(\d+)\s*(?:Prize|carta)/i);
          if (m) count = parseInt(m[1], 10) || 1;
        }
        if (actor === 'player1') {
          p1PrizesTaken += count;
          p1PrizesRemaining = Math.max(0, p1PrizesRemaining - count);
        } else {
          p2PrizesTaken += count;
          p2PrizesRemaining = Math.max(0, p2PrizesRemaining - count);
        }
        actions.push({ id: actionId, type: 'prize', player: actor, playerName: actorName, prizesTaken: count, description: line });
        lastMainAction = 'other';
        continue;
      }

      // NOCAUTE
      if (lower.includes('knocked out') || lower.includes('nocauteado')) {
        let victimActor: 'player1' | 'player2' = actor === 'player1' ? 'player2' : 'player1';
        const victimP2 = new RegExp(`de\\s+${escapeReg(p2Name)}\\b`, 'i').test(line);
        const victimP1 = new RegExp(`de\\s+${escapeReg(p1Name)}\\b`, 'i').test(line);
        if (victimP2 && !victimP1) victimActor = 'player2';
        else if (victimP1 && !victimP2) victimActor = 'player1';

        const koCard = extractCardName(line);
        const victimSide = getSide(victimActor);

        if (victimSide.active() && (!koCard || isCardMatch(victimSide.active()!.name, koCard))) {
          const name = victimSide.active()!.name;
          if (victimActor === 'player1') p1KnockedOutThisTurn = name; else p2KnockedOutThisTurn = name;
          victimSide.setActive(undefined);
        } else if (koCard) {
          const before = victimSide.bench().length;
          const filtered = victimSide.bench().filter(b => !isCardMatch(b.name, koCard));
          if (filtered.length < before) victimSide.setBench(filtered);
        }

        actions.push({ id: actionId, type: 'knockout', player: actor, playerName: actorName, cardName: koCard, description: line });
        lastMainAction = 'other';
        continue;
      }

      // ATAQUE
      if (lower.includes('usou') || (lower.includes('used') && (lower.includes('damage') || lower.includes('dealt')))) {
        let dmg = 0;
        const baseMatch = line.match(/dano\s+base[:\s]+(\d+)/i);
        if (baseMatch) {
          dmg = parseInt(baseMatch[1], 10);
        } else {
          const m = line.match(/causar\s+(\d+)|dealt\s+(\d+)|(\d+)\s*(?:damage|de dano)/i);
          if (m) dmg = parseInt(m[1] || m[2] || m[3], 10) || 0;
        }

        const defenderActor: 'player1' | 'player2' = actor === 'player1' ? 'player2' : 'player1';
        const defenderSide = getSide(defenderActor);
        if (defenderSide.active()) {
          defenderSide.active()!.damage += dmg;
        }

        actions.push({
          id: actionId, type: 'attack', player: actor, playerName: actorName,
          cardName: extractCardName(line), damage: dmg, description: line
        });
        lastMainAction = 'other';
        continue;
      }

      // EVOLUÇÃO
      if (lower.includes('evoluiu') || lower.includes('evolved') || lower.includes('evolveu')) {
        const evoPt = line.match(/evoluiu\s+(?:o\s+)?(.+?)\s+para\s+([^.\n!]+?)(?:\s+no\s+(Campo Ativo|Banco)|\.|\!|$)/i);
        const evoEn = line.match(/evolv(?:ed|e)\s+(?:Active\s+)?(.+?)\s+(?:in)?to\s+([^.\n!]+?)(?:\s+(?:in the Active Spot|on the Bench|onto the Bench)|\.|\!|$)/i);

        let fromMon = '';
        let toMon = '';
        let spotHint: 'active' | 'bench' | null = null;
        if (evoPt) {
          fromMon = evoPt[1].trim();
          toMon = evoPt[2].trim();
          if (evoPt[3]) spotHint = evoPt[3].toLowerCase().includes('banco') ? 'bench' : 'active';
        } else if (evoEn) {
          fromMon = evoEn[1].trim();
          toMon = evoEn[2].trim();
          if (evoEn[3]) spotHint = evoEn[3].toLowerCase().includes('bench') ? 'bench' : 'active';
        } else {
          toMon = extractCardName(line);
        }
        toMon = toMon.replace(/\s+(?:no\s+banco|no\s+campo\s+ativo|on\s+the\s+bench|in\s+the\s+active\s+spot).*/i, '').trim();
        fromMon = fromMon.replace(/^(?:active|ativo)\s+/i, '').trim();

        if (actor === 'player1') p1Cards.push(toMon); else p2Cards.push(toMon);

        let isSpotActive = false;
        let evolvedBenchIndex: number | undefined = undefined;

        const active = side.active();
        const bench = side.bench();
        const activeMatches = Boolean(active && fromMon && isCardMatch(active.name, fromMon));
        const benchIdx = bench.findIndex(b => fromMon ? isCardMatch(b.name, fromMon) : false);

        if (spotHint === 'bench' && benchIdx !== -1) {
          bench[benchIdx].stageCards = [...(bench[benchIdx].stageCards || [bench[benchIdx].name]), toMon];
          bench[benchIdx].name = toMon;
          evolvedBenchIndex = benchIdx;
        } else if (spotHint === 'active' || (activeMatches && spotHint !== 'bench')) {
          if (active) {
            active.stageCards = [...(active.stageCards || [active.name]), toMon];
            active.name = toMon;
          } else {
            side.setActive(makePokemon(toMon));
          }
          isSpotActive = true;
        } else if (benchIdx !== -1) {
          bench[benchIdx].stageCards = [...(bench[benchIdx].stageCards || [bench[benchIdx].name]), toMon];
          bench[benchIdx].name = toMon;
          evolvedBenchIndex = benchIdx;
        } else if (activeMatches) {
          if (active) {
            active.stageCards = [...(active.stageCards || [active.name]), toMon];
            active.name = toMon;
          }
          isSpotActive = true;
        } else if (bench.length > 0) {
          bench[0].stageCards = [...(bench[0].stageCards || [bench[0].name]), toMon];
          bench[0].name = toMon;
          evolvedBenchIndex = 0;
        } else {
          side.setActive(makePokemon(toMon));
          isSpotActive = true;
        }

        turnEvolutions.push({
          player: actor, fromCard: fromMon, toCard: toMon,
          isSpotActive, benchIndex: isSpotActive ? undefined : evolvedBenchIndex
        });
        if (toMon && !evolvedCardsInTurn.includes(toMon)) evolvedCardsInTurn.push(toMon);

        actions.push({
          id: actionId, type: 'play', player: actor, playerName: actorName,
          cardName: toMon, description: line
        });
        lastMainAction = 'other';
        continue;
      }

      // ================================================================
      // PROMOÇÃO EXPLÍCITA — FIX: idempotente + devolve o active anterior
      // ================================================================
      if (lower.includes('promoveu') || lower.includes('promoted')) {
        let promotedCard = extractCardName(line);
        const promoPt = line.match(/promoveu\s+(.+?)\s+para\s+o\s+campo\s+ativo/i);
        const promoEn = line.match(/promoted\s+(.+?)\s+to\s+the\s+active\s+spot/i);
        if (promoPt) promotedCard = promoPt[1].trim();
        else if (promoEn) promotedCard = promoEn[1].trim();

        const bench = side.bench();
        const previousActive = side.active();

        // Idempotente: se o active atual já é o promotedCard, não faz nada
        if (previousActive && isCardMatch(previousActive.name, promotedCard)) {
          // já está correto
        } else {
          const idx = bench.findIndex(b => isCardMatch(b.name, promotedCard));
          if (idx !== -1) {
            const [mon] = bench.splice(idx, 1);
            side.setActive(mon);
          } else {
            side.setActive(makePokemon(promotedCard));
          }

          // Devolve o active anterior (auto-promovido) pro banco
          if (previousActive && bench.length < 5) {
            bench.push(previousActive);
          }
        }

        actions.push({ id: actionId, type: 'play', player: actor, playerName: actorName, cardName: promotedCard, description: line });
        lastMainAction = 'other';
        continue;
      }

      // ================================================================
      // "agora está no Campo Ativo" — FIX: idempotente
      // ================================================================
      const nowActiveMatch = line.match(/^([^.\n]+?)\s+de\s+[^.\n]+?\s+agora\s+está\s+no\s+Campo\s+Ativo/i);
      if (nowActiveMatch) {
        const promotedCard = nowActiveMatch[1].trim();
        const bench = side.bench();
        const previousActive = side.active();

        // Idempotente: se o active atual já é o promotedCard, não faz nada
        if (previousActive && isCardMatch(previousActive.name, promotedCard)) {
          // já está correto
        } else {
          const idx = bench.findIndex(b => isCardMatch(b.name, promotedCard));
          let promotedMon: PokemonInPlay;
          if (idx !== -1) {
            [promotedMon] = bench.splice(idx, 1);
          } else {
            promotedMon = makePokemon(promotedCard);
          }
          side.setActive(promotedMon);

          if (previousActive && previousActive !== promotedMon && bench.length < 5) {
            bench.push(previousActive);
          }
        }

        actions.push({ id: actionId, type: 'play', player: actor, playerName: actorName, cardName: promotedCard, description: line });
        lastMainAction = 'other';
        continue;
      }

      // ENERGIA
      if (lower.includes('ligou') || lower.includes('attached') || lower.includes('anexou')) {
        const energyCard = extractCardName(line);
        const targetPt = line.match(/\s+(?:a|ao)\s+(.+?)\s+(?:no\s+Campo\s+Ativo|no\s+Banco|do\s+baralho)/i);
        const targetEn = line.match(/\s+to\s+(.+?)\s+(?:in the Active Spot|on the Bench)/i);
        const targetName = targetPt ? targetPt[1].trim() : targetEn ? targetEn[1].trim() : '';
        const toBench = lower.includes('no banco') || lower.includes('on the bench');

        if (targetName) {
          const bench = side.bench();
          const benchIdx = bench.findIndex(b => isCardMatch(b.name, targetName));
          const active = side.active();

          if (toBench && benchIdx !== -1) bench[benchIdx].energies.push(energyCard);
          else if (active && isCardMatch(active.name, targetName)) active.energies.push(energyCard);
          else if (benchIdx !== -1) bench[benchIdx].energies.push(energyCard);
          else if (active) active.energies.push(energyCard);
        } else if (side.active()) {
          side.active()!.energies.push(energyCard);
        }

        actions.push({ id: actionId, type: 'energy', player: actor, playerName: actorName, cardName: energyCard, description: line });
        lastMainAction = 'other';
        continue;
      }

      // HABILIDADE
      if (lower.includes('habilidade') || lower.includes('ability') || lower.includes('ativou') || lower.includes('activated')) {
        const abilityCard = extractCardName(line);
        if (abilityCard.toLowerCase().includes('dudunsparce') || lower.includes('dudunsparce')) {
          const res = removePokemonFromPlay(side, 'Dudunsparce');
          if (!res.removed) {
            const otherSide = getSide(actor === 'player1' ? 'player2' : 'player1');
            removePokemonFromPlay(otherSide, 'Dudunsparce');
          }
        }
        actions.push({
          id: actionId, type: 'ability', player: actor, playerName: actorName,
          cardName: abilityCard, description: line
        });
        lastMainAction = 'other';
        continue;
      }

      // RECUO
      if (lower.includes('recuou') || lower.includes('retreated')) {
        const retreatPt = line.match(/recuou\s+(.+?)\s+para\s+o\s+Banco/i);
        const retreatEn = line.match(/retreated\s+(.+?)\s+(?:to|onto)\s+the\s+Bench/i);
        const retreatedName = retreatPt ? retreatPt[1].trim() : retreatEn ? retreatEn[1].trim() : '';

        const active = side.active();
        if (active && (!retreatedName || isCardMatch(active.name, retreatedName))) {
          if (side.bench().length < 5) side.bench().push(active);
          side.setActive(undefined);
        }

        actions.push({ id: actionId, type: 'retreat', player: actor, playerName: actorName, cardName: retreatedName, description: line });
        lastMainAction = 'other';
        continue;
      }

      // ESTÁDIO
      if (lower.includes('estádio') || lower.includes('stadium')) {
        stadiumInPlay = extractCardName(line);
        actions.push({ id: actionId, type: 'stadium', player: actor, playerName: actorName, cardName: stadiumInPlay, description: line });
        lastMainAction = 'other';
        continue;
      }

      // PLAY NORMAL
      if (lower.includes('jogou') || lower.includes('played') || lower.includes('colocou') || lower.includes('put')) {
        const placedCard = extractCardName(line);
        if (actor === 'player1') p1Cards.push(placedCard); else p2Cards.push(placedCard);

        if (lower.includes('campo ativo') || lower.includes('active spot')) {
          side.setActive(makePokemon(placedCard));
        } else if (lower.includes('banco') || lower.includes('bench')) {
          const ptMatch = line.match(/colocou\s+(.+?)\s+no\s+Banco/i);
          const enMatch = line.match(/(?:played|put)\s+(.+?)\s+(?:to|onto)\s+the\s+Bench/i);
          const raw = (ptMatch ? ptMatch[1] : enMatch ? enMatch[1] : placedCard).trim();
          const parts = raw.includes(' e ') ? raw.split(' e ') : raw.includes(' and ') ? raw.split(' and ') : [raw];
          for (const p of parts) {
            const clean = p.trim();
            if (!clean) continue;
            const countMatch = clean.match(/^(\d+)\s+(.+)$/);
            const count = countMatch ? parseInt(countMatch[1], 10) : 1;
            const mon = countMatch ? countMatch[2].trim() : clean;
            for (let c = 0; c < count; c++) {
              if (side.bench().length < 5) side.bench().push(makePokemon(mon));
            }
          }
        }

        actions.push({ id: actionId, type: 'play', player: actor, playerName: actorName, cardName: placedCard, description: line });
        lastMainAction = 'other';
        continue;
      }

      // FALLBACK
      actions.push({ id: actionId, type: 'other', player: actor, playerName: actorName, description: line });
      lastMainAction = 'other';
    }

    // FIM DE JOGO
    for (const line of block.rawLines) {
      const lower = line.toLowerCase();

      if (lower.includes('não tem mais pokémon em jogo') || lower.includes('no more pokémon in play')) {
        isGameOver = true;
        if (lower.includes(p2Name.toLowerCase())) {
          p2Active = undefined; p2Bench = [];
          gameOverWinner = 'player1'; matchResult = 'win';
          gameEndReason = `${p2Name} não tem mais Pokémon em jogo.`;
        } else {
          p1Active = undefined; p1Bench = [];
          gameOverWinner = 'player2'; matchResult = 'loss';
          gameEndReason = `${p1Name} não tem mais Pokémon em jogo.`;
        }
      }

      if (/\bvenceu[.!]?\s*$/i.test(lower) || lower.includes('won the game') || lower.includes('venceu a partida')) {
        isGameOver = true;
        if (lower.includes(p1Name.toLowerCase())) {
          matchResult = 'win'; gameOverWinner = 'player1';
          p1PrizesRemaining = 0; p1PrizesTaken = 6;
          gameEndReason = `${p1Name} venceu a partida!`;
        } else if (lower.includes(p2Name.toLowerCase())) {
          matchResult = 'loss'; gameOverWinner = 'player2';
          p2PrizesRemaining = 0; p2PrizesTaken = 6;
          gameEndReason = `${p2Name} venceu a partida!`;
        }
      }

      if (lower.includes('conceded') || lower.includes('concedeu') ||
          lower.includes('se rendeu') || lower.includes('rendeu') || lower.includes('surrender')) {
        isGameOver = true;
        const isP1Conceding = /\b(você|voce|you)\b/i.test(lower) || lower.includes(p1Name.toLowerCase());
        if (isP1Conceding) {
          matchResult = 'loss'; gameOverWinner = 'player2';
          gameEndReason = `${p1Name} se rendeu.`;
        } else {
          matchResult = 'win'; gameOverWinner = 'player1';
          gameEndReason = `${p2Name} se rendeu.`;
        }
      }
    }

    // ================================================================
    // AUTO-PROMOÇÃO: se algum lado ficou sem ativo mas ainda tem banco,
    // promove o primeiro mon do banco. Garante que nunca fica um lado
    // sem Pokémon Ativo.
    // ================================================================
    if (!p1Active && p1Bench.length > 0) p1Active = p1Bench.shift()!;
    if (!p2Active && p2Bench.length > 0) p2Active = p2Bench.shift()!;

    processedTurns.push({
      turnNumber: block.turnNumber,
      turnTitle: block.title,
      player: block.player,
      playerName: block.playerName,
      actions,
      p1Active: p1Active?.name,
      p1Bench: p1Bench.map(b => b.name).slice(0, 5),
      p1PrizesRemaining: Math.max(0, p1PrizesRemaining),
      p1ActiveDamage: p1Active?.damage ?? 0,
      p1ActiveEnergies: p1Active ? [...p1Active.energies] : [],
      p2Active: p2Active?.name,
      p2Bench: p2Bench.map(b => b.name).slice(0, 5),
      p2PrizesRemaining: Math.max(0, p2PrizesRemaining),
      p2ActiveDamage: p2Active?.damage ?? 0,
      p2ActiveEnergies: p2Active ? [...p2Active.energies] : [],
      stadiumInPlay,
      isGameOver: isGameOver || p1PrizesRemaining <= 0 || p2PrizesRemaining <= 0,
      winner: gameOverWinner || (matchResult === 'win' ? 'player1' : 'player2'),
      gameEndReason,
      evolvedCards: [...evolvedCardsInTurn],
      evolutions: [...turnEvolutions],
      p1KnockedOutThisTurn,
      p2KnockedOutThisTurn
    });
  }

  // CONCLUSÃO
  if (!isGameOver) {
    if (p1PrizesTaken >= 6 || p2PrizesRemaining <= 0) {
      matchResult = 'win'; gameOverWinner = 'player1';
    } else if (p2PrizesTaken >= 6 || p1PrizesRemaining <= 0) {
      matchResult = 'loss'; gameOverWinner = 'player2';
    }
  }

  const p1Archetype = detectArchetypeFromCards(p1Cards);
  const p2Archetype = detectArchetypeFromCards(p2Cards);
  const totalTurns = processedTurns.filter(t => t.turnNumber > 0).length || 1;

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: '',
    player1Name: p1Name,
    player2Name: p2Name,
    playerDeckArchetype: p1Archetype.name,
    opponentDeckArchetype: p2Archetype.name,
    playerDeckName: p1Archetype.name,
    result: matchResult,
    wentFirst: isP1First,
    totalTurns,
    p1PrizesTaken: Math.min(6, p1PrizesTaken),
    p2PrizesTaken: Math.min(6, p2PrizesTaken),
    finalScore: `${Math.min(6, p1PrizesTaken)} - ${Math.min(6, p2PrizesTaken)}`,
    format: 'Standard',
    date: new Date().toISOString(),
    rawLog,
    turns: processedTurns
  };
}

// ============================================================================
// SAMPLE LOGS
// ============================================================================

export const SAMPLE_PT_LOG = `Preparação
Felipe Wilks jogou 1 moeda(s), com resultado de 1 cara(s) e 0 coroa(s).
Felipe Wilks comprou 7 cartas para a mão inicial.
- 7 cartas compradas.
Guilherme comprou 7 cartas para a mão inicial.
- 7 cartas compradas.
Felipe Wilks colocou Charmander no Campo Ativo.
Felipe Wilks colocou Pidgey no Banco.
Guilherme colocou Dreepy no Campo Ativo.

Turno # 1 - Turno de Felipe Wilks
Felipe Wilks comprou uma carta.
Felipe Wilks jogou Pedaço de Poffin de Companheiro.
- Felipe Wilks procurou no baralho e colocou Duskull e Charmander no Banco.
Felipe Wilks ligou Energia de Fogo Básica a Charmander no Campo Ativo.
Felipe Wilks encerrou seu turno.

Turno # 2 - Turno de Guilherme
Guilherme comprou uma carta.
Guilherme jogou Pedaço de Poffin de Companheiro.
- Guilherme colocou 2 Dreepy no Banco.
Guilherme jogou Pesquisa de Professores e descartou sua mão.
Guilherme comprou 7 cartas.
Guilherme ligou Energia Psíquica Básica a Dreepy no Campo Ativo.
Guilherme encerrou seu turno.

Turno # 3 - Turno de Felipe Wilks
Felipe Wilks comprou uma carta.
Felipe Wilks jogou Doce Raro.
- Felipe Wilks evoluiu Charmander para Charizard ex no Campo Ativo.
Felipe Wilks ativou a habilidade Reinado Infernal de Charizard ex.
- Felipe Wilks ligou 3 Energias de Fogo Básicas do baralho a seus Pokémon.
Felipe Wilks jogou Ultra Bola e descartou 2 cartas.
- Felipe Wilks procurou Pidgeot ex no baralho.
Felipe Wilks jogou Doce Raro e evoluiu Pidgey para Pidgeot ex no Banco.
Felipe Wilks ativou a habilidade Busca Rápida de Pidgeot ex.
Charizard ex de Felipe Wilks usou Queima Ardente e causou 180 de dano a Dreepy de Guilherme.
Dreepy de Guilherme foi Nocauteado!
Felipe Wilks pegou 1 carta de Prêmio.

Turno # 4 - Turno de Guilherme
Guilherme promoveu Dreepy para o Campo Ativo.
Guilherme comprou uma carta.
Guilherme jogou Doce Raro e evoluiu Dreepy para Dragapult ex.
Guilherme ligou Energia de Fogo Básica a Dragapult ex.
Dragapult ex de Guilherme usou Mergulho Fantasma e causou 200 de dano a Charizard ex de Felipe Wilks e 60 de dano a Pidgeot ex no Banco.

Turno # 5 - Turno de Felipe Wilks
Felipe Wilks comprou uma carta.
Felipe Wilks ativou a habilidade Busca Rápida de Pidgeot ex.
Felipe Wilks jogou Ordens da Chefia (Ghetsis).
- Dragapult ex de Guilherme permaneceu no Campo Ativo.
Felipe Wilks usou a habilidade Explosão Espiritual de Dusknoir e colocou 13 contadores de dano em Dragapult ex!
Dusknoir de Felipe Wilks foi Nocauteado.
Guilherme pegou 1 carta de Prêmio.
Charizard ex de Felipe Wilks usou Queima Ardente e causou 240 de dano a Dragapult ex de Guilherme.
Dragapult ex de Guilherme foi Nocauteado!
Felipe Wilks pegou 2 cartas de Prêmio.

Turno # 6 - Turno de Guilherme
Guilherme promoveu Dreepy para o Campo Ativo.
Guilherme jogou Iono.
Ambos os jogadores embaralharam suas mãos.
Guilherme comprou 5 cartas.
Felipe Wilks comprou 3 cartas.
Guilherme ligou Energia a Dreepy.
Guilherme encerrou seu turno sem atacar.

Turno # 7 - Turno de Felipe Wilks
Felipe Wilks comprou uma carta.
Felipe Wilks usou Queima Ardente em Dreepy de Guilherme e causou 270 de dano.
Dreepy de Guilherme foi Nocauteado!
Felipe Wilks pegou 1 carta de Prêmio.
Guilherme não tem mais Pokémon em jogo.
Felipe Wilks pegou todas as cartas de Prêmio restantes.
Felipe Wilks venceu a partida!`;

export const SAMPLE_EN_LOG = `Setup
Player1 flipped 1 coin(s), resulting in 1 heads and 0 tails.
Player1 drew 7 cards for the opening hand.
Opponent drew 7 cards for the opening hand.
Player1 played Ralts to the Active Spot.
Player1 played Ralts to the Bench.
Opponent played Lugia V to the Active Spot.

Turn # 1 - Player1's Turn
Player1 drew a card.
Player1 played Buddy-Buddy Poffin.
- Player1 drew 2 cards and played them to the Bench.
   • Ralts
   • Scream Tail
Player1 attached Basic Psychic Energy to Ralts in the Active Spot.
Player1 ended their turn.

Turn # 2 - Opponent's Turn
Opponent drew a card.
Opponent played Ultra Ball and discarded 2 Archeops.
- Opponent drew Lumineon V.
Opponent played Lumineon V to the Bench.
Opponent used Lumineon V's Luminous Sign ability.
Opponent played Professor's Research.
Opponent attached Double Turbo Energy to Lugia V.
Opponent ended their turn.

Turn # 3 - Player1's Turn
Player1 drew a card.
Player1 evolved Ralts to Kirlia on the Bench.
Player1 evolved Active Ralts to Kirlia.
Player1 used Refinement ability and discarded Basic Psychic Energy.
Player1 drew 2 cards.
Player1 played Rare Candy to evolve Kirlia to Gardevoir ex!
Player1 activated Psychic Embrace ability and attached 3 Psychic Energies from the discard pile.
Gardevoir ex used Miracle Force and dealt 190 damage to Lugia V.

Turn # 4 - Opponent's Turn
Opponent drew a card.
Opponent evolved Lugia V to Lugia VSTAR.
Opponent activated VSTAR Power: Summoning Star!
Opponent placed 2 Archeops onto the Bench.
Archeops activated Primal Turbo and attached 2 Special Energies to Lugia VSTAR.
Lugia VSTAR used Tempest Dive and dealt 220 damage.
Gardevoir ex was Knocked Out!
Opponent took 2 Prize cards.

Turn # 5 - Player1's Turn
Player1 promoted Scream Tail to the Active Spot.
Player1 drew a card.
Player1 used Psychic Embrace to attach 4 Psychic Energies to Scream Tail.
Player1 played Boss's Orders and switched Opponent's Benched Lumineon V to the Active Spot.
Scream Tail used Roaring Scream and dealt 280 damage to Lumineon V!
Lumineon V was Knocked Out!
Player1 took 2 Prize cards.

Turn # 6 - Opponent's Turn
Opponent conceded the game.
Player1 won the game!`;
