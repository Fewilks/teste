// ============================================================================
// SERVIÇO DE NORMALIZAÇÃO DE DADOS DE CARTAS POKÉMON (PTCGL FIRST)
// ============================================================================
// Este serviço centraliza a normalização e mapeamento retroativo de cartas
// Pokémon TCG, priorizando sempre a nomenclatura oficial e o ID do Pokémon
// TCG Live (PTCGL). Suporta formatos legados (ex: 'sv3-125', 'me2-5-221',
// IDs do pokemontcg.io e formatos de exportação direta do cliente do jogo).

import { 
  getAuthenticCardImageUrl, 
  getTCGdexImageUrl, 
  POKEMON_CARD_BACK,
  SET_LOCAL_TO_TPCI_MAP,
  SET_TPCI_TO_LOCAL_MAP,
  SET_TO_TCGDEX_MAP
} from '../utils/cardImages';
import { COMPREHENSIVE_SETS } from '../data/pokemonCatalog';
import { CardItem } from '../types';

export interface NormalizedPokemonCard {
  // Identificadores Oficiais do PTCGL (Prioridade Máxima)
  ptcglId: string;              // Ex: "OBF 125", "ASC 085", "SSP 057"
  canonicalCode: string;        // Ex: "OBF 125" (alias de exibição)
  normalizedCardId: string;     // Ex: "OBF-125" (usado para IDs de banco e DOM)
  systemCardId: string;         // Ex: "OBF-125"

  // Metadados Oficiais da Carta
  name: string;                 // Nome oficial em português ou inglês
  setCode: string;              // Código oficial TPCi em maiúsculas (ex: "OBF", "ASC", "TWM")
  localSetId: string;           // Código legado / local (ex: "sv3", "asc", "sv6")
  setName: string;              // Nome completo da coleção (ex: "Obsidian Flames")
  setNumber: string;            // Número oficial da carta (ex: "125", "085")
  cleanNumber: string;          // Número sem zeros à esquerda para rotas de imagem (ex: "125", "85")
  series: string;               // Série (ex: "Mega Evolution", "Scarlet & Violet", "Sword & Shield")
  imageUrl: string;             // Scan de alta resolução autêntico (TCGdex)

  // Rastreabilidade Retroativa
  originalId?: string;          // ID anterior antes da normalização (ex: "sv3-125", "userId_sv3-125")
  isRetroactiveMapped: boolean; // Indica se houve conversão a partir de código legado

  // Campos de Acervo / Usuário (opcionais, quando aplicável)
  quantity?: number;
  isLendable?: boolean;
  ownerId?: string;
  ownerName?: string;
  createdAt?: string;
  category?: 'pokemon' | 'supporter' | 'item' | 'tool' | 'stadium' | 'energy';
}

export interface SetDefinition {
  tpciCode: string;
  name: string;
  localId: string;
  series: string;
  releaseDate?: string;
  aliases: string[];
}

