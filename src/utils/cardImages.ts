// ============================================================================
// cardImages.ts — Resolver Pokémon TCG (PTCGL-first)
//
// - Registry de cartas canônicas (TPCi-first)
// - CARD_ALIASES para PT-BR
// - Fuzzy match com FRONTEIRA DE PALAVRA
// - PLAYER DECK REGISTRY + VERSION OVERRIDE (localStorage)
// - REGULATION MARK FILTER (prefere sets legais H/I)
// - Cartas do deck do usuário pré-cadastradas
//
// FIX (última revisão):
//  1. registerCollectionCards SEMPRE recalcula URL (ignora stale)
//  2. getRegisteredCollectionCard REJEITA se (set, number) da coleção
//     divergir do DB canônico. Isso força o uso da versão correta.
//  3. resolvePTCGLCard e resolveCardByNameOnly têm a MESMA ordem
//  4. ORB-SAFE: ordem de URL é ptcgIo → Limitless → TCGdex
//  5. OVERRIDE DE IMAGENS: Força URLs corretas para sets que o setSync não conhece.
// ============================================================================

import {
  findSet,
  buildImageHierarchy,
  tcgdexUrl,
  ptcgIoUrl,
  limitlessUrl,
  CARD_BACK_URL,
  SET_SYNC_TABLE as _SET_SYNC_TABLE,
  isSetStandardLegal,
  getSetRegulationMark,
} from './setSync';
import { sanitizePokemonCreatureName } from './pokemonSprites';

export const POKEMON_CARD_BACK = 'https://images.pokemontcg.io/card-back.png';
export const POKEMON_CARD_BACK_FALLBACK = 'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg';

// ============================================================================
// OVERRIDE DE IMAGENS (Correção para sets que o setSync.ts não conhece)
// ============================================================================
const CARD_IMAGE_OVERRIDES: Record<string, string> = {
  // Cynthia's Garchomp ex (JTG 86 / 086)
  'JTG-086': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/JTG/JTG_086_R_EN.png',
  'JTG-86': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/JTG/JTG_086_R_EN.png',
  // Budew (SVI 9)
  'SVI-9': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/SVI/SVI_009_R_EN.png',
  // Fan Rotom (ASC 250)
  'ASC-250': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/ASC/ASC_250_R_EN.png',
  // Mew ex (30TH 66)
  '30TH-66': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30TH/30TH_066_R_EN.png',
  // Stunfisk (ASC 62)
  'ASC-62': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/ASC/ASC_062_R_EN.png',
  // Meowth ex (JTG 106)
  'JTG-106': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/JTG/JTG_106_R_EN.png',
  // Lillie's Clefairy ex (ASC 280)
  'ASC-280': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/ASC/ASC_280_R_EN.png',
  // Risky Ruins (TWM 168)
  'TWM-168': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TWM/TWM_168_R_EN.png',
  // Mega Lopunny ex (PFL 128)
  'PFL-128': 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/PFL/PFL_128_R_EN.png',
};

export { findSet, buildImageHierarchy, tcgdexUrl, ptcgIoUrl, limitlessUrl } from './setSync';

export interface CardMetadata {
  id: string;
  name: string;
  category: 'pokemon' | 'supporter' | 'item' | 'tool' | 'stadium' | 'energy';
  energyType?: 'fire' | 'water' | 'grass' | 'lightning' | 'psychic' | 'fighting' | 'darkness' | 'metal' | 'dragon' | 'colorless';
  stage?: 'BÁSICO' | 'ESTÁGIO 1' | 'ESTÁGIO 2' | 'VSTAR' | 'VMAX' | 'EX' | 'TREINADOR' | 'ENERGIA';
  hp?: number;
  imageUrl: string;
  setCode?: string;
  setNumber?: string;
  localSetId?: string;
  isFromCollection?: boolean;
  collectionScanUrl?: string;
}

// ============================================================================
// COMPATIBILIDADE
// ============================================================================

export const SET_LOCAL_TO_TPCI_MAP: Record<string, { tpciCode: string; name: string; localId: string }> = (() => {
  const map: Record<string, { tpciCode: string; name: string; localId: string }> = {};
  for (const e of _SET_SYNC_TABLE) {
    const entry = { tpciCode: e.tpci, name: e.name, localId: e.ptcgIo || e.tcgdexSet || '' };
    map[e.tpci.toLowerCase()] = entry;
    if (e.tcgdexSet) map[e.tcgdexSet.toLowerCase()] = entry;
    if (e.ptcgIo) map[e.ptcgIo.toLowerCase()] = entry;
  }
  return map;
})();

export const SET_TPCI_TO_LOCAL_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const e of _SET_SYNC_TABLE) {
    map[e.tpci.toUpperCase()] = e.ptcgIo || e.tcgdexSet || e.tpci.toLowerCase();
  }
  return map;
})();

export const SET_TO_TCGDEX_MAP: Record<string, { series: string; set: string }> = (() => {
  const map: Record<string, { series: string; set: string }> = {};
  for (const e of _SET_SYNC_TABLE) {
    if (!e.tcgdexSeries || !e.tcgdexSet) continue;
    const entry = { series: e.tcgdexSeries, set: e.tcgdexSet };
    map[e.tpci] = entry;
    map[e.tpci.toLowerCase()] = entry;
    map[e.tcgdexSet] = entry;
    map[e.tcgdexSet.toLowerCase()] = entry;
    if (e.ptcgIo) {
      map[e.ptcgIo] = entry;
      map[e.ptcgIo.toLowerCase()] = entry;
    }
  }
  return map;
})();

// ============================================================================
// HELPERS
// ============================================================================

export function normalizeTPCiSetCode(setCode: string): string {
  if (!setCode) return 'SVI';
  const entry = findSet(setCode);
  if (entry) return entry.tpci;
  return setCode.toUpperCase().trim();
}

export function mapTPCiToLocalSetId(tpciCode: string): string {
  const entry = findSet(tpciCode);
  return entry?.ptcgIo || tpciCode.toLowerCase().trim();
}

export function isKnownTPCiCode(token: string): boolean {
  if (!token) return false;
  const entry = findSet(token);
  return !!entry && entry.tpci.toUpperCase() === token.toUpperCase().trim();
}

export function getTCGdexImageUrl(
  setCode: string,
  setNumber: string | number,
  lang: 'pt' | 'en' = 'en'
): string | null {
  return tcgdexUrl(setCode, setNumber, lang);
}

export function getPokemonTcgIoImageUrl(
  setCode: string,
  setNumber: string | number
): string | null {
  return ptcgIoUrl(setCode, setNumber);
}

function getBestImageUrl(setCode: string, setNumber: string | number): string {
  return (
    ptcgIoUrl(setCode, setNumber) ||
    limitlessUrl(setCode, setNumber) ||
    tcgdexUrl(setCode, setNumber, 'en') ||
    ''
  );
}

// ============================================================================
// CANONICAL CARD DATABASE
// ============================================================================