// ----------------------------------------------------------------------------
// 1. DICIONÁRIO COMPLETO DE EXPANSÕES (COM ALIASES E NOMENCLATURA OFICIAL)
// ----------------------------------------------------------------------------
export const OFFICIAL_SETS_REGISTRY: Record<string, SetDefinition> = {
  // --- 30th Anniversary Celebrations ---
  '30TH': {
    tpciCode: '30TH',
    name: 'Celebrações de 30 Anos (30th Anniversary Celebration)',
    localId: '30th',
    series: 'Mega Evolution',
    releaseDate: '2026-02-27',
    aliases: ['30th', '30c', '30-c', 'celebration', 'celebrations', 'celebracoes de 30 anos', '30th celebration', '30th anniversary']
  },
  '30TH-C': {
    tpciCode: '30TH-C',
    name: 'Coleção Clássica de 30 Anos (30th Classic Collection)',
    localId: '30th-c',
    series: 'Mega Evolution',
    releaseDate: '2026-02-27',
    aliases: ['30th-c', '30thc', '30c-c', 'classic collection', 'colecao classica de 30 anos', '30th classic collection']
  },

  // --- Mega Evolution Era (2025-2026) ---
  'ASC': {
    tpciCode: 'ASC',
    name: 'Heróis Excelsos (Ascended Heroes)',
    localId: 'asc',
    series: 'Mega Evolution',
    releaseDate: '2026-01-30',
    aliases: ['asc', 'me2.5', 'me2-5', 'me02.5', 'me025', 'me25', 'ascended heroes', 'herois excelsos']
  },
  'PFL': {
    tpciCode: 'PFL',
    name: 'Fogo Fantasmagórico (Phantasmal Flames)',
    localId: 'pfl',
    series: 'Mega Evolution',
    releaseDate: '2025-11-14',
    aliases: ['pfl', 'me2', 'me02', 'phantasmal flames', 'fogo fantasmagorico']
  },
  'POR': {
    tpciCode: 'POR',
    name: 'Ordem Perfeita (Perfect Order)',
    localId: 'por',
    series: 'Mega Evolution',
    releaseDate: '2026-03-27',
    aliases: ['por', 'me3', 'me03', 'perfect order', 'ordem perfeita']
  },
  'MEG': {
    tpciCode: 'MEG',
    name: 'Mega Evolução (Mega Evolution)',
    localId: 'meg',
    series: 'Mega Evolution',
    releaseDate: '2025-09-05',
    aliases: ['meg', 'me1', 'me01', 'mega evolution', 'mega evolucao']
  },
  'CRI': {
    tpciCode: 'CRI',
    name: 'Caos Ascendente (Chaos Rising)',
    localId: 'cri',
    series: 'Mega Evolution',
    releaseDate: '2026-05-15',
    aliases: ['cri', 'me4', 'me04', 'chaos rising', 'caos ascendente']
  },
  'PBL': {
    tpciCode: 'PBL',
    name: 'Escuridão Total (Pitch Black)',
    localId: 'pbl',
    series: 'Mega Evolution',
    releaseDate: '2026-07-24',
    aliases: ['pbl', 'me5', 'me05', 'pitch black', 'escuridao total']
  },

  // --- Scarlet & Violet Era (2023-2025) ---
  'SVI': {
    tpciCode: 'SVI',
    name: 'Scarlet & Violet',
    localId: 'sv1',
    series: 'Scarlet & Violet',
    releaseDate: '2023-03-31',
    aliases: ['sv1', 'sv01', 'svi', 'scarlet & violet', 'escarlate e violeta']
  },
  'PAL': {
    tpciCode: 'PAL',
    name: 'Paldea Evolved',
    localId: 'sv2',
    series: 'Scarlet & Violet',
    releaseDate: '2023-06-09',
    aliases: ['sv2', 'sv02', 'pal', 'paldea evolved', 'evolucoes em paldea']
  },
  'OBF': {
    tpciCode: 'OBF',
    name: 'Obsidian Flames',
    localId: 'sv3',
    series: 'Scarlet & Violet',
    releaseDate: '2023-08-11',
    aliases: ['sv3', 'sv03', 'obf', 'obsidian flames', 'chamas obsidianas']
  },
  'MEW': {
    tpciCode: 'MEW',
    name: '151 (Scarlet & Violet: 151)',
    localId: 'sv3pt5',
    series: 'Scarlet & Violet',
    releaseDate: '2023-09-22',
    aliases: ['sv3pt5', 'sv3.5', 'sv35', 'mew', '151', 'scarlet & violet 151']
  },
  'PAR': {
    tpciCode: 'PAR',
    name: 'Paradox Rift',
    localId: 'sv4',
    series: 'Scarlet & Violet',
    releaseDate: '2023-11-03',
    aliases: ['sv4', 'sv04', 'par', 'paradox rift', 'fenda paradoxo']
  },
  'PAF': {
    tpciCode: 'PAF',
    name: 'Paldean Fates',
    localId: 'sv45',
    series: 'Scarlet & Violet',
    releaseDate: '2024-01-26',
    aliases: ['sv45', 'sv4pt5', 'sv4.5', 'paf', 'paldean fates', 'destinos de paldea']
  },
  'TEF': {
    tpciCode: 'TEF',
    name: 'Temporal Forces',
    localId: 'sv5',
    series: 'Scarlet & Violet',
    releaseDate: '2024-03-22',
    aliases: ['sv5', 'sv05', 'tef', 'temporal forces', 'forcas temporais']
  },
  'TWM': {
    tpciCode: 'TWM',
    name: 'Twilight Masquerade',
    localId: 'sv6',
    series: 'Scarlet & Violet',
    releaseDate: '2024-05-24',
    aliases: ['sv6', 'sv06', 'twm', 'twilight masquerade', 'mascaras do crepusculo']
  },
  'SFA': {
    tpciCode: 'SFA',
    name: 'Shrouded Fable',
    localId: 'sv6pt5',
    series: 'Scarlet & Violet',
    releaseDate: '2024-08-02',
    aliases: ['sv6pt5', 'sv6.5', 'sv65', 'sfa', 'shrouded fable', 'fabula nebulosa']
  },
  'SCR': {
    tpciCode: 'SCR',
    name: 'Stellar Crown',
    localId: 'sv7',
    series: 'Scarlet & Violet',
    releaseDate: '2024-09-13',
    aliases: ['sv7', 'sv07', 'scr', 'stellar crown', 'coroa estelar']
  },
  'SSP': {
    tpciCode: 'SSP',
    name: 'Surging Sparks',
    localId: 'sv8',
    series: 'Scarlet & Violet',
    releaseDate: '2024-11-08',
    aliases: ['sv8', 'sv08', 'ssp', 'surging sparks', 'faiscas fulgurantes']
  },
  'PRE': {
    tpciCode: 'PRE',
    name: 'Prismatic Evolutions',
    localId: 'sv8pt5',
    series: 'Scarlet & Violet',
    releaseDate: '2025-01-17',
    aliases: ['sv8pt5', 'sv8.5', 'sv85', 'pre', 'prismatic evolutions', 'evolucoes prismaticas']
  },
  'JTG': {
    tpciCode: 'JTG',
    name: 'Journey Together',
    localId: 'sv9',
    series: 'Scarlet & Violet',
    releaseDate: '2025-03-28',
    aliases: ['sv9', 'sv09', 'jtg', 'journey together', 'jornada em conjunto']
  },
  'DRI': {
    tpciCode: 'DRI',
    name: 'Destined Rivals',
    localId: 'sv09.5',
    series: 'Scarlet & Violet',
    releaseDate: '2025-05-30',
    aliases: ['sv9.5', 'sv09.5', 'sv9pt5', 'sv95', 'dri', 'destined rivals', 'rivais destinados']
  },
  'BLK': {
    tpciCode: 'BLK',
    name: 'Black Bolt',
    localId: 'sv10',
    series: 'Scarlet & Violet',
    releaseDate: '2025-08-01',
    aliases: ['sv10', 'blk', 'black bolt', 'raio negro']
  },
  'WHT': {
    tpciCode: 'WHT',
    name: 'White Flare',
    localId: 'sv10.5',
    series: 'Scarlet & Violet',
    releaseDate: '2025-08-01',
    aliases: ['sv10.5', 'sv105', 'wht', 'white flare', 'chama branca']
  },
  'SVP': {
    tpciCode: 'SVP',
    name: 'Scarlet & Violet Promos',
    localId: 'svp',
    series: 'Scarlet & Violet',
    releaseDate: '2023-03-31',
    aliases: ['svp', 'sv-p', 'sv promo', 'pr-sv']
  },
  'SVE': {
    tpciCode: 'SVE',
    name: 'Scarlet & Violet Energies',
    localId: 'sve',
    series: 'Scarlet & Violet',
    releaseDate: '2023-03-31',
    aliases: ['sve', 'energy', 'energias']
  },

  // --- Sword & Shield Era (2020-2023) ---
  'CRZ': {
    tpciCode: 'CRZ',
    name: 'Crown Zenith',
    localId: 'swsh12pt5',
    series: 'Sword & Shield',
    releaseDate: '2023-01-20',
    aliases: ['crz', 'swsh12pt5', 'swsh12.5', 'swsh125', 'crown zenith', 'zenite real']
  },
  'SIT': {
    tpciCode: 'SIT',
    name: 'Silver Tempest',
    localId: 'swsh12',
    series: 'Sword & Shield',
    releaseDate: '2022-11-11',
    aliases: ['sit', 'swsh12', 'silver tempest', 'tempestade prateada']
  },
  'LOR': {
    tpciCode: 'LOR',
    name: 'Lost Origin',
    localId: 'swsh11',
    series: 'Sword & Shield',
    releaseDate: '2022-09-09',
    aliases: ['lor', 'swsh11', 'lost origin', 'origem perdida']
  },
  'PGO': {
    tpciCode: 'PGO',
    name: 'Pokémon GO',
    localId: 'pgo',
    series: 'Sword & Shield',
    releaseDate: '2022-07-01',
    aliases: ['pgo', 'pokemon go']
  },
  'ASR': {
    tpciCode: 'ASR',
    name: 'Astral Radiance',
    localId: 'swsh10',
    series: 'Sword & Shield',
    releaseDate: '2022-05-27',
    aliases: ['asr', 'swsh10', 'astral radiance', 'resplendor astral']
  },
  'BRS': {
    tpciCode: 'BRS',
    name: 'Brilliant Stars',
    localId: 'swsh9',
    series: 'Sword & Shield',
    releaseDate: '2022-02-25',
    aliases: ['brs', 'swsh9', 'brilliant stars', 'astros cintilantes']
  },
  'FST': {
    tpciCode: 'FST',
    name: 'Fusion Strike',
    localId: 'swsh8',
    series: 'Sword & Shield',
    releaseDate: '2021-11-12',
    aliases: ['fst', 'fsi', 'swsh8', 'fusion strike', 'golpe fusao']
  },
  'CEL': {
    tpciCode: 'CEL',
    name: 'Celebrations',
    localId: 'cel',
    series: 'Sword & Shield',
    releaseDate: '2021-10-08',
    aliases: ['cel', 'celebrations', 'celebracoes']
  },
  'EVS': {
    tpciCode: 'EVS',
    name: 'Evolving Skies',
    localId: 'swsh7',
    series: 'Sword & Shield',
    releaseDate: '2021-08-27',
    aliases: ['evs', 'swsh7', 'evolving skies', 'ceus em evolucao']
  },
  'CRE': {
    tpciCode: 'CRE',
    name: 'Chilling Reign',
    localId: 'swsh6',
    series: 'Sword & Shield',
    releaseDate: '2021-06-18',
    aliases: ['cre', 'swsh6', 'chilling reign', 'reinado arrepiante']
  },
  'BST': {
    tpciCode: 'BST',
    name: 'Battle Styles',
    localId: 'swsh5',
    series: 'Sword & Shield',
    releaseDate: '2021-03-19',
    aliases: ['bst', 'swsh5', 'battle styles', 'estilos de batalha']
  },
  'SHF': {
    tpciCode: 'SHF',
    name: 'Shining Fates',
    localId: 'swsh45',
    series: 'Sword & Shield',
    releaseDate: '2021-02-19',
    aliases: ['shf', 'swsh45', 'swsh4.5', 'shining fates', 'destinos brilhantes']
  },
  'VIV': {
    tpciCode: 'VIV',
    name: 'Vivid Voltage',
    localId: 'swsh4',
    series: 'Sword & Shield',
    releaseDate: '2020-11-13',
    aliases: ['viv', 'swsh4', 'vivid voltage', 'voltagem vivida']
  },
  'CPA': {
    tpciCode: 'CPA',
    name: "Champion's Path",
    localId: 'swsh35',
    series: 'Sword & Shield',
    releaseDate: '2020-09-25',
    aliases: ['cpa', 'swsh35', 'swsh3.5', "champion's path", 'caminho do campeao']
  },
  'DAA': {
    tpciCode: 'DAA',
    name: 'Darkness Ablaze',
    localId: 'swsh3',
    series: 'Sword & Shield',
    releaseDate: '2020-08-14',
    aliases: ['daa', 'swsh3', 'darkness ablaze', 'escuridao incandescente']
  },
  'RCL': {
    tpciCode: 'RCL',
    name: 'Rebel Clash',
    localId: 'swsh2',
    series: 'Sword & Shield',
    releaseDate: '2020-05-01',
    aliases: ['rcl', 'swsh2', 'rebel clash', 'golpe rebelde']
  },
  'SSH': {
    tpciCode: 'SSH',
    name: 'Sword & Shield',
    localId: 'swsh1',
    series: 'Sword & Shield',
    releaseDate: '2020-02-07',
    aliases: ['ssh', 'swsh1', 'sword & shield', 'espada e escudo']
  },
  'SWSH': {
    tpciCode: 'SWSH',
    name: 'Sword & Shield Promos',
    localId: 'swshp',
    series: 'Sword & Shield',
    releaseDate: '2020-02-07',
    aliases: ['swshp', 'swsh promo', 'pr-sw']
  }
};

// Mapa rápido construído para lookup instantâneo O(1) de qualquer alias ou código legado
const ALIAS_TO_TPCI_MAP: Record<string, string> = {};

Object.values(OFFICIAL_SETS_REGISTRY).forEach(def => {
  ALIAS_TO_TPCI_MAP[def.tpciCode.toLowerCase()] = def.tpciCode;
  ALIAS_TO_TPCI_MAP[def.localId.toLowerCase()] = def.tpciCode;
  def.aliases.forEach(alias => {
    const clean = alias.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    ALIAS_TO_TPCI_MAP[clean] = def.tpciCode;
  });
});

// ----------------------------------------------------------------------------
// 2. FUNÇÕES DE RESOLUÇÃO DE COLEÇÃO E NÚMERO
// ----------------------------------------------------------------------------

/**
 * Normaliza qualquer código ou nome de coleção para o código oficial do PTCGL (TPCi 3-4 caracteres).
 * Ex: 'sv6' -> 'TWM', 'sv3' -> 'OBF', 'me2.5' -> 'ASC', 'asc' -> 'ASC'
 */
export function normalizeSetToPTCGLCode(input?: string): { tpciCode: string; wasMappedRetroactively: boolean } {
  if (!input) return { tpciCode: 'SVI', wasMappedRetroactively: false };

  const rawUpper = input.trim().toUpperCase();
  if (OFFICIAL_SETS_REGISTRY[rawUpper]) {
    return { tpciCode: rawUpper, wasMappedRetroactively: false };
  }

  const clean = input.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  if (ALIAS_TO_TPCI_MAP[clean]) {
    return { tpciCode: ALIAS_TO_TPCI_MAP[clean], wasMappedRetroactively: true };
  }

  // Fallback nos dicionários de compatibilidade existentes
  if (SET_LOCAL_TO_TPCI_MAP[clean]) {
    return { tpciCode: SET_LOCAL_TO_TPCI_MAP[clean].tpciCode, wasMappedRetroactively: true };
  }

  return { tpciCode: rawUpper || 'SVI', wasMappedRetroactively: false };
}