export const CARD_IMAGE_DATABASE: Record<string, CardMetadata> = {
  'charizard ex':      { id: 'OBF-125', name: 'Charizard ex', category: 'pokemon', energyType: 'darkness', stage: 'ESTÁGIO 2', hp: 330, imageUrl: '', setCode: 'OBF', setNumber: '125', localSetId: 'sv3' },
  'charmander':        { id: 'OBF-26',  name: 'Charmander',   category: 'pokemon', energyType: 'fire',     stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'OBF', setNumber: '26',  localSetId: 'sv3' },
  'charmeleon':        { id: 'OBF-27',  name: 'Charmeleon',   category: 'pokemon', energyType: 'fire',     stage: 'ESTÁGIO 1', hp: 90,  imageUrl: '', setCode: 'OBF', setNumber: '27',  localSetId: 'sv3' },
  'radiant charizard': { id: 'PGO-11',  name: 'Radiant Charizard', category: 'pokemon', energyType: 'fire', stage: 'BÁSICO', hp: 160, imageUrl: '', setCode: 'PGO', setNumber: '11', localSetId: 'pgo' },
  'pidgeot ex':        { id: 'OBF-164', name: 'Pidgeot ex',   category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 2', hp: 280, imageUrl: '', setCode: 'OBF', setNumber: '164', localSetId: 'sv3' },
  'pidgeot':           { id: 'OBF-164', name: 'Pidgeot ex',   category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 2', hp: 280, imageUrl: '', setCode: 'OBF', setNumber: '164', localSetId: 'sv3' },
  'pidgey':            { id: 'OBF-162', name: 'Pidgey',       category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 60,  imageUrl: '', setCode: 'OBF', setNumber: '162', localSetId: 'sv3' },
  'pidgeotto':         { id: 'OBF-163', name: 'Pidgeotto',    category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 80,  imageUrl: '', setCode: 'OBF', setNumber: '163', localSetId: 'sv3' },
  'absol ex':          { id: 'OBF-135', name: 'Absol ex',     category: 'pokemon', energyType: 'darkness',  stage: 'BÁSICO',    hp: 210, imageUrl: '', setCode: 'OBF', setNumber: '135', localSetId: 'sv3' },
  'absol':             { id: 'OBF-135', name: 'Absol ex',     category: 'pokemon', energyType: 'darkness',  stage: 'BÁSICO',    hp: 210, imageUrl: '', setCode: 'OBF', setNumber: '135', localSetId: 'sv3' },
  'budew':             { id: 'SVI-9',   name: 'Budew',        category: 'pokemon', energyType: 'grass',     stage: 'BÁSICO',    hp: 30,  imageUrl: '', setCode: 'SVI', setNumber: '9',   localSetId: 'sv1' },
  'dragapult ex':      { id: 'TWM-130', name: 'Dragapult ex', category: 'pokemon', energyType: 'dragon',    stage: 'ESTÁGIO 2', hp: 320, imageUrl: '', setCode: 'TWM', setNumber: '130', localSetId: 'sv6' },
  'dreepy':            { id: 'TWM-128', name: 'Dreepy',       category: 'pokemon', energyType: 'dragon',    stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'TWM', setNumber: '128', localSetId: 'sv6' },
  'drakloak':          { id: 'TWM-129', name: 'Drakloak',     category: 'pokemon', energyType: 'dragon',    stage: 'ESTÁGIO 1', hp: 90,  imageUrl: '', setCode: 'TWM', setNumber: '129', localSetId: 'sv6' },
  'duskull':           { id: 'SFA-18',  name: 'Duskull',      category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 60,  imageUrl: '', setCode: 'SFA', setNumber: '18', localSetId: 'sv6pt5' },
  'dusclops':          { id: 'SFA-19',  name: 'Dusclops',     category: 'pokemon', energyType: 'psychic',   stage: 'ESTÁGIO 1', hp: 90,  imageUrl: '', setCode: 'SFA', setNumber: '19', localSetId: 'sv6pt5' },
  'dusknoir':          { id: 'SFA-20',  name: 'Dusknoir',     category: 'pokemon', energyType: 'psychic',   stage: 'ESTÁGIO 2', hp: 160, imageUrl: '', setCode: 'SFA', setNumber: '20', localSetId: 'sv6pt5' },
  'rotom v':           { id: 'LOR-58',  name: 'Rotom V',      category: 'pokemon', energyType: 'lightning', stage: 'BÁSICO',    hp: 190, imageUrl: '', setCode: 'LOR', setNumber: '58', localSetId: 'swsh11' },
  'fezandipiti ex':    { id: 'SFA-38',  name: 'Fezandipiti ex', category: 'pokemon', energyType: 'psychic', stage: 'BÁSICO',  hp: 210, imageUrl: '', setCode: 'SFA', setNumber: '38', localSetId: 'sv6pt5' },
  'manaphy':           { id: 'BRS-41',  name: 'Manaphy',      category: 'pokemon', energyType: 'water',     stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'BRS', setNumber: '41', localSetId: 'swsh9' },
  'radiant alakazam':  { id: 'SIT-59',  name: 'Radiant Alakazam', category: 'pokemon', energyType: 'psychic', stage: 'BÁSICO', hp: 130, imageUrl: '', setCode: 'SIT', setNumber: '59', localSetId: 'swsh12' },
  'lugia vstar':       { id: 'SIT-139', name: 'Lugia VSTAR',  category: 'pokemon', energyType: 'colorless', stage: 'VSTAR',     hp: 280, imageUrl: '', setCode: 'SIT', setNumber: '139', localSetId: 'swsh12' },
  'lugia v':           { id: 'SIT-138', name: 'Lugia V',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 220, imageUrl: '', setCode: 'SIT', setNumber: '138', localSetId: 'swsh12' },
  'archeops':          { id: 'SIT-147', name: 'Archeops',     category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 2', hp: 150, imageUrl: '', setCode: 'SIT', setNumber: '147', localSetId: 'swsh12' },
  'gardevoir ex':      { id: 'SVI-86',  name: 'Gardevoir ex', category: 'pokemon', energyType: 'psychic',   stage: 'ESTÁGIO 2', hp: 310, imageUrl: '', setCode: 'SVI', setNumber: '86', localSetId: 'sv1' },
  'kirlia':            { id: 'SVI-85',  name: 'Kirlia',       category: 'pokemon', energyType: 'psychic',   stage: 'ESTÁGIO 1', hp: 80,  imageUrl: '', setCode: 'SVI', setNumber: '85', localSetId: 'sv1' },
  'ralts':             { id: 'SVI-84',  name: 'Ralts',        category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'SVI', setNumber: '84', localSetId: 'sv1' },
  'munkidori':         { id: 'TWM-95',  name: 'Munkidori',    category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 110, imageUrl: '', setCode: 'TWM', setNumber: '95', localSetId: 'sv6' },
  'raging bolt ex':    { id: 'TEF-123', name: 'Raging Bolt ex', category: 'pokemon', energyType: 'dragon', stage: 'BÁSICO',    hp: 240, imageUrl: '', setCode: 'TEF', setNumber: '123', localSetId: 'sv5' },
  'teal mask ogerpon ex': { id: 'TWM-25', name: 'Teal Mask Ogerpon ex', category: 'pokemon', energyType: 'grass', stage: 'BÁSICO', hp: 210, imageUrl: '', setCode: 'TWM', setNumber: '25', localSetId: 'sv6' },
  'ogerpon':           { id: 'TWM-25',  name: 'Teal Mask Ogerpon ex', category: 'pokemon', energyType: 'grass', stage: 'BÁSICO', hp: 210, imageUrl: '', setCode: 'TWM', setNumber: '25', localSetId: 'sv6' },
  'miraidon ex':       { id: 'SVI-81',  name: 'Miraidon ex',  category: 'pokemon', energyType: 'lightning', stage: 'BÁSICO',    hp: 220, imageUrl: '', setCode: 'SVI', setNumber: '81', localSetId: 'sv1' },
  'iron hands ex':     { id: 'PAR-70',  name: 'Iron Hands ex', category: 'pokemon', energyType: 'lightning', stage: 'BÁSICO',   hp: 230, imageUrl: '', setCode: 'PAR', setNumber: '70', localSetId: 'sv4' },
  'iron thorns ex':    { id: 'TWM-77',  name: 'Iron Thorns ex', category: 'pokemon', energyType: 'lightning', stage: 'BÁSICO', hp: 230, imageUrl: '', setCode: 'TWM', setNumber: '77', localSetId: 'sv6' },
  'iron crown ex':     { id: 'TEF-81',  name: 'Iron Crown ex', category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',   hp: 220, imageUrl: '', setCode: 'TEF', setNumber: '81', localSetId: 'sv5' },
  'iron valiant ex':   { id: 'PAR-89',  name: 'Iron Valiant ex', category: 'pokemon', energyType: 'psychic', stage: 'BÁSICO',   hp: 220, imageUrl: '', setCode: 'PAR', setNumber: '89', localSetId: 'sv4' },
  'iron bundle':       { id: 'PAR-56',  name: 'Iron Bundle',  category: 'pokemon', energyType: 'water',     stage: 'BÁSICO',    hp: 100, imageUrl: '', setCode: 'PAR', setNumber: '56', localSetId: 'sv4' },
  'raikou v':          { id: 'BRS-48',  name: 'Raikou V',     category: 'pokemon', energyType: 'lightning', stage: 'BÁSICO',    hp: 200, imageUrl: '', setCode: 'BRS', setNumber: '48', localSetId: 'swsh9' },
  'roaring moon ex':   { id: 'PAR-124', name: 'Roaring Moon ex', category: 'pokemon', energyType: 'darkness', stage: 'BÁSICO', hp: 230, imageUrl: '', setCode: 'PAR', setNumber: '124', localSetId: 'sv4' },
  'roaring moon':      { id: 'TEF-109', name: 'Roaring Moon', category: 'pokemon', energyType: 'darkness',  stage: 'BÁSICO',    hp: 140, imageUrl: '', setCode: 'TEF', setNumber: '109', localSetId: 'sv5' },
  'flutter mane':      { id: 'TEF-78',  name: 'Flutter Mane', category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 90,  imageUrl: '', setCode: 'TEF', setNumber: '78', localSetId: 'sv5' },
  'koraidon':          { id: 'TEF-119', name: 'Koraidon',     category: 'pokemon', energyType: 'fighting',  stage: 'BÁSICO',    hp: 140, imageUrl: '', setCode: 'TEF', setNumber: '119', localSetId: 'sv5' },
  'terapagos ex':      { id: 'SCR-128', name: 'Terapagos ex', category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 230, imageUrl: '', setCode: 'SCR', setNumber: '128', localSetId: 'sv7' },
  'noctowl':           { id: 'SCR-115', name: 'Noctowl',      category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 100, imageUrl: '', setCode: 'SCR', setNumber: '115', localSetId: 'sv7' },
  'hoothoot':          { id: 'SCR-114', name: 'Hoothoot',     category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'SCR', setNumber: '114', localSetId: 'sv7' },
  'bouffalant':        { id: 'SCR-119', name: 'Bouffalant',   category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 100, imageUrl: '', setCode: 'SCR', setNumber: '119', localSetId: 'sv7' },
  'gholdengo ex':      { id: 'PAR-139', name: 'Gholdengo ex', category: 'pokemon', energyType: 'metal',     stage: 'ESTÁGIO 1', hp: 260, imageUrl: '', setCode: 'PAR', setNumber: '139', localSetId: 'sv4' },
  'gimmighoul':        { id: 'PAR-87',  name: 'Gimmighoul',   category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 50,  imageUrl: '', setCode: 'PAR', setNumber: '87', localSetId: 'sv4' },
  'scizor':            { id: 'OBF-141', name: 'Scizor',       category: 'pokemon', energyType: 'metal',     stage: 'ESTÁGIO 1', hp: 140, imageUrl: '', setCode: 'OBF', setNumber: '141', localSetId: 'sv3' },
  'scyther':           { id: 'OBF-4',   name: 'Scyther',      category: 'pokemon', energyType: 'grass',     stage: 'BÁSICO',    hp: 80,  imageUrl: '', setCode: 'OBF', setNumber: '4',   localSetId: 'sv3' },
  'pikachu ex':        { id: 'SSP-57',  name: 'Pikachu ex',   category: 'pokemon', energyType: 'lightning', stage: 'BÁSICO',    hp: 200, imageUrl: '', setCode: 'SSP', setNumber: '57', localSetId: 'sv8' },
  'ceruledge ex':      { id: 'SSP-36',  name: 'Ceruledge ex', category: 'pokemon', energyType: 'fire',      stage: 'ESTÁGIO 1', hp: 270, imageUrl: '', setCode: 'SSP', setNumber: '36', localSetId: 'sv8' },
  'comfey':            { id: 'LOR-79',  name: 'Comfey',       category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'LOR', setNumber: '79', localSetId: 'swsh11' },
  'sableye':           { id: 'LOR-70',  name: 'Sableye',      category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 80,  imageUrl: '', setCode: 'LOR', setNumber: '70', localSetId: 'swsh11' },
  'cramorant':         { id: 'LOR-50',  name: 'Cramorant',    category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 110, imageUrl: '', setCode: 'LOR', setNumber: '50', localSetId: 'swsh11' },
  'radiant greninja':  { id: 'ASR-46',  name: 'Radiant Greninja', category: 'pokemon', energyType: 'water', stage: 'BÁSICO',   hp: 130, imageUrl: '', setCode: 'ASR', setNumber: '46', localSetId: 'swsh10' },
  'snorlax':           { id: 'PGO-55',  name: 'Snorlax',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 150, imageUrl: '', setCode: 'PGO', setNumber: '55', localSetId: 'pgo' },
  'origin forme palkia vstar': { id: 'ASR-40', name: 'Origin Forme Palkia VSTAR', category: 'pokemon', energyType: 'water', stage: 'VSTAR', hp: 280, imageUrl: '', setCode: 'ASR', setNumber: '40', localSetId: 'swsh10' },
  'palkia vstar':      { id: 'ASR-40',  name: 'Origin Forme Palkia VSTAR', category: 'pokemon', energyType: 'water', stage: 'VSTAR', hp: 280, imageUrl: '', setCode: 'ASR', setNumber: '40', localSetId: 'swsh10' },
  'regidrago vstar':   { id: 'SIT-136', name: 'Regidrago VSTAR', category: 'pokemon', energyType: 'dragon', stage: 'VSTAR',    hp: 280, imageUrl: '', setCode: 'SIT', setNumber: '136', localSetId: 'swsh12' },
  'chien-pao ex':      { id: 'PAL-61',  name: 'Chien-Pao ex', category: 'pokemon', energyType: 'water',     stage: 'BÁSICO',    hp: 220, imageUrl: '', setCode: 'PAL', setNumber: '61', localSetId: 'sv2' },
  'baxcalibur':        { id: 'PAL-60',  name: 'Baxcalibur',   category: 'pokemon', energyType: 'water',     stage: 'ESTÁGIO 2', hp: 160, imageUrl: '', setCode: 'PAL', setNumber: '60', localSetId: 'sv2' },
  'bibarel':           { id: 'BRS-121', name: 'Bibarel',      category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 120, imageUrl: '', setCode: 'BRS', setNumber: '121', localSetId: 'swsh9' },
  'bidoof':            { id: 'BRS-120', name: 'Bidoof',       category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'BRS', setNumber: '120', localSetId: 'swsh9' },
  'squawkabilly ex':   { id: 'PAL-169', name: 'Squawkabilly ex', category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO', hp: 160, imageUrl: '', setCode: 'PAL', setNumber: '169', localSetId: 'sv2' },
  'bloodmoon ursaluna ex': { id: 'TWM-141', name: 'Bloodmoon Ursaluna ex', category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO', hp: 260, imageUrl: '', setCode: 'TWM', setNumber: '141', localSetId: 'sv6' },
  'lumineon v':        { id: 'BRS-40',  name: 'Lumineon V',   category: 'pokemon', energyType: 'water',     stage: 'BÁSICO',    hp: 170, imageUrl: '', setCode: 'BRS', setNumber: '40', localSetId: 'swsh9' },
  'crobat v':          { id: 'DAA-104', name: 'Crobat V',     category: 'pokemon', energyType: 'darkness',  stage: 'BÁSICO',    hp: 180, imageUrl: '', setCode: 'DAA', setNumber: '104', localSetId: 'swsh3' },

  // ----- CARTAS DO DECK DO USUÁRIO -----
  'mew ex 30th':        { id: '30TH-66',  name: 'Mew ex',         category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 180, imageUrl: '', setCode: '30TH', setNumber: '66',  localSetId: '30th' },
  'mew ex':             { id: '30TH-66',  name: 'Mew ex',         category: 'pokemon', energyType: 'psychic',   stage: 'BÁSICO',    hp: 180, imageUrl: '', setCode: '30TH', setNumber: '66',  localSetId: '30th' },
  'stunfisk asc':       { id: 'ASC-62',   name: 'Stunfisk',       category: 'pokemon', energyType: 'fighting',  stage: 'BÁSICO',    hp: 110, imageUrl: '', setCode: 'ASC',  setNumber: '62',  localSetId: 'me2pt5' },
  'stunfisk':           { id: 'ASC-62',   name: 'Stunfisk',       category: 'pokemon', energyType: 'fighting',  stage: 'BÁSICO',    hp: 110, imageUrl: '', setCode: 'ASC',  setNumber: '62',  localSetId: 'me2pt5' },
  'dunsparce jtg':      { id: 'JTG-120',  name: 'Dunsparce',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'JTG',  setNumber: '120', localSetId: 'sv9' },
  'dunsparce':          { id: 'JTG-120',  name: 'Dunsparce',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'JTG',  setNumber: '120', localSetId: 'sv9' },
  'dunsparce tef':      { id: 'TEF-128',  name: 'Dunsparce',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'TEF',  setNumber: '128', localSetId: 'sv5' },
  'dunsparce svi':      { id: 'SVI-74',   name: 'Dunsparce',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 60,  imageUrl: '', setCode: 'SVI',  setNumber: '74',  localSetId: 'sv1' },
  'dudunsparce ex jtg': { id: 'JTG-178',  name: 'Dudunsparce ex', category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 270, imageUrl: '', setCode: 'JTG',  setNumber: '178', localSetId: 'sv9' },
  'dudunsparce ex':     { id: 'JTG-178',  name: 'Dudunsparce ex', category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 270, imageUrl: '', setCode: 'JTG',  setNumber: '178', localSetId: 'sv9' },
  'dudunsparce pre':    { id: 'PRE-80',   name: 'Dudunsparce',    category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 140, imageUrl: '', setCode: 'PRE',  setNumber: '80',  localSetId: 'sv8pt5' },
  'dudunsparce tef':    { id: 'TEF-129',  name: 'Dudunsparce',    category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 140, imageUrl: '', setCode: 'TEF',  setNumber: '129', localSetId: 'sv5' },
  'dudunsparce':        { id: 'TEF-129',  name: 'Dudunsparce',    category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 140, imageUrl: '', setCode: 'TEF',  setNumber: '129', localSetId: 'sv5' },
  'moltres pfl':        { id: 'PFL-14',   name: 'Moltres',        category: 'pokemon', energyType: 'fire',      stage: 'BÁSICO',    hp: 120, imageUrl: '', setCode: 'PFL',  setNumber: '14',  localSetId: 'me2' },
  'moltres':            { id: 'PFL-14',   name: 'Moltres',        category: 'pokemon', energyType: 'fire',      stage: 'BÁSICO',    hp: 120, imageUrl: '', setCode: 'PFL',  setNumber: '14',  localSetId: 'me2' },
  'fan rotom asc':      { id: 'ASC-250',  name: 'Fan Rotom',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'ASC',  setNumber: '250', localSetId: 'me2pt5' },
  'fan rotom':          { id: 'ASC-250',  name: 'Fan Rotom',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'ASC',  setNumber: '250', localSetId: 'me2pt5' },
  'psyduck asc':        { id: 'ASC-226',  name: 'Psyduck',        category: 'pokemon', energyType: 'water',     stage: 'BÁSICO',    hp: 60,  imageUrl: '', setCode: 'ASC',  setNumber: '226', localSetId: 'me2pt5' },
  'psyduck':            { id: 'ASC-226',  name: 'Psyduck',        category: 'pokemon', energyType: 'water',     stage: 'BÁSICO',    hp: 60,  imageUrl: '', setCode: 'ASC',  setNumber: '226', localSetId: 'me2pt5' },
  "lillie's clefairy ex asc": { id: 'ASC-280', name: "Lillie's Clefairy ex", category: 'pokemon', energyType: 'psychic', stage: 'BÁSICO', hp: 190, imageUrl: '', setCode: 'ASC', setNumber: '280', localSetId: 'me2pt5' },
  "lillie's clefairy ex": { id: 'ASC-280', name: "Lillie's Clefairy ex", category: 'pokemon', energyType: 'psychic', stage: 'BÁSICO', hp: 190, imageUrl: '', setCode: 'ASC', setNumber: '280', localSetId: 'me2pt5' },
  "cynthia's garchomp ex jtg": { id: 'JTG-086', name: "Cynthia's Garchomp ex", category: 'pokemon', energyType: 'dragon', stage: 'ESTÁGIO 2', hp: 320, imageUrl: '', setCode: 'JTG', setNumber: '086', localSetId: 'sv9' },
  "cynthia's garchomp ex": { id: 'JTG-086', name: "Cynthia's Garchomp ex", category: 'pokemon', energyType: 'dragon', stage: 'ESTÁGIO 2', hp: 320, imageUrl: '', setCode: 'JTG', setNumber: '086', localSetId: 'sv9' },
  "cynthia's gabite jtg":  { id: 'JTG-085', name: "Cynthia's Gabite", category: 'pokemon', energyType: 'dragon', stage: 'ESTÁGIO 1', hp: 100, imageUrl: '', setCode: 'JTG', setNumber: '085', localSetId: 'sv9' },
  "cynthia's gabite":      { id: 'JTG-085', name: "Cynthia's Gabite", category: 'pokemon', energyType: 'dragon', stage: 'ESTÁGIO 1', hp: 100, imageUrl: '', setCode: 'JTG', setNumber: '085', localSetId: 'sv9' },
  "cynthia's gible jtg":   { id: 'JTG-084', name: "Cynthia's Gible", category: 'pokemon', energyType: 'dragon', stage: 'BÁSICO', hp: 70, imageUrl: '', setCode: 'JTG', setNumber: '084', localSetId: 'sv9' },
  "cynthia's gible":       { id: 'JTG-084', name: "Cynthia's Gible", category: 'pokemon', energyType: 'dragon', stage: 'BÁSICO', hp: 70, imageUrl: '', setCode: 'JTG', setNumber: '084', localSetId: 'sv9' },
  "cynthia's roserade jtg":{ id: 'JTG-008', name: "Cynthia's Roserade", category: 'pokemon', energyType: 'grass', stage: 'ESTÁGIO 1', hp: 110, imageUrl: '', setCode: 'JTG', setNumber: '008', localSetId: 'sv9' },
  "cynthia's roserade":    { id: 'JTG-008', name: "Cynthia's Roserade", category: 'pokemon', energyType: 'grass', stage: 'ESTÁGIO 1', hp: 110, imageUrl: '', setCode: 'JTG', setNumber: '008', localSetId: 'sv9' },
  'buneary pfl':        { id: 'PFL-83',   name: 'Buneary',        category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'PFL',  setNumber: '83',  localSetId: 'me2' },
  'buneary':            { id: 'PFL-83',   name: 'Buneary',        category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 70,  imageUrl: '', setCode: 'PFL',  setNumber: '83',  localSetId: 'me2' },
  'lopunny':            { id: 'SVI-161',  name: 'Lopunny',        category: 'pokemon', energyType: 'colorless', stage: 'ESTÁGIO 1', hp: 100, imageUrl: '', setCode: 'SVI',  setNumber: '161', localSetId: 'sv1' },
  'mega lopunny ex':    { id: 'PFL-128',  name: 'Mega Lopunny ex', category: 'pokemon', energyType: 'colorless', stage: 'EX',     hp: 260, imageUrl: '', setCode: 'PFL',  setNumber: '128', localSetId: 'me2' },
  'tandemaus':          { id: 'SVI-168',  name: 'Tandemaus',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 40,  imageUrl: '', setCode: 'SVI',  setNumber: '168', localSetId: 'sv1' },
  'meowth ex':          { id: 'JTG-106',  name: 'Meowth ex',      category: 'pokemon', energyType: 'colorless', stage: 'BÁSICO',    hp: 170, imageUrl: '', setCode: 'JTG',  setNumber: '106', localSetId: 'sv9' },

  // ----- XY Mega Evolutions -----
  'mega lucario ex':       { id: 'FFI-55',  name: 'Mega Lucario ex',   category: 'pokemon', energyType: 'fighting', stage: 'EX', hp: 220, imageUrl: '', setCode: 'FFI', setNumber: '55',  localSetId: 'xy3' },
  'mega gardevoir ex':     { id: 'STS-112', name: 'Mega Gardevoir ex', category: 'pokemon', energyType: 'psychic',  stage: 'EX', hp: 210, imageUrl: '', setCode: 'STS', setNumber: '112', localSetId: 'xy11' },
  'mega charizard x ex':   { id: 'FLF-13',  name: 'Mega Charizard X ex', category: 'pokemon', energyType: 'fire', stage: 'EX', hp: 220, imageUrl: '', setCode: 'FLF', setNumber: '13',  localSetId: 'xy2' },
  'mega charizard y ex':   { id: 'FLF-108', name: 'Mega Charizard Y ex', category: 'pokemon', energyType: 'fire', stage: 'EX', hp: 220, imageUrl: '', setCode: 'FLF', setNumber: '108', localSetId: 'xy2' },
  'mega venusaur ex':      { id: 'XY-2',    name: 'Mega Venusaur ex', category: 'pokemon', energyType: 'grass', stage: 'EX', hp: 230, imageUrl: '', setCode: 'XY',  setNumber: '2',   localSetId: 'xy1' },
  'mega blastoise ex':     { id: 'XY-30',   name: 'Mega Blastoise ex', category: 'pokemon', energyType: 'water', stage: 'EX', hp: 220, imageUrl: '', setCode: 'XY',  setNumber: '30',  localSetId: 'xy1' },
  'mega gengar ex':        { id: 'PHF-35',  name: 'Mega Gengar ex', category: 'pokemon', energyType: 'psychic', stage: 'EX', hp: 220, imageUrl: '', setCode: 'PHF', setNumber: '35',  localSetId: 'xy4' },
  'mega rayquaza ex':      { id: 'ROS-61',  name: 'Mega Rayquaza ex', category: 'pokemon', energyType: 'colorless', stage: 'EX', hp: 220, imageUrl: '', setCode: 'ROS', setNumber: '61',  localSetId: 'xy6' },
  'mega mewtwo x ex':      { id: 'BKT-63',  name: 'Mega Mewtwo X ex', category: 'pokemon', energyType: 'psychic', stage: 'EX', hp: 230, imageUrl: '', setCode: 'BKT', setNumber: '63',  localSetId: 'xy8' },
  'mega mewtwo y ex':      { id: 'BKT-64',  name: 'Mega Mewtwo Y ex', category: 'pokemon', energyType: 'psychic', stage: 'EX', hp: 210, imageUrl: '', setCode: 'BKT', setNumber: '64',  localSetId: 'xy8' },
  'mega tyranitar ex':     { id: 'AOR-43',  name: 'Mega Tyranitar ex', category: 'pokemon', energyType: 'darkness', stage: 'EX', hp: 240, imageUrl: '', setCode: 'AOR', setNumber: '43',  localSetId: 'xy7' },
  'mega scizor ex':        { id: 'BKP-77',  name: 'Mega Scizor ex', category: 'pokemon', energyType: 'metal', stage: 'EX', hp: 220, imageUrl: '', setCode: 'BKP', setNumber: '77',  localSetId: 'xy9' },
  'mega steelix ex':       { id: 'STS-68',  name: 'Mega Steelix ex', category: 'pokemon', energyType: 'metal', stage: 'EX', hp: 240, imageUrl: '', setCode: 'STS', setNumber: '68',  localSetId: 'xy11' },
  'zygarde ex':            { id: 'FCO-54',  name: 'Zygarde ex', category: 'pokemon', energyType: 'fighting', stage: 'EX', hp: 190, imageUrl: '', setCode: 'FCO', setNumber: '54',  localSetId: 'xy10' },
  'xerneas ex':            { id: 'XY-96',   name: 'Xerneas ex', category: 'pokemon', energyType: 'psychic', stage: 'EX', hp: 170, imageUrl: '', setCode: 'XY',  setNumber: '96',  localSetId: 'xy1' },
  'yveltal ex':            { id: 'XY-78',   name: 'Yveltal ex', category: 'pokemon', energyType: 'darkness', stage: 'EX', hp: 170, imageUrl: '', setCode: 'XY',  setNumber: '78',  localSetId: 'xy1' },

  // ----- Trainers -----
  'buddy-buddy poffin twm': { id: 'TWM-223', name: 'Buddy-Buddy Poffin', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TWM', setNumber: '223', localSetId: 'sv6' },
  'buddy-buddy poffin tef': { id: 'TEF-144', name: 'Buddy-Buddy Poffin', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TEF', setNumber: '144', localSetId: 'sv5' },
  'buddy-buddy poffin':     { id: 'TEF-144', name: 'Buddy-Buddy Poffin', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TEF', setNumber: '144', localSetId: 'sv5' },
  'poffin de companheiro':  { id: 'TEF-144', name: 'Buddy-Buddy Poffin', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TEF', setNumber: '144', localSetId: 'sv5' },
  'poffin de colega':       { id: 'TEF-144', name: 'Buddy-Buddy Poffin', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TEF', setNumber: '144', localSetId: 'sv5' },
  'ultra ball asc':         { id: 'ASC-264', name: 'Ultra Ball', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'ASC', setNumber: '264', localSetId: 'me2pt5' },
  'ultra ball svi':         { id: 'SVI-196', name: 'Ultra Ball', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '196', localSetId: 'sv1' },
  'ultra ball':             { id: 'SVI-196', name: 'Ultra Ball', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '196', localSetId: 'sv1' },
  'ultra bola':             { id: 'SVI-196', name: 'Ultra Ball', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '196', localSetId: 'sv1' },
  'nest ball':              { id: 'SVI-181', name: 'Nest Ball',  category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '181', localSetId: 'sv1' },
  'bola ninho':             { id: 'SVI-181', name: 'Nest Ball',  category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '181', localSetId: 'sv1' },
  'rare candy':             { id: 'SVI-191', name: 'Rare Candy', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '191', localSetId: 'sv1' },
  'doce raro':              { id: 'SVI-191', name: 'Rare Candy', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '191', localSetId: 'sv1' },
  'super rod':              { id: 'PAL-188', name: 'Super Rod',  category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'PAL', setNumber: '188', localSetId: 'sv2' },
  'supervara':              { id: 'PAL-188', name: 'Super Rod',  category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'PAL', setNumber: '188', localSetId: 'sv2' },
  'prime catcher':          { id: 'TEF-157', name: 'Prime Catcher', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TEF', setNumber: '157', localSetId: 'sv5' },
  'pegador primordial':     { id: 'TEF-157', name: 'Prime Catcher', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TEF', setNumber: '157', localSetId: 'sv5' },
  'counter catcher':        { id: 'PAR-160', name: 'Counter Catcher', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'PAR', setNumber: '160', localSetId: 'sv4' },
  'pegador de revanche':    { id: 'PAR-160', name: 'Counter Catcher', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'PAR', setNumber: '160', localSetId: 'sv4' },
  'night stretcher meg':    { id: 'MEG-173', name: 'Night Stretcher', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'MEG', setNumber: '173', localSetId: 'me1' },
  'night stretcher sfa':    { id: 'SFA-61',  name: 'Night Stretcher', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SFA', setNumber: '61', localSetId: 'sv6pt5' },
  'night stretcher':        { id: 'MEG-173', name: 'Night Stretcher', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'MEG', setNumber: '173', localSetId: 'me1' },
  'maca noturna':           { id: 'MEG-173', name: 'Night Stretcher', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'MEG', setNumber: '173', localSetId: 'me1' },
  'earthen vessel':         { id: 'PAR-163', name: 'Earthen Vessel', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'PAR', setNumber: '163', localSetId: 'sv4' },
  'recipiente terrestre':   { id: 'PAR-163', name: 'Earthen Vessel', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'PAR', setNumber: '163', localSetId: 'sv4' },
  'forest seal stone':      { id: 'SIT-156', name: 'Forest Seal Stone', category: 'tool', stage: 'TREINADOR', imageUrl: '', setCode: 'SIT', setNumber: '156', localSetId: 'swsh12' },
  'arven':                  { id: 'SVI-166', name: 'Arven', category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '166', localSetId: 'sv1' },
  'iono':                   { id: 'PAL-185', name: 'Iono',  category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'PAL', setNumber: '185', localSetId: 'sv2' },
  "boss's orders rcl":      { id: 'RCL-189', name: "Boss's Orders", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'RCL', setNumber: '189', localSetId: 'swsh2' },
  "boss's orders svi":      { id: 'SVI-172', name: "Boss's Orders", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '172', localSetId: 'sv1' },
  "boss's orders":          { id: 'RCL-189', name: "Boss's Orders", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'RCL', setNumber: '189', localSetId: 'swsh2' },
  'ordens da chefia':       { id: 'RCL-189', name: "Boss's Orders", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'RCL', setNumber: '189', localSetId: 'swsh2' },
  'ordem da chefia':        { id: 'RCL-189', name: "Boss's Orders", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'RCL', setNumber: '189', localSetId: 'swsh2' },
  "professor's research":   { id: 'SVI-189', name: "Professor's Research", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '189', localSetId: 'sv1' },
  'pesquisa de professores': { id: 'SVI-189', name: "Professor's Research", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '189', localSetId: 'sv1' },
  'artazon':                { id: 'PAL-171', name: 'Artazon', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'PAL', setNumber: '171', localSetId: 'sv2' },
  'pokestop':               { id: 'PGO-68',  name: 'PokéStop', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'PGO', setNumber: '68', localSetId: 'pgo' },
  'pokeparada':             { id: 'PGO-68',  name: 'PokéStop', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'PGO', setNumber: '68', localSetId: 'pgo' },
  'jamming tower':          { id: 'TWM-153', name: 'Jamming Tower', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'TWM', setNumber: '153', localSetId: 'sv6' },
  'torre interferente':     { id: 'TWM-153', name: 'Jamming Tower', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'TWM', setNumber: '153', localSetId: 'sv6' },
  'area zero underdepths':  { id: 'SCR-131', name: 'Area Zero Underdepths', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'SCR', setNumber: '131', localSetId: 'sv7' },
  'subterraneo da area zero': { id: 'SCR-131', name: 'Area Zero Underdepths', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'SCR', setNumber: '131', localSetId: 'sv7' },
  'neutral center':         { id: 'SCR-133', name: 'Neutral Center', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'SCR', setNumber: '133', localSetId: 'sv7' },
  'centro neutro':          { id: 'SCR-133', name: 'Neutral Center', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'SCR', setNumber: '133', localSetId: 'sv7' },
  'path to the peak':       { id: 'CRE-148', name: 'Path to the Peak', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'CRE', setNumber: '148', localSetId: 'swsh6' },
  'lost city':              { id: 'LOR-161', name: 'Lost City', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'LOR', setNumber: '161', localSetId: 'swsh11' },
  'poke tablet':            { id: 'TEF-196', name: 'Poké Tablet', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TEF', setNumber: '196', localSetId: 'sv5' },
  'compaixao do wally meg': { id: 'MEG-176', name: "Wally's Compassion", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'MEG', setNumber: '176', localSetId: 'me1' },
  "wally's compassion":     { id: 'MEG-176', name: "Wally's Compassion", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'MEG', setNumber: '176', localSetId: 'me1' },
  'battle cage pfl':        { id: 'PFL-116', name: 'Battle Cage', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'PFL', setNumber: '116', localSetId: 'me2' },
  'battle cage':            { id: 'PFL-116', name: 'Battle Cage', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'PFL', setNumber: '116', localSetId: 'me2' },
  'jaula de batalha':       { id: 'PFL-116', name: 'Battle Cage', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'PFL', setNumber: '116', localSetId: 'me2' },
  'crushing hammer':        { id: 'SVI-168', name: 'Crushing Hammer', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '168', localSetId: 'sv1' },
  'martelo esmagador':      { id: 'SVI-168', name: 'Crushing Hammer', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '168', localSetId: 'sv1' },
  "lillie's determination meg": { id: 'MEG-169', name: "Lillie's Determination", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'MEG', setNumber: '169', localSetId: 'me1' },
  "lillie's determination": { id: 'MEG-169', name: "Lillie's Determination", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'MEG', setNumber: '169', localSetId: 'me1' },
  'determinacao da lilian': { id: 'MEG-169', name: "Lillie's Determination", category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'MEG', setNumber: '169', localSetId: 'me1' },
  'special red card cri':   { id: 'CRI-113', name: 'Special Red Card', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'CRI', setNumber: '113', localSetId: 'me4' },
  'special red card':       { id: 'CRI-113', name: 'Special Red Card', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'CRI', setNumber: '113', localSetId: 'me4' },
  'cartao vermelho especial': { id: 'CRI-113', name: 'Special Red Card', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'CRI', setNumber: '113', localSetId: 'me4' },
  'air balloon ssh':        { id: 'SSH-213', name: 'Air Balloon', category: 'tool', stage: 'TREINADOR', imageUrl: '', setCode: 'SSH', setNumber: '213', localSetId: 'swsh1' },
  'air balloon svi':        { id: 'SVI-153', name: 'Air Balloon', category: 'tool', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '153', localSetId: 'sv1' },
  'air balloon':            { id: 'SVI-153', name: 'Air Balloon', category: 'tool', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '153', localSetId: 'sv1' },
  'balao de ar':            { id: 'SVI-153', name: 'Air Balloon', category: 'tool', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '153', localSetId: 'sv1' },
  'hilda wht':              { id: 'WHT-171', name: 'Hilda', category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'WHT', setNumber: '171', localSetId: 'sv10pt5w' },
  'hilda tef':              { id: 'TEF-195', name: 'Hilda', category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'TEF', setNumber: '195', localSetId: 'sv5' },
  'hilda':                  { id: 'WHT-171', name: 'Hilda', category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'WHT', setNumber: '171', localSetId: 'sv10pt5w' },
  'pokegear 3.0 unb':       { id: 'UNB-233', name: 'Pokégear 3.0', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'UNB', setNumber: '233', localSetId: 'sm10' },
  'pokegear 3.0 svi':       { id: 'SVI-186', name: 'Pokégear 3.0', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '186', localSetId: 'sv1' },
  'pokegear 3.0':           { id: 'UNB-233', name: 'Pokégear 3.0', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'UNB', setNumber: '233', localSetId: 'sm10' },
  'pokegear 30':            { id: 'UNB-233', name: 'Pokégear 3.0', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'UNB', setNumber: '233', localSetId: 'sm10' },
  'poke pad por':           { id: 'POR-113', name: 'Poké Pad', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'POR', setNumber: '113', localSetId: 'me3' },
  'poke pad':               { id: 'POR-113', name: 'Poké Pad', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'POR', setNumber: '113', localSetId: 'me3' },
  'clavell':                { id: 'SVI-177', name: 'Clavell', category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '177', localSetId: 'sv1' },
  'plinio':                 { id: 'SVI-177', name: 'Clavell', category: 'supporter', stage: 'TREINADOR', imageUrl: '', setCode: 'SVI', setNumber: '177', localSetId: 'sv1' },
  'unfair stamp':           { id: 'TWM-165', name: 'Unfair Stamp', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TWM', setNumber: '165', localSetId: 'sv6' },
  'carimbo da injustica':   { id: 'TWM-165', name: 'Unfair Stamp', category: 'item', stage: 'TREINADOR', imageUrl: '', setCode: 'TWM', setNumber: '165', localSetId: 'sv6' },
  'risky ruins':            { id: 'TWM-168', name: 'Risky Ruins', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'TWM', setNumber: '168', localSetId: 'sv6' },
  'ruinas arriscadas':      { id: 'TWM-168', name: 'Risky Ruins', category: 'stadium', stage: 'TREINADOR', imageUrl: '', setCode: 'TWM', setNumber: '168', localSetId: 'sv6' },

  // ----- Energies -----
  'basic fire energy':      { id: 'SVE-2', name: 'Basic Fire Energy',      category: 'energy', energyType: 'fire',      stage: 'ENERGIA', imageUrl: '', setCode: 'SVE', setNumber: '2', localSetId: 'sve' },
  'basic psychic energy':   { id: 'SVE-5', name: 'Basic Psychic Energy',   category: 'energy', energyType: 'psychic',   stage: 'ENERGIA', imageUrl: '', setCode: 'SVE', setNumber: '5', localSetId: 'sve' },
  'basic water energy':     { id: 'SVE-3', name: 'Basic Water Energy',     category: 'energy', energyType: 'water',     stage: 'ENERGIA', imageUrl: '', setCode: 'SVE', setNumber: '3', localSetId: 'sve' },
  'basic lightning energy': { id: 'SVE-4', name: 'Basic Lightning Energy', category: 'energy', energyType: 'lightning', stage: 'ENERGIA', imageUrl: '', setCode: 'SVE', setNumber: '4', localSetId: 'sve' },
  'basic fighting energy':  { id: 'SVE-6', name: 'Basic Fighting Energy',  category: 'energy', energyType: 'fighting',  stage: 'ENERGIA', imageUrl: '', setCode: 'SVE', setNumber: '6', localSetId: 'sve' },
  'basic darkness energy':  { id: 'SVE-7', name: 'Basic Darkness Energy',  category: 'energy', energyType: 'darkness',  stage: 'ENERGIA', imageUrl: '', setCode: 'SVE', setNumber: '7', localSetId: 'sve' },
  'basic metal energy':     { id: 'SVE-8', name: 'Basic Metal Energy',     category: 'energy', energyType: 'metal',     stage: 'ENERGIA', imageUrl: '', setCode: 'SVE', setNumber: '8', localSetId: 'sve' },
  'basic grass energy':     { id: 'SVE-1', name: 'Basic Grass Energy',     category: 'energy', energyType: 'grass',     stage: 'ENERGIA', imageUrl: '', setCode: 'SVE', setNumber: '1', localSetId: 'sve' },
  'double turbo energy':    { id: 'BRS-151', name: 'Double Turbo Energy',  category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'BRS', setNumber: '151', localSetId: 'swsh9' },
  'prism energy asc':       { id: 'ASC-216', name: 'Prism Energy',         category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'ASC', setNumber: '216', localSetId: 'me2pt5' },
  'prism energy tef':       { id: 'TEF-203', name: 'Prism Energy',         category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'TEF', setNumber: '203', localSetId: 'sv5' },
  'prism energy':           { id: 'ASC-216', name: 'Prism Energy',         category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'ASC', setNumber: '216', localSetId: 'me2pt5' },
  'energia de prisma':      { id: 'ASC-216', name: 'Prism Energy',         category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'ASC', setNumber: '216', localSetId: 'me2pt5' },
  'mist energy tef':        { id: 'TEF-161', name: 'Mist Energy',          category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'TEF', setNumber: '161', localSetId: 'sv5' },
  'mist energy':            { id: 'TEF-161', name: 'Mist Energy',          category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'TEF', setNumber: '161', localSetId: 'sv5' },
  'energia nebulosa':       { id: 'TEF-161', name: 'Mist Energy',          category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'TEF', setNumber: '161', localSetId: 'sv5' },
  'enriching energy ssp':   { id: 'SSP-191', name: 'Enriching Energy',     category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'SSP', setNumber: '191', localSetId: 'sv8' },
  'enriching energy':       { id: 'SSP-191', name: 'Enriching Energy',     category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'SSP', setNumber: '191', localSetId: 'sv8' },
  'energia enriquecedora':  { id: 'SSP-191', name: 'Enriching Energy',     category: 'energy', energyType: 'colorless', stage: 'ENERGIA', imageUrl: '', setCode: 'SSP', setNumber: '191', localSetId: 'sv8' },
};

Object.values(CARD_IMAGE_DATABASE).forEach(card => {
  if (card.setCode && card.setNumber) {
    const cardId = `${card.setCode.toUpperCase()}-${card.setNumber}`;
    
    // 1. Tenta o override manual primeiro (NOVO)
    if (CARD_IMAGE_OVERRIDES[cardId]) {
      card.imageUrl = CARD_IMAGE_OVERRIDES[cardId];
    } else {
      // 2. Se não tiver override, tenta achar na API externa
      const url = getBestImageUrl(card.setCode, card.setNumber);
      if (url) card.imageUrl = url;
    }
  }
});

// ============================================================================
// CARD_ALIASES
// ============================================================================

export const CARD_ALIASES: Record<string, string> = {
  'rotom ventilador':        'fan rotom',
  'clefairy ex da lilian':   "lillie's clefairy ex",
  'clefairy ex de lilian':   "lillie's clefairy ex",
  'lillies clefairy ex':     "lillie's clefairy ex",
  'lillies clefairy':        "lillie's clefairy ex",
  'clefairy da lilian':      "lillie's clefairy ex",
  'garchomp ex da cynthia':  "cynthia's garchomp ex",
  'garchomp ex de cynthia':  "cynthia's garchomp ex",
  'garchomp da cynthia':     "cynthia's garchomp ex",
  'cynthias garchomp ex':    "cynthia's garchomp ex",
  'cynthias garchomp':       "cynthia's garchomp ex",
  'cynthia garchomp ex':     "cynthia's garchomp ex",
  'cynthia garchomp':        "cynthia's garchomp ex",
  'gabite da cynthia':       "cynthia's gabite",
  'cynthias gabite':         "cynthia's gabite",
  'gible da cynthia':        "cynthia's gible",
  'cynthias gible':          "cynthia's gible",
  'roserade da cynthia':     "cynthia's roserade",
  'cynthias roserade':       "cynthia's roserade",
  'ambicao da cynthia':      "cynthia's ambition",
  'mega lopunny':            'mega lopunny ex',

  'ultra bola':              'ultra ball',
  'bola ninho':              'nest ball',
  'doce raro':               'rare candy',
  'supervara':               'super rod',
  'pegador primordial':      'prime catcher',
  'pegador de revanche':     'counter catcher',
  'maca noturna':            'night stretcher',
  'poffin de companheiro':   'buddy-buddy poffin',
  'poffin de colega':        'buddy-buddy poffin',
  'pedaco de poffin de companheiro': 'buddy-buddy poffin',
  'torre interferente':      'jamming tower',
  'subterraneo da area zero':'area zero underdepths',
  'centro neutro':           'neutral center',
  'ordens da chefia':        "boss's orders",
  'ordem da chefia':         "boss's orders",
  'pesquisa de professores': "professor's research",
  'pokeparada':              'pokestop',
  'compaixao do wally':      "wally's compassion",
  'jaula de batalha':        'battle cage',
  'martelo esmagador':       'crushing hammer',
  'determinacao da lilian':  "lillie's determination",
  'cartao vermelho especial':'special red card',
  'balao de ar':             'air balloon',
  'pokegear 30':             'pokegear 3.0',
  'plinio':                  'clavell',
  'carimbo da injustica':    'unfair stamp',
  'ruinas arriscadas':       'risky ruins',

  'energia de fogo basica':        'basic fire energy',
  'energia de fogo':               'basic fire energy',
  'energia fogo basica':           'basic fire energy',
  'energia psiquica basica':       'basic psychic energy',
  'energia psiquica':              'basic psychic energy',
  'energia psiquico basica':       'basic psychic energy',
  'energia de agua basica':        'basic water energy',
  'energia de agua':               'basic water energy',
  'energia de raios basica':       'basic lightning energy',
  'energia de raios':              'basic lightning energy',
  'energia de luta basica':        'basic fighting energy',
  'energia de luta':               'basic fighting energy',
  'energia de escuridao basica':   'basic darkness energy',
  'energia de escuridao':          'basic darkness energy',
  'energia escuridao basica':      'basic darkness energy',
  'energia de planta basica':      'basic grass energy',
  'energia de planta':             'basic grass energy',
  'energia de prisma':             'prism energy',
  'energia nebulosa':              'mist energy',
  'energia enriquecedora':         'enriching energy',
};

// ============================================================================
// POKEMON DEX MAP
// ============================================================================

export const POKEMON_DEX_MAP: Record<string, number> = {
  'charizard': 6, 'charmander': 4, 'charmeleon': 5,
  'pidgeot': 18, 'pidgey': 16, 'pidgeotto': 17,
  'duskull': 355, 'dusclops': 356, 'dusknoir': 477,
  'dreepy': 885, 'drakloak': 886, 'dragapult': 887,
  'rotom': 479, 'fezandipiti': 1016, 'manaphy': 490,
  'alakazam': 65, 'lugia': 249, 'archeops': 567,
  'gardevoir': 282, 'kirlia': 281, 'ralts': 280,
  'munkidori': 1015, 'miraidon': 1008, 'koraidon': 1007,
  'snorlax': 143, 'pikachu': 25, 'ceruledge': 937,
  'comfey': 764, 'sableye': 302, 'cramorant': 845,
  'greninja': 658, 'mew': 151, 'palkia': 484,
  'regidrago': 895, 'scizor': 212, 'scyther': 123,
  'gholdengo': 1000, 'gimmighoul': 999,
  'bibarel': 400, 'bidoof': 399,
  'noctowl': 164, 'hoothoot': 163, 'bouffalant': 626,
  'budew': 406, 'absol': 359, 'lumineon': 457, 'crobat': 169,
  'dunsparce': 206, 'dudunsparce': 982,
  'buneary': 427, 'lopunny': 428,
  'tandemaus': 924, 'maushold': 925,
  'stunfisk': 618, 'psyduck': 54, 'meowth': 52,
  'moltres': 146,
};

// ============================================================================
// NORMALIZATION
// ============================================================================

export function normalizeCardName(name: string): string {
  if (!name) return '';
  let cleaned = name.toLowerCase().trim();
  cleaned = cleaned.replace(/\s+(?:de|do|da|of)\s+[a-z0-9\s]+$/i, '');
  cleaned = cleaned.replace(/^(?:jogou|colocou|comprou|ligou|anexou|evoluiu|played|put|attached|drew|evolved)\s+/i, '');
  cleaned = cleaned.replace(/\s+(?:no campo ativo|no banco|to the active spot|to the bench|in the active spot).*/i, '');
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  cleaned = cleaned.replace(/[^a-z0-9\s-]/g, '').trim();
  return cleaned;
}

export function getBasePokemonName(name: string): string {
  if (!name) return 'substitute';
  return sanitizePokemonCreatureName(name);
}

// ============================================================================
// PTCGL CARD ID REGISTRY
// ============================================================================

export const PTCGL_CARD_ID_MAP: Record<string, CardMetadata> = {};

function registerCardId(key: string, card: CardMetadata | undefined) {
  if (!key || !card) return;
  const k = key.toLowerCase().trim();
  if (!PTCGL_CARD_ID_MAP[k]) PTCGL_CARD_ID_MAP[k] = card;
  const k2 = k.replace(/\s+/g, '-');
  if (!PTCGL_CARD_ID_MAP[k2]) PTCGL_CARD_ID_MAP[k2] = card;
  const k3 = k.replace(/-/g, ' ');
  if (!PTCGL_CARD_ID_MAP[k3]) PTCGL_CARD_ID_MAP[k3] = card;
  const k4 = k.replace(/[^a-z0-9]/g, '');
  if (!PTCGL_CARD_ID_MAP[k4]) PTCGL_CARD_ID_MAP[k4] = card;
}

Object.values(CARD_IMAGE_DATABASE).forEach(card => {
  if (!card) return;
  if (card.setCode && card.setNumber) {
    const tpci = normalizeTPCiSetCode(card.setCode);
    const num = String(card.setNumber).replace(/^#/, '').trim();
    card.id = `${tpci}-${num}`;
    registerCardId(`${tpci}-${num}`, card);
    registerCardId(`${tpci} ${num}`, card);
    registerCardId(`${tpci} #${num}`, card);
    const local = card.localSetId || mapTPCiToLocalSetId(tpci);
    if (local) registerCardId(`${local}-${num}`, card);
    if (local) registerCardId(`${local} ${num}`, card);
  }
});

// ============================================================================
// FORMAT PTCGL
// ============================================================================

export interface FormattedPTCGLCard {
  canonicalCode: string;
  setCode: string;
  tpciSetCode: string;
  setNumber: string;
  displayName: string;
  ptcglIdentifier: string;
  localSetId?: string;
  rawLocalId?: string;
}

export function convertLocalIdToPTCGL(
  localCardOrId: string | { id?: string; setCode?: string; setNumber?: string | number; name?: string; setName?: string },
  fallbackName?: string
): FormattedPTCGLCard {
  if (typeof localCardOrId === 'object' && localCardOrId !== null) {
    const rawSet = localCardOrId.setCode || 'SVI';
    const tpciSetCode = normalizeTPCiSetCode(rawSet);
    const localSetId = mapTPCiToLocalSetId(tpciSetCode);
    const rawNum = String(localCardOrId.setNumber || '1').replace(/^#/, '').trim();
    const displayName = localCardOrId.name || fallbackName || 'Carta Pokémon';
    const canonicalCode = `${tpciSetCode} ${rawNum}`;
    return {
      canonicalCode, setCode: tpciSetCode, tpciSetCode, setNumber: rawNum,
      displayName, ptcglIdentifier: `${displayName} ${canonicalCode}`,
      localSetId, rawLocalId: localCardOrId.id
    };
  }

  const rawStr = String(localCardOrId || '').trim();
  if (!rawStr) {
    return {
      canonicalCode: 'SVI 1', setCode: 'SVI', tpciSetCode: 'SVI', setNumber: '1',
      displayName: fallbackName || 'Pokémon',
      ptcglIdentifier: `${fallbackName || 'Pokémon'} SVI 1`,
      localSetId: 'sv1', rawLocalId: ''
    };
  }

  const ptcglExportMatch = rawStr.match(/^(?:(.+?)\s+)?([A-Za-z0-9.]{2,7})\s+(\d+|promo)$/i);
  if (ptcglExportMatch && isKnownTPCiCode(ptcglExportMatch[2])) {
    const detectedName = ptcglExportMatch[1]?.trim();
    const rawSet = ptcglExportMatch[2];
    const rawNum = ptcglExportMatch[3];
    const tpciSetCode = normalizeTPCiSetCode(rawSet);
    const localSetId = mapTPCiToLocalSetId(tpciSetCode);
    const mapped = PTCGL_CARD_ID_MAP[`${tpciSetCode.toLowerCase()} ${rawNum}`]
      || PTCGL_CARD_ID_MAP[`${rawSet.toLowerCase()} ${rawNum}`];
    const displayName = detectedName || mapped?.name || fallbackName || 'Pokémon';
    const canonicalCode = `${tpciSetCode} ${rawNum}`;
    return {
      canonicalCode, setCode: tpciSetCode, tpciSetCode, setNumber: rawNum,
      displayName, ptcglIdentifier: `${displayName} ${canonicalCode}`,
      localSetId, rawLocalId: rawStr
    };
  }

  const hyphenMatch = rawStr.match(/^([a-z0-9.]+)[-_](\d+|promo)$/i);
  if (hyphenMatch) {
    const rawSet = hyphenMatch[1];
    const rawNum = hyphenMatch[2];
    const tpciSetCode = normalizeTPCiSetCode(rawSet);
    const localSetId = mapTPCiToLocalSetId(tpciSetCode);
    const mapped = PTCGL_CARD_ID_MAP[`${rawSet.toLowerCase()}-${rawNum}`]
      || PTCGL_CARD_ID_MAP[`${tpciSetCode.toLowerCase()} ${rawNum}`];
    const displayName = mapped?.name || fallbackName || 'Pokémon';
    const canonicalCode = `${tpciSetCode} ${rawNum}`;
    return {
      canonicalCode, setCode: tpciSetCode, tpciSetCode, setNumber: rawNum,
      displayName, ptcglIdentifier: `${displayName} ${canonicalCode}`,
      localSetId, rawLocalId: rawStr
    };
  }

  const resolved = resolveCardByNameOnly(rawStr);
  const tpciSetCode = normalizeTPCiSetCode(resolved.setCode || 'SVI');
  const localSetId = resolved.localSetId || mapTPCiToLocalSetId(tpciSetCode);
  const setNumber = resolved.setNumber || '1';
  const canonicalCode = `${tpciSetCode} ${setNumber}`;
  return {
    canonicalCode, setCode: tpciSetCode, tpciSetCode, setNumber,
    displayName: resolved.name,
    ptcglIdentifier: `${resolved.name} ${canonicalCode}`,
    localSetId, rawLocalId: rawStr
  };
}

export function formatPTCGLCardCode(cardOrName: CardMetadata | string): FormattedPTCGLCard {
  return convertLocalIdToPTCGL(cardOrName);
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

function makeFallbackCard(originalName: string, norm: string): CardMetadata {
  return {
    id: 'SVI-1',
    name: originalName || 'Pokémon',
    category: 'pokemon',
    stage: norm.includes('ex') ? 'EX' : 'BÁSICO',
    hp: norm.includes('ex') ? 280 : 70,
    imageUrl: POKEMON_CARD_BACK,
    setCode: 'SVI', setNumber: '1', localSetId: 'sv1',
  };
}

function matchesAsWholeWords(haystack: string, needle: string): boolean {
  let start = 0;
  while (start <= haystack.length) {
    const idx = haystack.indexOf(needle, start);
    if (idx === -1) return false;
    const before = idx === 0 ? ' ' : haystack[idx - 1];
    const afterIdx = idx + needle.length;
    const after = afterIdx >= haystack.length ? ' ' : haystack[afterIdx];
    if (/[\s-]/.test(before) && /[\s-]/.test(after)) return true;
    start = idx + 1;
  }
  return false;
}

function fuzzyMatchAsWords(norm: string): CardMetadata | null {
  const keys = Object.keys(CARD_IMAGE_DATABASE).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.length < 4) continue;
    if (matchesAsWholeWords(norm, key)) return CARD_IMAGE_DATABASE[key];
  }
  return null;
}

// ============================================================================
// REGULATION MARK FILTER
// ============================================================================

const STANDARD_ORDER: string[] = [
  'PBL', 'CRI', 'POR', 'ASC', 'PFL', 'MEG',
  'WHT', 'BLK', 'DRI', 'JTG', 'PRE', 'SSP', 'SCR', 'SFA', 'TWM', 'TEF',
  'PAF', 'PAR', 'MEW', 'OBF', 'PAL', 'SVI',
  '30TH', '30C', '30TH-C',
  'CRZ', 'SIT', 'LOR', 'ASR', 'BRS',
];

export function resolveCardStandardPreferred(name: string): CardMetadata {
  if (!name) return makeFallbackCard(name, '');

  const norm = normalizeCardName(name);

  const candidates: CardMetadata[] = [];
  for (const card of Object.values(CARD_IMAGE_DATABASE)) {
    if (normalizeCardName(card.name) === norm) {
      candidates.push(card);
    }
  }

  if (candidates.length === 0) return makeFallbackCard(name, norm);

  const legal = candidates.filter(c => !c.setCode || isSetStandardLegal(c.setCode));
  const pool = legal.length > 0 ? legal : candidates;

  pool.sort((a, b) => {
    const ai = STANDARD_ORDER.indexOf((a.setCode || '').toUpperCase());
    const bi = STANDARD_ORDER.indexOf((b.setCode || '').toUpperCase());
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return pool[0];
}

// ============================================================================
// GLOBAL COLLECTION REGISTRY
// ============================================================================

const COLLECTION_CARDS_REGISTRY: Map<string, CardMetadata> = new Map();

export function registerCollectionCards(cards: Array<any>): void {
  if (!cards || !Array.isArray(cards)) return;

  for (const c of cards) {
    if (!c) continue;
    const rawName = c.name || '';
    if (!rawName) continue;

    const norm = normalizeCardName(rawName);
    const cleanSet = String(c.setCode || c.ptcglCode || c.tpciSetCode || '').toUpperCase();
    const rawNum = String(c.setNumber ?? c.number ?? c.cleanNumber ?? '').trim();
    const cleanNum = rawNum.replace(/^0+/, '') || '1';
    const localSet = c.localSetId || (cleanSet ? mapTPCiToLocalSetId(cleanSet) : '');

    // ORB-SAFE: ptcgIo → Limitless → TCGdex
    let finalImageUrl = '';
    if (cleanSet && cleanNum && cleanSet !== 'SVI' && cleanNum !== '1') {
      finalImageUrl = getBestImageUrl(cleanSet, cleanNum);
    }
    if (!finalImageUrl && c.imageUrl && !isSpriteUrl(c.imageUrl)) {
      finalImageUrl = c.imageUrl;
    }
    if (finalImageUrl.startsWith('https://assets.tcgdex.net/') &&
        !finalImageUrl.endsWith('.webp') &&
        !finalImageUrl.endsWith('.png')) {
      finalImageUrl = `${finalImageUrl}/high.webp`;
    }

    const cardMeta: CardMetadata = {
      id: c.id || `${cleanSet}-${cleanNum}`,
      name: rawName,
      category: c.category || (
        norm.includes('energia') || norm.includes('energy')
          ? 'energy'
          : (norm.includes('poi') || norm.includes('arven') || norm.includes('iono') ||
             norm.includes('pesquisa') || norm.includes('ordem') || norm.includes('troca'))
            ? 'supporter'
            : 'pokemon'
      ),
      imageUrl: finalImageUrl || POKEMON_CARD_BACK,
      setCode: cleanSet,
      setNumber: rawNum || cleanNum,
      localSetId: localSet,
      isFromCollection: true,
      collectionScanUrl: finalImageUrl
    };

    COLLECTION_CARDS_REGISTRY.set(norm, cardMeta);

    if (cleanSet && cleanNum) {
      COLLECTION_CARDS_REGISTRY.set(`${cleanSet.toLowerCase()} ${cleanNum.toLowerCase()}`, cardMeta);
      COLLECTION_CARDS_REGISTRY.set(`${cleanSet.toLowerCase()}-${cleanNum.toLowerCase()}`, cardMeta);
      if (rawNum && rawNum !== cleanNum) {
        COLLECTION_CARDS_REGISTRY.set(`${cleanSet.toLowerCase()} ${rawNum.toLowerCase()}`, cardMeta);
        COLLECTION_CARDS_REGISTRY.set(`${cleanSet.toLowerCase()}-${rawNum.toLowerCase()}`, cardMeta);
      }
      COLLECTION_CARDS_REGISTRY.set(`${norm} ${cleanSet.toLowerCase()} ${cleanNum.toLowerCase()}`, cardMeta);
    }
  }
}

export function getRegisteredCollectionCardsCount(): number {
  return COLLECTION_CARDS_REGISTRY.size;
}

// ============================================================================
// VALIDAÇÃO: rejeita entradas da coleção que divergem do DB canônico
//
// Regras:
//   1. Nome da carta precisa bater com o input
//   2. Se (set, number) do coleção aponta para OUTRA carta no registry → rejeita
//   3. Se (set, number) do coleção DIVERGE do DB canônico → rejeita
//      (isso força o uso da versão correta do DB: SFA 038 em vez de SFA 096)
// ============================================================================

export function getRegisteredCollectionCard(nameOrCode: string): CardMetadata | undefined {
  if (!nameOrCode) return undefined;
  const raw = nameOrCode.trim();
  const norm = normalizeCardName(raw);

  const validate = (card: CardMetadata | undefined): CardMetadata | undefined => {
    if (!card) return undefined;

    // 1. Nome bate?
    if (normalizeCardName(card.name) !== norm) return undefined;

    // 2. (set, number) aponta para OUTRA carta no registry? Rejeita.
    if (card.setCode && card.setNumber) {
      const num = String(card.setNumber).replace(/^#/, '').replace(/^0+/, '') || '1';
      const key1 = `${card.setCode.toLowerCase()} ${num}`;
      const key2 = `${card.setCode.toLowerCase()}-${num}`;
      const canonical = PTCGL_CARD_ID_MAP[key1] || PTCGL_CARD_ID_MAP[key2];
      if (canonical && normalizeCardName(canonical.name) !== norm) {
        return undefined;
      }
    }

    // 3. DB canônica tem essa carta com (set, number) DIFERENTE? Rejeita.
    //    Isso é o fix principal: força o uso da versão correta do DB.
    const dbEntry = CARD_IMAGE_DATABASE[norm];
    if (dbEntry?.setCode && dbEntry?.setNumber && card.setCode && card.setNumber) {
      const dbSet = String(dbEntry.setCode).toUpperCase();
      const cardSet = String(card.setCode).toUpperCase();
      const dbNum = String(dbEntry.setNumber).replace(/^0+/, '');
      const cardNum = String(card.setNumber).replace(/^0+/, '');
      if (dbSet !== cardSet || dbNum !== cardNum) {
        return undefined;
      }
    }

    return card;
  };

  const tryGet = (key: string) => validate(COLLECTION_CARDS_REGISTRY.get(key));

  const direct = tryGet(norm);
  if (direct) return direct;

  const alias = CARD_ALIASES[norm];
  if (alias) {
    const viaAlias = tryGet(alias);
    if (viaAlias) return viaAlias;
  }

  const viaClean = tryGet(raw.toLowerCase());
  if (viaClean) return viaClean;

  const cleanId = raw.toLowerCase().replace(/[^a-z0-9.-]/g, '');
  const viaId = tryGet(cleanId);
  if (viaId) return viaId;

  for (const [k, v] of COLLECTION_CARDS_REGISTRY.entries()) {
    if (k.length >= 4 && matchesAsWholeWords(norm, k)) {
      const valid = validate(v);
      if (valid) return valid;
    }
  }

  return undefined;
}

// ============================================================================
// RESOLVER
// ============================================================================

export function resolveCardByNameOnly(name: string): CardMetadata {
  if (!name) return makeFallbackCard(name, '');

  const fromCollection = getRegisteredCollectionCard(name);
  if (fromCollection && fromCollection.imageUrl && !isSpriteUrl(fromCollection.imageUrl)) {
    return fromCollection;
  }

  const preferred = resolveCardStandardPreferred(name);
  if (preferred && preferred.id !== 'SVI-1') return preferred;

  const cleanId = name.toLowerCase().trim().replace(/[^a-z0-9.-]/g, '');
  if (PTCGL_CARD_ID_MAP[cleanId]) return PTCGL_CARD_ID_MAP[cleanId];
  const cleanSpaced = name.toLowerCase().trim();
  if (PTCGL_CARD_ID_MAP[cleanSpaced]) return PTCGL_CARD_ID_MAP[cleanSpaced];

  const compound = name.match(/^(.+?)\s+(?:\[|\()?([a-z0-9.]+)[-# ]+(\d+)(?:\]|\))?$/i);
  if (compound && isKnownTPCiCode(compound[2])) {
    const rawSet = compound[2].toLowerCase();
    const num = compound[3];
    const tpci = normalizeTPCiSetCode(compound[2]);
    if (PTCGL_CARD_ID_MAP[`${rawSet}-${num}`]) return PTCGL_CARD_ID_MAP[`${rawSet}-${num}`];
    if (PTCGL_CARD_ID_MAP[`${tpci.toLowerCase()} ${num}`]) return PTCGL_CARD_ID_MAP[`${tpci.toLowerCase()} ${num}`];
  }

  const norm = normalizeCardName(name);
  if (CARD_IMAGE_DATABASE[norm]) return CARD_IMAGE_DATABASE[norm];

  const aliasTarget = CARD_ALIASES[norm];
  if (aliasTarget && CARD_IMAGE_DATABASE[aliasTarget]) {
    return CARD_IMAGE_DATABASE[aliasTarget];
  }

  const normCompound = norm.match(/^(.+?)\s+([a-z]{2,5})[-\s#]+(\d+)$/);
  if (normCompound && isKnownTPCiCode(normCompound[2])) {
    const tpci = normalizeTPCiSetCode(normCompound[2]);
    const key = `${tpci.toLowerCase()} ${normCompound[3]}`;
    if (PTCGL_CARD_ID_MAP[key]) return PTCGL_CARD_ID_MAP[key];
  }

  const fuzzy = fuzzyMatchAsWords(norm);
  if (fuzzy) return fuzzy;

  const aliasKeys = Object.keys(CARD_ALIASES).sort((a, b) => b.length - a.length);
  for (const aliasKey of aliasKeys) {
    if (matchesAsWholeWords(norm, aliasKey)) {
      const target = CARD_ALIASES[aliasKey];
      if (CARD_IMAGE_DATABASE[target]) return CARD_IMAGE_DATABASE[target];
    }
  }

  return makeFallbackCard(name, norm);
}

export function parsePTCGLLogLine(line: string): FormattedPTCGLCard | null {
  if (!line) return null;
  let text = line.trim();

  text = text.replace(
    /^(?:o\s+)?(?:jogador\s+\S+\s+)?(?:jogou|colocou|comprou|ligou|anexou|evoluiu|descarte|procurou|embaralhou|usou|jogador|jogadora|player)\s+/i,
    ''
  );
  text = text.replace(
    /^(?:played|put|attached|drew|evolved|discarded|searched|shuffled|used)\s+/i,
    ''
  );
  text = text.replace(
    /\s+(?:no campo ativo|no banco|para o campo ativo|para o banco|to the active spot|to the bench|in the active spot|to the bench).*$/i,
    ''
  );
  text = text.replace(/\s+(?:a|ao|à|para)\s+[A-Za-zÀ-ÿ0-9 .'-]{2,}$/i, '');
  text = text.replace(/\s+(?:de|do|da|of)\s+[A-Za-zÀ-ÿ0-9 .'-]{2,}$/i, '');
  text = text.trim();

  const compound = text.match(/^(?:(.+?)\s+)?([A-Za-z]{2,5})[-\s#]+(\d{1,4})$/);
  if (compound && isKnownTPCiCode(compound[2])) {
    const tpciSetCode = normalizeTPCiSetCode(compound[2]);
    const setNumber = compound[3];
    const detectedName = compound[1]?.trim();
    const mapped = PTCGL_CARD_ID_MAP[`${tpciSetCode.toLowerCase()} ${setNumber}`]
      || PTCGL_CARD_ID_MAP[`${compound[2].toLowerCase()} ${setNumber}`];
    const displayName = detectedName || mapped?.name || 'Pokémon';
    const canonicalCode = `${tpciSetCode} ${setNumber}`;
    return {
      canonicalCode, setCode: tpciSetCode, tpciSetCode, setNumber,
      displayName, ptcglIdentifier: `${displayName} ${canonicalCode}`,
      localSetId: mapped?.localSetId || mapTPCiToLocalSetId(tpciSetCode),
      rawLocalId: line
    };
  }

  const hyphen = text.match(/([a-z0-9.]+)[-_](\d{1,4})$/i);
  if (hyphen && findSet(hyphen[1])) {
    const entry = findSet(hyphen[1])!;
    const tpciSetCode = entry.tpci;
    const rawNum = hyphen[2];
    const mapped = PTCGL_CARD_ID_MAP[`${hyphen[1].toLowerCase()}-${rawNum}`]
      || PTCGL_CARD_ID_MAP[`${tpciSetCode.toLowerCase()} ${rawNum}`];
    const displayName = mapped?.name || 'Pokémon';
    const canonicalCode = `${tpciSetCode} ${rawNum}`;
    return {
      canonicalCode, setCode: tpciSetCode, tpciSetCode, setNumber: rawNum,
      displayName, ptcglIdentifier: `${displayName} ${canonicalCode}`,
      localSetId: mapped?.localSetId || mapTPCiToLocalSetId(tpciSetCode),
      rawLocalId: line
    };
  }

  const resolved = resolveCardByNameOnly(text);
  if (resolved.setCode && resolved.setNumber && resolved.id !== 'SVI-1') {
    const tpci = normalizeTPCiSetCode(resolved.setCode);
    const canonicalCode = `${tpci} ${resolved.setNumber}`;
    return {
      canonicalCode, setCode: tpci, tpciSetCode: tpci, setNumber: resolved.setNumber,
      displayName: resolved.name, ptcglIdentifier: `${resolved.name} ${canonicalCode}`,
      localSetId: resolved.localSetId || mapTPCiToLocalSetId(tpci),
      rawLocalId: line
    };
  }
  return null;
}

export function resolvePTCGLCard(name: string): CardMetadata {
  if (!name) return makeFallbackCard(name, '');

  const fromCollection = getRegisteredCollectionCard(name);
  if (fromCollection && fromCollection.imageUrl && !isSpriteUrl(fromCollection.imageUrl)) {
    return fromCollection;
  }

  const preferred = resolveCardStandardPreferred(name);
  if (preferred && preferred.id !== 'SVI-1') return preferred;

  const cleanId = name.toLowerCase().trim().replace(/[^a-z0-9.-]/g, '');
  if (PTCGL_CARD_ID_MAP[cleanId]) return PTCGL_CARD_ID_MAP[cleanId];
  const cleanSpaced = name.toLowerCase().trim();
  if (PTCGL_CARD_ID_MAP[cleanSpaced]) return PTCGL_CARD_ID_MAP[cleanSpaced];

  const structMatch = name.match(/^(?:(.+?)\s+)?([A-Za-z]{2,5})[-\s#]+(\d{1,4})$/);
  if (structMatch && isKnownTPCiCode(structMatch[2])) {
    const tpciSetCode = normalizeTPCiSetCode(structMatch[2]);
    const setNumber = structMatch[3];
    const key = `${tpciSetCode.toLowerCase()} ${setNumber}`;
    const direct = PTCGL_CARD_ID_MAP[key]
      || PTCGL_CARD_ID_MAP[`${structMatch[2].toLowerCase()} ${setNumber}`];
    if (direct) return direct;
  }

  const compound = name.match(/^(.+?)\s+(?:\[|\()?([a-z0-9.]+)[-# ]+(\d+)(?:\]|\))?$/i);
  if (compound && isKnownTPCiCode(compound[2])) {
    const rawSet = compound[2].toLowerCase();
    const num = compound[3];
    const tpci = normalizeTPCiSetCode(compound[2]);
    if (PTCGL_CARD_ID_MAP[`${rawSet}-${num}`]) return PTCGL_CARD_ID_MAP[`${rawSet}-${num}`];
    if (PTCGL_CARD_ID_MAP[`${tpci.toLowerCase()} ${num}`]) return PTCGL_CARD_ID_MAP[`${tpci.toLowerCase()} ${num}`];
  }

  const hyphen = name.match(/^([a-z0-9.]+)[-_](\d+)$/i);
  if (hyphen) {
    const rawSet = hyphen[1].toLowerCase();
    const num = hyphen[2];
    const entry = findSet(rawSet);
    if (entry) {
      const tpci = entry.tpci;
      const direct = PTCGL_CARD_ID_MAP[`${rawSet}-${num}`]
        || PTCGL_CARD_ID_MAP[`${tpci.toLowerCase()} ${num}`];
      if (direct) return direct;
    }
  }

  return resolveCardByNameOnly(name);
}

export const resolveCard = resolvePTCGLCard;

export function isSpriteUrl(url?: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('/sprites/') ||
    lower.includes('official-artwork') ||
    lower.includes('pokemonshowdown.com') ||
    lower.endsWith('poke-ball.png') ||
    lower.endsWith('ultra-ball.png') ||
    lower.endsWith('nest-ball.png') ||
    lower.endsWith('rare-candy.png') ||
    lower.endsWith('poffin-case.png') ||
    lower.endsWith('master-ball.png') ||
    (lower.includes('/items/') && lower.includes('pokeapi'))
  );
}

export interface SpriteSources {
  primary: string;
  artwork: string;
  battleSprite: string;
  dexSprite: string;
  fallback: string;
}

export function getAuthenticCardImageUrl(cardOrName: any): string {
  if (!cardOrName) return POKEMON_CARD_BACK;

  if (typeof cardOrName === 'string') {
    const card = resolvePTCGLCard(cardOrName);
    if (card?.imageUrl && !isSpriteUrl(card.imageUrl)) {
      let img = card.imageUrl;
      if (img.startsWith('https://assets.tcgdex.net/') && !img.endsWith('.webp') && !img.endsWith('.png')) {
        img = `${img}/high.webp`;
      }
      return img;
    }
    return POKEMON_CARD_BACK;
  }

  if (cardOrName.imageUrl && !isSpriteUrl(cardOrName.imageUrl) && cardOrName.imageUrl !== POKEMON_CARD_BACK) {
    let img = cardOrName.imageUrl;
    if (img.startsWith('https://assets.tcgdex.net/') && !img.endsWith('.webp') && !img.endsWith('.png')) {
      img = `${img}/high.webp`;
    }
    return img;
  }

  const setCode = String(cardOrName.setCode || cardOrName.set || cardOrName.ptcglCode || '').trim();
  const setNumber = cardOrName.setNumber ?? cardOrName.number ?? cardOrName.localId;

  if (setCode && setNumber !== undefined && setNumber !== null) {
    const hierarchy = buildImageHierarchy(setCode, setNumber, 'pt');
    if (hierarchy.primary && hierarchy.primary !== POKEMON_CARD_BACK) {
      return hierarchy.primary;
    }
  }

  if (cardOrName.name) {
    const norm = normalizeCardName(cardOrName.name);
    const db = CARD_IMAGE_DATABASE[norm];
    if (db?.imageUrl && !isSpriteUrl(db.imageUrl)) return db.imageUrl;
    const resolved = resolveCardByNameOnly(cardOrName.name);
    if (resolved?.imageUrl && !isSpriteUrl(resolved.imageUrl)) return resolved.imageUrl;
  }
  return POKEMON_CARD_BACK;
}

export function getCardScanHierarchy(cardOrName: any): {
  primary: string; secondary: string; tertiary: string; quaternary: string; fallback: string;
} {
  if (typeof cardOrName === 'object' && cardOrName !== null) {
    const set = String(cardOrName.setCode || cardOrName.set || cardOrName.ptcglCode || '').trim();
    const num = cardOrName.setNumber ?? cardOrName.number ?? cardOrName.localId;
    if (set && num !== undefined && num !== null) {
      const h = buildImageHierarchy(set, num, 'pt');
      if (cardOrName.imageUrl && !isSpriteUrl(cardOrName.imageUrl) && cardOrName.imageUrl !== POKEMON_CARD_BACK) {
        let directUrl = cardOrName.imageUrl;
        if (directUrl.startsWith('https://assets.tcgdex.net/') && !directUrl.endsWith('.webp') && !directUrl.endsWith('.png')) {
          directUrl = `${directUrl}/high.webp`;
        }
        return {
          primary: directUrl,
          secondary: h.primary !== directUrl ? h.primary : h.secondary,
          tertiary: h.secondary !== directUrl ? h.secondary : h.tertiary,
          quaternary: h.quaternary,
          fallback: POKEMON_CARD_BACK
        };
      }
      return h;
    }
  }
  const url = getAuthenticCardImageUrl(cardOrName);
  return {
    primary: url, secondary: url, tertiary: url, quaternary: url,
    fallback: POKEMON_CARD_BACK,
  };
}

export function getPokemonSpriteHierarchy(cardOrName: CardMetadata | string): SpriteSources {
  const card = typeof cardOrName === 'string' ? resolvePTCGLCard(cardOrName) : cardOrName;
  const h = getCardScanHierarchy(card);
  return {
    primary: h.primary,
    artwork: h.secondary,
    battleSprite: h.tertiary,
    dexSprite: h.secondary,
    fallback: POKEMON_CARD_BACK,
  };
}

export interface PTCGLCardVerification {
  input: string;
  isValid: boolean;
  isPTCGLMapped: boolean;
  card: CardMetadata;
  setCode?: string;
  setNumber?: string;
  resolvedName: string;
  verificationStatus: 'verified_ptcgl' | 'fuzzy_matched' | 'generated_fallback';
}

export function verifyPTCGLCardMapping(cardNameOrId: string): PTCGLCardVerification {
  if (!cardNameOrId) {
    const fallbackCard = resolvePTCGLCard('');
    return {
      input: '', isValid: false, isPTCGLMapped: false, card: fallbackCard,
      resolvedName: 'Pokémon', verificationStatus: 'generated_fallback'
    };
  }
  const clean = cardNameOrId.toLowerCase().trim();
  const cleanId = clean.replace(/[^a-z0-9.-]/g, '');
  if (PTCGL_CARD_ID_MAP[cleanId] || PTCGL_CARD_ID_MAP[clean]) {
    const card = PTCGL_CARD_ID_MAP[cleanId] || PTCGL_CARD_ID_MAP[clean];
    return {
      input: cardNameOrId, isValid: true, isPTCGLMapped: true, card,
      setCode: card.setCode, setNumber: card.setNumber, resolvedName: card.name,
      verificationStatus: 'verified_ptcgl'
    };
  }
  const norm = normalizeCardName(cardNameOrId);
  if (CARD_IMAGE_DATABASE[norm]) {
    const card = CARD_IMAGE_DATABASE[norm];
    return {
      input: cardNameOrId, isValid: true, isPTCGLMapped: !!card.setCode, card,
      setCode: card.setCode, setNumber: card.setNumber, resolvedName: card.name,
      verificationStatus: 'verified_ptcgl'
    };
  }
  const resolved = resolvePTCGLCard(cardNameOrId);
  const isFallback = resolved.id === 'SVI-1' && resolved.imageUrl === POKEMON_CARD_BACK;
  return {
    input: cardNameOrId, isValid: !isFallback,
    isPTCGLMapped: !isFallback && !!resolved.setCode,
    card: resolved, setCode: resolved.setCode, setNumber: resolved.setNumber,
    resolvedName: resolved.name,
    verificationStatus: isFallback ? 'generated_fallback' : 'fuzzy_matched'
  };
}

export function getCardImageUrl(name: string): string {
  return getAuthenticCardImageUrl(name);
}

// ============================================================================
// PLAYER DECK REGISTRY
// ============================================================================

const PLAYER_DECKS: Record<string, Record<string, CardMetadata>> = {};

export function registerPlayerDeck(playerId: string, decklistText: string): void {
  const map: Record<string, CardMetadata> = {};
  const lines = String(decklistText || '').split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!/^\d/.test(line)) continue;

    const m = line.match(/^(\d+)\s+(.+?)\s+([A-Za-z]{2,5})\s+(\d+)(?:\s+[A-Z]+)?$/);
    if (!m) continue;

    const name = m[2].trim();
    const set = m[3].toUpperCase();
    const num = m[4];

    const card =
      PTCGL_CARD_ID_MAP[`${set.toLowerCase()} ${num}`] ||
      PTCGL_CARD_ID_MAP[`${set.toLowerCase()}-${num}`];

    if (card) {
      map[normalizeCardName(name)] = card;
    } else {
      const fallback: CardMetadata = {
        id: `${set}-${num}`,
        name,
        category: 'pokemon',
        imageUrl: '',
        setCode: set,
        setNumber: num,
        localSetId: mapTPCiToLocalSetId(set),
      };
      const url = getBestImageUrl(set, num);
      if (url) fallback.imageUrl = url;
      map[normalizeCardName(name)] = fallback;
    }
  }

  PLAYER_DECKS[playerId] = map;
}

export function resolveCardForPlayer(playerId: string, cardName: string): CardMetadata {
  const deck = PLAYER_DECKS[playerId];
  if (deck) {
    const norm = normalizeCardName(cardName);
    if (deck[norm]) return deck[norm];

    const alias = CARD_ALIASES[norm];
    if (alias && deck[alias]) return deck[alias];

    for (const deckKey of Object.keys(deck)) {
      if (matchesAsWholeWords(norm, deckKey)) return deck[deckKey];
    }
  }
  return resolvePTCGLCard(cardName);
}

export function clearPlayerDecks(): void {
  for (const k of Object.keys(PLAYER_DECKS)) delete PLAYER_DECKS[k];
}

export function getPlayerDeck(playerId: string): Record<string, CardMetadata> {
  return PLAYER_DECKS[playerId] || {};
}

// ============================================================================
// CARD VERSION OVERRIDE (localStorage)
// ============================================================================

const STORAGE_KEY = 'pkmn:card-version-overrides:v1';

interface VersionOverride {
  setCode: string;
  setNumber: string;
  hp?: number;
  retreat?: number;
}

type OverrideStore = Record<string, Record<string, VersionOverride>>;

let _overrideStore: OverrideStore = {};

function loadOverrides(): void {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    _overrideStore = raw ? JSON.parse(raw) : {};
  } catch { _overrideStore = {}; }
}

function saveOverrides(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_overrideStore));
    }
  } catch { /* ignora */ }
}

loadOverrides();

export function setCardVersionForPlayer(
  playerId: string,
  cardName: string,
  setCode: string,
  setNumber: string,
  extra?: { hp?: number; retreat?: number }
): void {
  const key = normalizeCardName(cardName);
  if (!key) return;
  if (!_overrideStore[playerId]) _overrideStore[playerId] = {};
  _overrideStore[playerId][key] = {
    setCode: setCode.toUpperCase(),
    setNumber: String(setNumber).replace(/^#/, '').trim(),
    hp: extra?.hp,
    retreat: extra?.retreat,
  };
  saveOverrides();
}

export function getCardVersionForPlayer(
  playerId: string,
  cardName: string
): CardMetadata | null {
  const key = normalizeCardName(cardName);
  const ov = _overrideStore[playerId]?.[key];
  if (!ov) return null;

  const card =
    PTCGL_CARD_ID_MAP[`${ov.setCode.toLowerCase()} ${ov.setNumber}`] ||
    PTCGL_CARD_ID_MAP[`${ov.setCode.toLowerCase()}-${ov.setNumber}`];

  if (card) return card;

  const localSetId = mapTPCiToLocalSetId(ov.setCode);
  const imageUrl = getBestImageUrl(ov.setCode, ov.setNumber) || POKEMON_CARD_BACK;

  return {
    id: `${ov.setCode}-${ov.setNumber}`,
    name: cardName,
    category: 'pokemon',
    imageUrl,
    setCode: ov.setCode,
    setNumber: ov.setNumber,
    localSetId,
    hp: ov.hp,
  };
}

export function listCardVersionOverrides(playerId: string): Array<{
  cardName: string;
  setCode: string;
  setNumber: string;
  hp?: number;
  retreat?: number;
}> {
  const map = _overrideStore[playerId] || {};
  return Object.entries(map).map(([cardName, ov]) => ({
    cardName,
    setCode: ov.setCode,
    setNumber: ov.setNumber,
    hp: ov.hp,
    retreat: ov.retreat,
  }));
}

export function clearCardVersionOverride(playerId: string, cardName?: string): void {
  if (!_overrideStore[playerId]) return;
  if (cardName) {
    delete _overrideStore[playerId][normalizeCardName(cardName)];
  } else {
    delete _overrideStore[playerId];
  }
  saveOverrides();
}

export function resolveCardWithFullContext(playerId: string, cardName: string): CardMetadata {
  const override = getCardVersionForPlayer(playerId, cardName);
  if (override) return override;
  return resolveCardForPlayer(playerId, cardName);
}