/**
 * Normaliza números de carta para o padrão oficial do PTCGL.
 * Trata remoção de cerquilha, espaços e formatações com total (ex: "125/198" -> "125").
 */
export function normalizeCardNumber(numInput: string | number | undefined): { setNumber: string; cleanNumber: string } {
  if (numInput === undefined || numInput === null || String(numInput).trim() === '') {
    return { setNumber: '001', cleanNumber: '1' };
  }

  let str = String(numInput).trim();

  // Se tiver barra de contagem total (ex: "085/198"), extrai apenas a parte da esquerda
  if (str.includes('/')) {
    str = str.split('/')[0].trim();
  }

  // Remove caracteres comuns de prefixo (# ou no.)
  str = str.replace(/^[#\s]+/, '').replace(/^no\.?\s*/i, '');

  // Trata números numéricos padrão
  const numericMatch = str.match(/^(\d+)$/);
  if (numericMatch) {
    const rawDigits = numericMatch[1];
    const cleanNumber = rawDigits.replace(/^0+/, '') || '1';
    
    // Para exibição no PTCGL, números de 1 ou 2 dígitos são comumente padronizados com 3 dígitos
    let setNumber = rawDigits;
    if (rawDigits.length === 1) {
      setNumber = `00${rawDigits}`;
    } else if (rawDigits.length === 2) {
      setNumber = `0${rawDigits}`;
    }

    return { setNumber, cleanNumber };
  }

  // Casos alfanuméricos especiais (ex: "TG05", "GG12", "PROMO", "125a")
  const cleanNumber = str.replace(/^0+/, '');
  return { setNumber: str.toUpperCase(), cleanNumber: cleanNumber || str };
}

// ----------------------------------------------------------------------------
// 3. NORMALIZAÇÃO CENTRAL DE CARTAS POKÉMON (PTCGL FIRST)
// ----------------------------------------------------------------------------

export interface NormalizeOptions {
  fallbackName?: string;
  fallbackSetCode?: string;
  fallbackSetNumber?: string;
  originalId?: string;
}

/**
 * Normaliza qualquer formato de dados de carta (objeto, string bruta do PTCGL, ID legado do Firestore)
 * garantindo que o ID oficial do PTCGL seja o identificador primário.
 */
export function normalizePokemonCard(
  input: any, 
  options: NormalizeOptions = {}
): NormalizedPokemonCard {
  let detectedName = options.fallbackName || 'Carta Pokémon';
  let detectedSet = options.fallbackSetCode || 'SVI';
  let detectedNum = options.fallbackSetNumber || '001';
  let originalId = options.originalId || (typeof input === 'object' && input ? input.id : undefined);
  let retroactive = false;

  // CASO A: A entrada é um objeto com propriedades
  if (typeof input === 'object' && input !== null) {
    if (input.name) detectedName = input.name;

    // Detecta código de coleção a partir de propriedades variadas
    const rawSetCode = input.setCode || input.tpciSetCode || input.set?.id || input.set || input.setId;
    if (rawSetCode) {
      const { tpciCode, wasMappedRetroactively } = normalizeSetToPTCGLCode(String(rawSetCode));
      detectedSet = tpciCode;
      if (wasMappedRetroactively) retroactive = true;
    }

    // Detecta número da carta
    const rawNum = input.setNumber || input.number || input.cardNumber;
    if (rawNum !== undefined && rawNum !== null) {
      detectedNum = String(rawNum);
    }

    // Se o objeto tiver apenas um ID no formato "sv3-125" ou "userId_sv3-125", parseamos o ID
    if ((!rawSetCode || !rawNum) && input.id) {
      const parsedFromId = parseCardIdString(input.id);
      if (parsedFromId) {
        if (!rawSetCode) {
          detectedSet = parsedFromId.tpciCode;
          retroactive = true;
        }
        if (!rawNum) {
          detectedNum = parsedFromId.setNumber;
        }
      }
    }
  } 
  // CASO B: A entrada é uma string bruta
  else if (typeof input === 'string') {
    const parsed = parsePTCGLString(input);
    if (parsed) {
      detectedName = parsed.name || detectedName;
      detectedSet = parsed.setCode;
      detectedNum = parsed.setNumber;
      retroactive = true;
    }
  }

  // Normalização final do código de coleção e número
  const { tpciCode: finalSetCode, wasMappedRetroactively: finalMapped } = normalizeSetToPTCGLCode(detectedSet);
  if (finalMapped) retroactive = true;

  const { setNumber: finalSetNumber, cleanNumber } = normalizeCardNumber(detectedNum);

  // Construção dos identificadores prioritários do PTCGL
  const ptcglId = `${finalSetCode} ${finalSetNumber}`;
  const canonicalCode = ptcglId;
  const normalizedCardId = `${finalSetCode}-${finalSetNumber}`;
  const localSetId = SET_TPCI_TO_LOCAL_MAP[finalSetCode] || finalSetCode.toLowerCase();

  // Resolução de Metadados da Coleção
  const setRegistry = OFFICIAL_SETS_REGISTRY[finalSetCode];
  const setName = (typeof input === 'object' && input?.setName) 
    ? input.setName 
    : (setRegistry?.name || `${finalSetCode} Expansion`);
  const series = (typeof input === 'object' && input?.series) 
    ? input.series 
    : (setRegistry?.series || 'Scarlet & Violet');

  // Resolução da Imagem Oficial (Scan Autêntico do TCGdex)
  let imageUrl = getTCGdexImageUrl(finalSetCode, cleanNumber, 'en');
  if (typeof input === 'object' && input?.imageUrl && !input.imageUrl.includes('sprites/')) {
    // Se o input já tem uma imagem válida fornecida explicitamente (não sprite), aceitamos
    imageUrl = input.imageUrl;
  }

  // Preservação de atributos de acervo/usuário caso existam
  const quantity = typeof input === 'object' && input?.quantity !== undefined ? Number(input.quantity) : 1;
  const isLendable = typeof input === 'object' && input?.isLendable !== undefined ? Boolean(input.isLendable) : true;
  const ownerId = typeof input === 'object' ? input?.ownerId : undefined;
  const ownerName = typeof input === 'object' ? input?.ownerName : undefined;
  const createdAt = typeof input === 'object' ? input?.createdAt : undefined;
  const category = typeof input === 'object' ? input?.category : undefined;

  return {
    ptcglId,
    canonicalCode,
    normalizedCardId,
    systemCardId: normalizedCardId,
    name: detectedName,
    setCode: finalSetCode,
    localSetId,
    setName,
    setNumber: finalSetNumber,
    cleanNumber,
    series,
    imageUrl,
    originalId,
    isRetroactiveMapped: retroactive,
    quantity,
    isLendable,
    ownerId,
    ownerName,
    createdAt,
    category
  };
}

/**
 * Normaliza em lote uma lista inteira de cartas de coleção (ex: vindas do Firestore),
 * convertendo retroativamente IDs legados para a nomenclatura oficial do PTCGL.
 */
export function normalizeCollectionCards(cards: (CardItem | any)[]): NormalizedPokemonCard[] {
  if (!Array.isArray(cards)) return [];
  return cards.map(c => normalizePokemonCard(c));
}

/**
 * Converte um CardItem para uma versão com dados do PTCGL devidamente sincronizados,
 * garantindo compatibilidade estrita com a interface de banco CardItem.
 */
export function retroactiveNormalizeCardItem(card: CardItem | any): CardItem {
  const norm = normalizePokemonCard(card);
  
  return {
    id: card.id || norm.normalizedCardId,
    name: norm.name,
    imageUrl: norm.imageUrl,
    setCode: norm.setCode,
    setName: norm.setName,
    setNumber: norm.setNumber,
    quantity: norm.quantity !== undefined ? norm.quantity : (card.quantity || 1),
    ownerId: card.ownerId || '',
    ownerName: card.ownerName || '',
    isLendable: card.isLendable !== undefined ? card.isLendable : true,
    lentToUserId: card.lentToUserId || null,
    lentToUserName: card.lentToUserName || null,
    pendingRequestUserId: card.pendingRequestUserId || null,
    pendingRequestUserName: card.pendingRequestUserName || null,
    createdAt: card.createdAt || new Date().toISOString()
  };
}

/**
 * Extrai o ID oficial do PTCGL (ex: "ASC 085", "OBF 125") a partir de qualquer entrada.
 */
export function getPTCGLId(cardOrId: any): string {
  if (!cardOrId) return 'SVI 001';
  if (typeof cardOrId === 'object' && cardOrId.ptcglId) {
    return cardOrId.ptcglId;
  }
  return normalizePokemonCard(cardOrId).ptcglId;
}

/**
 * Retorna o código com hífen (ex: "ASC-085", "OBF-125") seguro para chave de cache ou identificação de elementos.
 */
export function getNormalizedCardId(cardOrId: any): string {
  if (!cardOrId) return 'SVI-001';
  if (typeof cardOrId === 'object' && cardOrId.normalizedCardId) {
    return cardOrId.normalizedCardId;
  }
  return normalizePokemonCard(cardOrId).normalizedCardId;
}

/**
 * Constrói um código oficial do PTCGL a partir de um código de coleção e número.
 */
export function toCanonicalPTCGLCode(setCode: string, setNumber: string | number): string {
  const { tpciCode } = normalizeSetToPTCGLCode(setCode);
  const { setNumber: cleanNum } = normalizeCardNumber(setNumber);
  return `${tpciCode} ${cleanNum}`;
}

// ----------------------------------------------------------------------------
// 4. PARSER E EXTRATOR RETROATIVO DE STRINGS
// ----------------------------------------------------------------------------

/**
 * Extrai dados de coleção e número a partir de identificadores compostos ou legados.
 * Exemplos aceitos:
 * - "userId_sv3-125" -> set: "OBF", num: "125"
 * - "sv6-130" -> set: "TWM", num: "130"
 * - "me2-5-221" -> set: "ASC", num: "221"
 * - "ASC 085" -> set: "ASC", num: "085"
 */
function parseCardIdString(idStr: string): { tpciCode: string; setNumber: string } | null {
  if (!idStr) return null;

  // Remove prefixo de usuário se presente (ex: "memberId_sv3-125" -> "sv3-125")
  let clean = idStr.trim();
  const splitUnderscore = clean.split('_');
  if (splitUnderscore.length > 1 && !clean.toLowerCase().startsWith('me2_')) {
    clean = splitUnderscore[splitUnderscore.length - 1];
  }

  // Formato com espaço: "OBF 125", "ASC 085"
  const spaceMatch = clean.match(/^([A-Za-z0-9.-]+)\s+(\d+|[A-Za-z0-9]+)$/);
  if (spaceMatch) {
    const { tpciCode } = normalizeSetToPTCGLCode(spaceMatch[1]);
    const { setNumber } = normalizeCardNumber(spaceMatch[2]);
    return { tpciCode, setNumber };
  }

  // Formato com hífen: "sv3-125", "obf-125", "me2-5-85"
  // Caso especial: me2-5-85 (Mega Evolution 2.5)
  if (clean.toLowerCase().startsWith('me2-5-') || clean.toLowerCase().startsWith('me2.5-')) {
    const numPart = clean.split('-').pop() || '001';
    return { tpciCode: 'ASC', setNumber: normalizeCardNumber(numPart).setNumber };
  }

  const hyphenMatch = clean.match(/^([a-z0-9.-]+)[-_](\d+|[a-z0-9]+)$/i);
  if (hyphenMatch) {
    const { tpciCode } = normalizeSetToPTCGLCode(hyphenMatch[1]);
    const { setNumber } = normalizeCardNumber(hyphenMatch[2]);
    return { tpciCode, setNumber };
  }

  return null;
}

/**
 * Analisa uma string arbitrária do PTCGL ou linha de decklist.
 * Ex: "2 Charizard ex OBF 125", "Mega Lucario ex ASC 085", "Dragapult ex (TWM #130)"
 */
export function parsePTCGLString(line: string): {
  count?: number;
  name: string;
  setCode: string;
  setNumber: string;
} | null {
  if (!line || typeof line !== 'string') return null;

  const trimmed = line.trim();

  // Padrão 1: Quantidade opcional + Nome da Carta + Código de Coleção + Número
  // Ex: "4 Charizard ex OBF 125" ou "Charizard ex OBF 125"
  const ptcglRegex = /^(?:(\d+)\s+)?(.+?)\s+([A-Za-z0-9.-]{2,8})\s+(\d+|[A-Za-z0-9]+)$/i;
  const match = trimmed.match(ptcglRegex);

  if (match) {
    const count = match[1] ? parseInt(match[1], 10) : undefined;
    const rawName = match[2].trim();
    const rawSet = match[3].trim();
    const rawNum = match[4].trim();

    const { tpciCode } = normalizeSetToPTCGLCode(rawSet);
    const { setNumber } = normalizeCardNumber(rawNum);

    return {
      count,
      name: rawName,
      setCode: tpciCode,
      setNumber
    };
  }

  // Padrão 2: Formato com parênteses: "Charizard ex (OBF 125)" ou "Iono (PAF #91)"
  const parenRegex = /^(?:(\d+)\s+)?(.+?)\s*\(([A-Za-z0-9.-]+)[\s#]+(\d+|[A-Za-z0-9]+)\)$/i;
  const parenMatch = trimmed.match(parenRegex);

  if (parenMatch) {
    const count = parenMatch[1] ? parseInt(parenMatch[1], 10) : undefined;
    const rawName = parenMatch[2].trim();
    const rawSet = parenMatch[3].trim();
    const rawNum = parenMatch[4].trim();

    const { tpciCode } = normalizeSetToPTCGLCode(rawSet);
    const { setNumber } = normalizeCardNumber(rawNum);

    return {
      count,
      name: rawName,
      setCode: tpciCode,
      setNumber
    };
  }

  // Padrão 3: ID de carta simples sem nome (ex: "sv6-130" ou "OBF 125")
  const idParsed = parseCardIdString(trimmed);
  if (idParsed) {
    return {
      name: 'Carta Pokémon',
      setCode: idParsed.tpciCode,
      setNumber: idParsed.setNumber
    };
  }

  return null;
}

/**
 * Retorna as informações oficiais de uma expansão pelo seu código TPCi ou alias.
 */
export function getOfficialSetInfo(setCodeOrId: string): SetDefinition | null {
  if (!setCodeOrId) return null;
  const { tpciCode } = normalizeSetToPTCGLCode(setCodeOrId);
  return OFFICIAL_SETS_REGISTRY[tpciCode] || null;
}

/**
 * Analisa uma lista de deck completa (formato PTCGL com seções Pokémon/Treinador/Energia).
 */
export function parsePTCGLDeckList(deckText: string): Array<{
  name: string;
  count: number;
  set?: string;
  number?: string;
  type: 'Pokémon' | 'Treinador' | 'Energia';
  imageUrl?: string;
}> {
  if (!deckText) return [];
  const lines = deckText.split(/\r?\n/);
  const results: Array<{
    name: string;
    count: number;
    set?: string;
    number?: string;
    type: 'Pokémon' | 'Treinador' | 'Energia';
    imageUrl?: string;
  }> = [];

  let currentCategory: 'Pokémon' | 'Treinador' | 'Energia' = 'Pokémon';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (lower.startsWith('pokémon:') || lower.startsWith('pokemon:')) {
      currentCategory = 'Pokémon';
      continue;
    }
    if (lower.startsWith('treinador:') || lower.startsWith('trainer:') || lower.startsWith('treinadores:')) {
      currentCategory = 'Treinador';
      continue;
    }
    if (lower.startsWith('energia:') || lower.startsWith('energy:')) {
      currentCategory = 'Energia';
      continue;
    }

    const parsed = parsePTCGLString(trimmed);
    if (parsed) {
      const normalized = normalizePokemonCard({
        name: parsed.name,
        setCode: parsed.setCode,
        setNumber: parsed.setNumber
      });
      results.push({
        name: normalized.name,
        count: parsed.count || 1,
        set: normalized.setCode,
        number: normalized.setNumber,
        type: currentCategory,
        imageUrl: normalized.imageUrl
      });
    }
  }
  return results;
}

const cardNormalizationService = {
  normalizePokemonCard,
  normalizeCollectionCards,
  retroactiveNormalizeCardItem,
  getPTCGLId,
  getNormalizedCardId,
  toCanonicalPTCGLCode,
  normalizeSetToPTCGLCode,
  normalizeCardNumber,
  parsePTCGLString,
  parsePTCGLDeckList,
  getOfficialSetInfo,
  OFFICIAL_SETS_REGISTRY
};

export default cardNormalizationService;
