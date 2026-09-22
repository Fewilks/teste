import { getTCGdexImageUrl, getAuthenticCardImageUrl, normalizeTPCiSetCode, registerCollectionCards } from '../utils/cardImages';

export interface PokemonSet {
  id: string;          // Official PTCGL uppercase 3-4 letter code (e.g. "TWM", "OBF", "SSP", "ASC")
  ptcglCode: string;   // Official PTCGL uppercase code
  localId?: string;    // Secondary / pokemontcg.io identifier (e.g. "sv6", "sv3")
  name: string;
  series: string;
  releaseDate?: string;
  logo?: string;
  symbol?: string;
}

export interface CatalogCard {
  id: string;          // e.g. "TWM-130", "OBF-125"
  name: string;
  imageUrl: string;
  setCode: string;     // PTCGL set code (e.g. "TWM", "OBF")
  setName: string;
  setNumber: string;
  tpciCode?: string;   // e.g. "TWM 130"
  tpciSetCode?: string;// e.g. "TWM"
  localSetId?: string; // e.g. "sv6"
}

// Master list of Pokémon TCG collections using PTCGL official codes as primary
export const COMPREHENSIVE_SETS: PokemonSet[] = [
  // 1. Coleções de Celebração de 30 Anos
  { id: '30TH', ptcglCode: '30TH', localId: '30th', name: 'Celebrações de 30 Anos (30th Anniversary Celebration - 30TH)', series: 'Mega Evolution', releaseDate: '2026-02-27', logo: 'https://assets.tcgdex.net/en/me/30th/logo', symbol: 'https://assets.tcgdex.net/univ/me/30th/symbol' },
  { id: '30TH-C', ptcglCode: '30TH-C', localId: '30th-c', name: 'Coleção Clássica de 30 Anos (30th Classic Collection - 30TH-C)', series: 'Mega Evolution', releaseDate: '2026-02-27' },

  // 2. Nova Era Mega Evolution (2025+)
  { id: 'ASC', ptcglCode: 'ASC', localId: 'asc', name: 'Heróis Excelsos (Mega Evolution: Ascended Heroes - ASC)', series: 'Mega Evolution', releaseDate: '2026-01-30', logo: 'https://images.pokemontcg.io/asc/logo.png', symbol: 'https://images.pokemontcg.io/asc/symbol.png' },
  { id: 'PFL', ptcglCode: 'PFL', localId: 'pfl', name: 'Fogo Fantasmagórico (Mega Evolution: Phantasmal Flames - PFL)', series: 'Mega Evolution', releaseDate: '2025-11-14', logo: 'https://images.pokemontcg.io/pfl/logo.png', symbol: 'https://images.pokemontcg.io/pfl/symbol.png' },
  { id: 'POR', ptcglCode: 'POR', localId: 'por', name: 'Ordem Perfeita (Mega Evolution: Perfect Order - POR)', series: 'Mega Evolution', releaseDate: '2026-03-27', logo: 'https://images.pokemontcg.io/por/logo.png', symbol: 'https://images.pokemontcg.io/por/symbol.png' },
  { id: 'MEG', ptcglCode: 'MEG', localId: 'meg', name: 'Mega Evolução Base (Mega Evolution - MEG)', series: 'Mega Evolution', releaseDate: '2025-09-26', logo: 'https://images.pokemontcg.io/meg/logo.png', symbol: 'https://images.pokemontcg.io/meg/symbol.png' },
  { id: 'CRI', ptcglCode: 'CRI', localId: 'cri', name: 'Caos Ascendente (Mega Evolution: Chaos Rising - CRI)', series: 'Mega Evolution', releaseDate: '2026-05-22' },
  { id: 'PBL', ptcglCode: 'PBL', localId: 'pbl', name: 'Escuridão Total (Mega Evolution: Pitch Black - PBL)', series: 'Mega Evolution', releaseDate: '2026-07-17' },

  // 2. Expansões de 2025 de Scarlet & Violet
  { id: 'PRE', ptcglCode: 'PRE', localId: 'sv8pt5', name: 'Evoluções Prismáticas (Prismatic Evolutions - PRE)', series: 'Scarlet & Violet', releaseDate: '2025-01-17' },
  { id: 'JTG', ptcglCode: 'JTG', localId: 'sv9', name: 'Jornada em Conjunto (Journey Together - JTG)', series: 'Scarlet & Violet', releaseDate: '2025-03-28' },
  { id: 'DRI', ptcglCode: 'DRI', localId: 'sv9pt5', name: 'Rivais Destinados (Destined Rivals - DRI)', series: 'Scarlet & Violet', releaseDate: '2025-05-30' },
  { id: 'BLK', ptcglCode: 'BLK', localId: 'sv10', name: 'Raio Negro (Black Bolt - BLK)', series: 'Scarlet & Violet', releaseDate: '2025-07-18' },
  { id: 'WHT', ptcglCode: 'WHT', localId: 'sv10pt5', name: 'Chama Branca (White Flare - WHT)', series: 'Scarlet & Violet', releaseDate: '2025-07-18' },

  // 3. Formato Standard Atual (Scarlet & Violet)
  { id: 'SSP', ptcglCode: 'SSP', localId: 'sv8', name: 'Faíscas Impetuosas (Surging Sparks - SSP)', series: 'Scarlet & Violet', releaseDate: '2024-11-08' },
  { id: 'SCR', ptcglCode: 'SCR', localId: 'sv7', name: 'Coroa Estelar (Stellar Crown - SCR)', series: 'Scarlet & Violet', releaseDate: '2024-09-13' },
  { id: 'SFA', ptcglCode: 'SFA', localId: 'sv6pt5', name: 'Fábulas Nebulosas (Shrouded Fable - SFA)', series: 'Scarlet & Violet', releaseDate: '2024-08-02' },
  { id: 'TWM', ptcglCode: 'TWM', localId: 'sv6', name: 'Máscaras do Crepúsculo (Twilight Masquerade - TWM)', series: 'Scarlet & Violet', releaseDate: '2024-05-24' },
  { id: 'TEF', ptcglCode: 'TEF', localId: 'sv5', name: 'Forças Temporais (Temporal Forces - TEF)', series: 'Scarlet & Violet', releaseDate: '2024-03-22' },
  { id: 'PAF', ptcglCode: 'PAF', localId: 'sv45', name: 'Destinos de Paldea (Paldean Fates - PAF)', series: 'Scarlet & Violet', releaseDate: '2024-01-26' },
  { id: 'PAR', ptcglCode: 'PAR', localId: 'sv4', name: 'Fenda Paradoxal (Paradox Rift - PAR)', series: 'Scarlet & Violet', releaseDate: '2023-11-03' },
  { id: 'MEW', ptcglCode: 'MEW', localId: 'sv3pt5', name: '151 (Pokémon 151 - MEW)', series: 'Scarlet & Violet', releaseDate: '2023-09-22' },
  { id: 'OBF', ptcglCode: 'OBF', localId: 'sv3', name: 'Obsidiana em Chamas (Obsidian Flames - OBF)', series: 'Scarlet & Violet', releaseDate: '2023-08-11' },
  { id: 'PAL', ptcglCode: 'PAL', localId: 'sv2', name: 'Evoluções em Paldea (Paldea Evolved - PAL)', series: 'Scarlet & Violet', releaseDate: '2023-06-09' },
  { id: 'SVI', ptcglCode: 'SVI', localId: 'sv1', name: 'Escarlate e Violeta Base (SVI)', series: 'Scarlet & Violet', releaseDate: '2023-03-31' }
];

export const TPCI_TO_LOCAL_SET_MAP: Record<string, string> = {
  'ASC': 'asc',
  'PFL': 'pfl',
  'POR': 'por',
  'MEG': 'meg',
  'CRI': 'cri',
  'PBL': 'pbl',
  'PRE': 'pre',
  'JTG': 'jtg',
  'DRI': 'dri',
  'BLK': 'blk',
  'WHT': 'wht',
  'SSP': 'ssp',
  'SCR': 'scr',
  'SFA': 'sfa',
  'TWM': 'sv6',
  'TEF': 'sv5',
  'PAF': 'sv45',
  'PAR': 'sv4',
  'MEW': 'sv3pt5',
  'OBF': 'sv3',
  'PAL': 'sv2',
  'SVI': 'sv1'
};

export const LOCAL_TO_TPCI_SET_MAP: Record<string, string> = {
  'asc': 'ASC',
  'pfl': 'PFL',
  'por': 'POR',
  'meg': 'MEG',
  'cri': 'CRI',
  'pbl': 'PBL',
  'pre': 'PRE',
  'jtg': 'JTG',
  'dri': 'DRI',
  'blk': 'BLK',
  'wht': 'WHT',
  'ssp': 'SSP',
  'scr': 'SCR',
  'sfa': 'SFA',
  'sv6': 'TWM',
  'sv5': 'TEF',
  'sv45': 'PAF',
  'sv4': 'PAR',
  'sv3pt5': 'MEW',
  'sv3': 'OBF',
  'sv2': 'PAL',
  'sv1': 'SVI'
};

// Aliases for Portuguese names and colloquial queries
export const SET_QUERY_ALIASES: Record<string, string> = {
  'herois excelsor': 'asc',
  'herois excelsos': 'asc',
  'heróis excelsos': 'asc',
  'herois': 'asc',
  'ascended heroes': 'asc',
  'asc': 'asc',
  'fogo fantasmagorico': 'pfl',
  'fogo fantasmagórico': 'pfl',
  'fantasmagorico': 'pfl',
  'fantasmagórico': 'pfl',
  'phantasmal flames': 'pfl',
  'pfl': 'pfl',
  'ordem perfeita': 'por',
  'perfect order': 'por',
  'por': 'por',
  'mega evolucao': 'meg',
  'mega evolução': 'meg',
  'mega evolution': 'meg',
  'meg': 'meg',
  'caos ascendente': 'cri',
  'chaos rising': 'cri',
  'cri': 'cri',
  'escuridao total': 'pbl',
  'escuridão total': 'pbl',
  'pitch black': 'pbl',
  'pbl': 'pbl',
  'evolucoes prismaticas': 'pre',
  'evoluções prismáticas': 'pre',
  'prismatic evolutions': 'pre',
  'pre': 'pre',
  'jornada em conjunto': 'jtg',
  'journey together': 'jtg',
  'jtg': 'jtg',
  'rivais destinados': 'dri',
  'destined rivals': 'dri',
  'dri': 'dri',
  'raio negro': 'blk',
  'black bolt': 'blk',
  'blk': 'blk',
  'chama branca': 'wht',
  'white flare': 'wht',
  'wht': 'wht',
  'faiscas impetuosas': 'ssp',
  'faíscas impetuosas': 'ssp',
  'surging sparks': 'ssp',
  'ssp': 'ssp',
  'coroa estelar': 'scr',
  'stellar crown': 'scr',
  'scr': 'scr',
  'mascaras do crepusculo': 'sv6',
  'máscaras do crepúsculo': 'sv6',
  'twilight masquerade': 'sv6',
  'twm': 'sv6',
  'forcas temporais': 'sv5',
  'forças temporais': 'sv5',
  'temporal forces': 'sv5',
  'tef': 'sv5',
  '151': 'sv3pt5',
  'mew': 'sv3pt5',
  'obsidiana em chamas': 'sv3',
  'obsidian flames': 'sv3',
  'obf': 'sv3'
};

// Complete modern cards catalog using official PTCGL codes as primary and authentic TCGdex scans
export const MODERN_CARDS_CATALOG: CatalogCard[] = [
  // --- HERÓIS EXCELSOS (ASC - 2026) ---
  { id: 'ASC-085', name: 'Mega Lucario ex', imageUrl: getTCGdexImageUrl('ASC', '085'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '085', tpciCode: 'ASC 085', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-120', name: 'Mega Lucario ex (Ilustração Especial Rara)', imageUrl: getTCGdexImageUrl('ASC', '120'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '120', tpciCode: 'ASC 120', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-092', name: 'Mega Gardevoir ex', imageUrl: getTCGdexImageUrl('ASC', '092'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '092', tpciCode: 'ASC 092', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-068', name: 'Mega Greninja ex', imageUrl: getTCGdexImageUrl('ASC', '068'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '068', tpciCode: 'ASC 068', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-010', name: 'Mega Meganium ex', imageUrl: getTCGdexImageUrl('ASC', '010'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '010', tpciCode: 'ASC 010', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-024', name: 'Mega Feraligatr ex', imageUrl: getTCGdexImageUrl('ASC', '024'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '024', tpciCode: 'ASC 024', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-035', name: 'Mega Emboar ex', imageUrl: getTCGdexImageUrl('ASC', '035'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '035', tpciCode: 'ASC 035', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-101', name: 'Zygarde ex', imageUrl: getTCGdexImageUrl('ASC', '101'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '101', tpciCode: 'ASC 101', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-016', name: 'Budew', imageUrl: getTCGdexImageUrl('ASC', '016'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '016', tpciCode: 'ASC 016', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-039', name: 'Psyduck', imageUrl: getTCGdexImageUrl('ASC', '039'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '039', tpciCode: 'ASC 039', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-142', name: 'Fezandipiti ex', imageUrl: getTCGdexImageUrl('ASC', '142'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '142', tpciCode: 'ASC 142', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-181', name: 'Air Balloon', imageUrl: getTCGdexImageUrl('ASC', '181'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '181', tpciCode: 'ASC 181', tpciSetCode: 'ASC', localSetId: 'asc' },
  { id: 'ASC-196', name: 'Night Stretcher', imageUrl: getTCGdexImageUrl('ASC', '196'), setCode: 'ASC', setName: 'Heróis Excelsos (Ascended Heroes)', setNumber: '196', tpciCode: 'ASC 196', tpciSetCode: 'ASC', localSetId: 'asc' },

  // --- FOGO FANTASMAGÓRICO (PFL - 2025) ---
  { id: 'PFL-013', name: 'Mega Charizard X ex', imageUrl: getTCGdexImageUrl('PFL', '013'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '013', tpciCode: 'PFL 013', tpciSetCode: 'PFL', localSetId: 'pfl' },
  { id: 'PFL-130', name: 'Mega Charizard X ex (Ilustração Rara)', imageUrl: getTCGdexImageUrl('PFL', '130'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '130', tpciCode: 'PFL 130', tpciSetCode: 'PFL', localSetId: 'pfl' },
  { id: 'PFL-025', name: 'Mega Blaziken ex', imageUrl: getTCGdexImageUrl('PFL', '025'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '025', tpciCode: 'PFL 025', tpciSetCode: 'PFL', localSetId: 'pfl' },
  { id: 'PFL-038', name: 'Mega Camerupt ex', imageUrl: getTCGdexImageUrl('PFL', '038'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '038', tpciCode: 'PFL 038', tpciSetCode: 'PFL', localSetId: 'pfl' },
  { id: 'PFL-045', name: 'Mega Houndoom ex', imageUrl: getTCGdexImageUrl('PFL', '045'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '045', tpciCode: 'PFL 045', tpciSetCode: 'PFL', localSetId: 'pfl' },
  { id: 'PFL-052', name: 'Ceruledge ex', imageUrl: getTCGdexImageUrl('PFL', '052'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '052', tpciCode: 'PFL 052', tpciSetCode: 'PFL', localSetId: 'pfl' },
  { id: 'PFL-060', name: 'Chandelure ex', imageUrl: getTCGdexImageUrl('PFL', '060'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '060', tpciCode: 'PFL 060', tpciSetCode: 'PFL', localSetId: 'pfl' },
  { id: 'PFL-087', name: 'Dawn', imageUrl: getTCGdexImageUrl('PFL', '087'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '087', tpciCode: 'PFL 087', tpciSetCode: 'PFL', localSetId: 'pfl' },
  { id: 'PFL-091', name: 'Jumbo Ice Cream', imageUrl: getTCGdexImageUrl('PFL', '091'), setCode: 'PFL', setName: 'Fogo Fantasmagórico (Phantasmal Flames)', setNumber: '091', tpciCode: 'PFL 091', tpciSetCode: 'PFL', localSetId: 'pfl' },

  // --- ORDEM PERFEITA (POR - 2026) ---
  { id: 'POR-001', name: 'Mega Zygarde Forma Completa ex', imageUrl: getTCGdexImageUrl('POR', '001'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '001', tpciCode: 'POR 001', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-028', name: 'Mega Clefable ex', imageUrl: getTCGdexImageUrl('POR', '028'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '028', tpciCode: 'POR 028', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-042', name: 'Mega Starmie ex', imageUrl: getTCGdexImageUrl('POR', '042'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '042', tpciCode: 'POR 042', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-058', name: 'Mega Absol ex', imageUrl: getTCGdexImageUrl('POR', '058'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '058', tpciCode: 'POR 058', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-072', name: 'Mega Steelix ex', imageUrl: getTCGdexImageUrl('POR', '072'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '072', tpciCode: 'POR 072', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-089', name: 'Mega Metagross ex', imageUrl: getTCGdexImageUrl('POR', '089'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '089', tpciCode: 'POR 089', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-062', name: 'Meowth ex', imageUrl: getTCGdexImageUrl('POR', '062'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '062', tpciCode: 'POR 062', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-095', name: 'Xerneas ex', imageUrl: getTCGdexImageUrl('POR', '095'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '095', tpciCode: 'POR 095', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-104', name: 'Yveltal ex', imageUrl: getTCGdexImageUrl('POR', '104'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '104', tpciCode: 'POR 104', tpciSetCode: 'POR', localSetId: 'por' },
  { id: 'POR-081', name: 'Poké Pad', imageUrl: getTCGdexImageUrl('POR', '081'), setCode: 'POR', setName: 'Ordem Perfeita (Perfect Order)', setNumber: '081', tpciCode: 'POR 081', tpciSetCode: 'POR', localSetId: 'por' },

  // --- MEGA EVOLUÇÃO BASE (MEG - 2025) ---
  { id: 'MEG-015', name: 'Mega Charizard Y ex', imageUrl: getTCGdexImageUrl('MEG', '015'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '015', tpciCode: 'MEG 015', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-002', name: 'Mega Venusaur ex', imageUrl: getTCGdexImageUrl('MEG', '002'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '002', tpciCode: 'MEG 002', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-031', name: 'Mega Blastoise ex', imageUrl: getTCGdexImageUrl('MEG', '031'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '031', tpciCode: 'MEG 031', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-049', name: 'Mega Gengar ex', imageUrl: getTCGdexImageUrl('MEG', '049'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '049', tpciCode: 'MEG 049', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-088', name: 'Mega Rayquaza ex', imageUrl: getTCGdexImageUrl('MEG', '088'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '088', tpciCode: 'MEG 088', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-099', name: 'Mega Mewtwo X ex', imageUrl: getTCGdexImageUrl('MEG', '099'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '099', tpciCode: 'MEG 099', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-100', name: 'Mega Mewtwo Y ex', imageUrl: getTCGdexImageUrl('MEG', '100'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '100', tpciCode: 'MEG 100', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-104', name: 'Mega Kangaskhan ex', imageUrl: getTCGdexImageUrl('MEG', '104'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '104', tpciCode: 'MEG 104', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-077', name: 'Mega Tyranitar ex', imageUrl: getTCGdexImageUrl('MEG', '077'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '077', tpciCode: 'MEG 077', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-065', name: 'Mega Scizor ex', imageUrl: getTCGdexImageUrl('MEG', '065'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '065', tpciCode: 'MEG 065', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-082', name: 'Mega Aerodactyl ex', imageUrl: getTCGdexImageUrl('MEG', '082'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '082', tpciCode: 'MEG 082', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-090', name: 'Mega Salamence ex', imageUrl: getTCGdexImageUrl('MEG', '090'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '090', tpciCode: 'MEG 090', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-084', name: 'Mega Lopunny ex', imageUrl: getTCGdexImageUrl('MEG', '084'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '084', tpciCode: 'MEG 084', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-080', name: 'Mega Gallade ex', imageUrl: getTCGdexImageUrl('MEG', '080'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '080', tpciCode: 'MEG 080', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-083', name: 'Mega Diancie ex', imageUrl: getTCGdexImageUrl('MEG', '083'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '083', tpciCode: 'MEG 083', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-091', name: 'Mega Latias ex', imageUrl: getTCGdexImageUrl('MEG', '091'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '091', tpciCode: 'MEG 091', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-092', name: 'Mega Latios ex', imageUrl: getTCGdexImageUrl('MEG', '092'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '092', tpciCode: 'MEG 092', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-054', name: 'Abra', imageUrl: getTCGdexImageUrl('MEG', '054'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '054', tpciCode: 'MEG 054', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-055', name: 'Kadabra', imageUrl: getTCGdexImageUrl('MEG', '055'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '055', tpciCode: 'MEG 055', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-056', name: 'Alakazam', imageUrl: getTCGdexImageUrl('MEG', '056'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '056', tpciCode: 'MEG 056', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-114', name: 'Boss\'s Orders', imageUrl: getTCGdexImageUrl('MEG', '114'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '114', tpciCode: 'MEG 114', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-119', name: 'Lillie\'s Determination', imageUrl: getTCGdexImageUrl('MEG', '119'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '119', tpciCode: 'MEG 119', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-125', name: 'Rare Candy', imageUrl: getTCGdexImageUrl('MEG', '125'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '125', tpciCode: 'MEG 125', tpciSetCode: 'MEG', localSetId: 'meg' },
  { id: 'MEG-131', name: 'Ultra Ball', imageUrl: getTCGdexImageUrl('MEG', '131'), setCode: 'MEG', setName: 'Mega Evolução (Mega Evolution)', setNumber: '131', tpciCode: 'MEG 131', tpciSetCode: 'MEG', localSetId: 'meg' },

  // --- CAOS ASCENDENTE & ESCURIDÃO TOTAL (CRI & PBL - 2026) ---
  { id: 'CRI-050', name: 'Mega Darkrai ex', imageUrl: getTCGdexImageUrl('CRI', '050'), setCode: 'CRI', setName: 'Caos Ascendente (Chaos Rising)', setNumber: '050', tpciCode: 'CRI 050', tpciSetCode: 'CRI', localSetId: 'cri' },
  { id: 'CRI-082', name: 'Special Red Card', imageUrl: getTCGdexImageUrl('CRI', '082'), setCode: 'CRI', setName: 'Caos Ascendente (Chaos Rising)', setNumber: '082', tpciCode: 'CRI 082', tpciSetCode: 'CRI', localSetId: 'cri' },
  { id: 'PBL-050', name: 'Mega Hydreigon ex', imageUrl: getTCGdexImageUrl('PBL', '050'), setCode: 'PBL', setName: 'Escuridão Total (Pitch Black)', setNumber: '050', tpciCode: 'PBL 050', tpciSetCode: 'PBL', localSetId: 'pbl' },

  // --- EVOLUÇÕES PRISMÁTICAS (PRE - 2025) ---
  { id: 'PRE-075', name: 'Eevee ex (Stellar)', imageUrl: getTCGdexImageUrl('PRE', '075'), setCode: 'PRE', setName: 'Evoluções Prismáticas (Prismatic Evolutions)', setNumber: '075', tpciCode: 'PRE 075', tpciSetCode: 'PRE', localSetId: 'sv8pt5' },
  { id: 'PRE-060', name: 'Umbreon ex', imageUrl: getTCGdexImageUrl('PRE', '060'), setCode: 'PRE', setName: 'Evoluções Prismáticas (Prismatic Evolutions)', setNumber: '060', tpciCode: 'PRE 060', tpciSetCode: 'PRE', localSetId: 'sv8pt5' },
  { id: 'PRE-042', name: 'Sylveon ex', imageUrl: getTCGdexImageUrl('PRE', '042'), setCode: 'PRE', setName: 'Evoluções Prismáticas (Prismatic Evolutions)', setNumber: '042', tpciCode: 'PRE 042', tpciSetCode: 'PRE', localSetId: 'sv8pt5' },
  { id: 'PRE-035', name: 'Espeon ex', imageUrl: getTCGdexImageUrl('PRE', '035'), setCode: 'PRE', setName: 'Evoluções Prismáticas (Prismatic Evolutions)', setNumber: '035', tpciCode: 'PRE 035', tpciSetCode: 'PRE', localSetId: 'sv8pt5' },
  { id: 'PRE-020', name: 'Vaporeon ex', imageUrl: getTCGdexImageUrl('PRE', '020'), setCode: 'PRE', setName: 'Evoluções Prismáticas (Prismatic Evolutions)', setNumber: '020', tpciCode: 'PRE 020', tpciSetCode: 'PRE', localSetId: 'sv8pt5' },
  { id: 'PRE-025', name: 'Jolteon ex', imageUrl: getTCGdexImageUrl('PRE', '025'), setCode: 'PRE', setName: 'Evoluções Prismáticas (Prismatic Evolutions)', setNumber: '025', tpciCode: 'PRE 025', tpciSetCode: 'PRE', localSetId: 'sv8pt5' },
  { id: 'PRE-015', name: 'Flareon ex', imageUrl: getTCGdexImageUrl('PRE', '015'), setCode: 'PRE', setName: 'Evoluções Prismáticas (Prismatic Evolutions)', setNumber: '015', tpciCode: 'PRE 015', tpciSetCode: 'PRE', localSetId: 'sv8pt5' },

  // --- JORNADA EM CONJUNTO & RIVAIS DESTINADOS (JTG & DRI - 2025) ---
  { id: 'JTG-010', name: 'Red\'s Pikachu ex', imageUrl: getTCGdexImageUrl('JTG', '010'), setCode: 'JTG', setName: 'Jornada em Conjunto (Journey Together)', setNumber: '010', tpciCode: 'JTG 010', tpciSetCode: 'JTG', localSetId: 'sv9' },
  { id: 'JTG-024', name: 'Blaziken ex', imageUrl: getTCGdexImageUrl('JTG', '024'), setCode: 'JTG', setName: 'Jornada em Conjunto (Journey Together)', setNumber: '024', tpciCode: 'JTG 024', tpciSetCode: 'JTG', localSetId: 'sv9' },
  { id: 'JTG-056', name: 'Lillie\'s Clefairy ex', imageUrl: getTCGdexImageUrl('JTG', '056'), setCode: 'JTG', setName: 'Jornada em Conjunto (Journey Together)', setNumber: '056', tpciCode: 'JTG 056', tpciSetCode: 'JTG', localSetId: 'sv9' },
  { id: 'DRI-011', name: 'Dwebble', imageUrl: getTCGdexImageUrl('DRI', '011'), setCode: 'DRI', setName: 'Rivais Destinados (Destined Rivals)', setNumber: '011', tpciCode: 'DRI 011', tpciSetCode: 'DRI', localSetId: 'sv9pt5' },
  { id: 'DRI-012', name: 'Crustle', imageUrl: getTCGdexImageUrl('DRI', '012'), setCode: 'DRI', setName: 'Rivais Destinados (Destined Rivals)', setNumber: '012', tpciCode: 'DRI 012', tpciSetCode: 'DRI', localSetId: 'sv9pt5' },
  { id: 'DRI-020', name: 'Red\'s Charizard ex', imageUrl: getTCGdexImageUrl('DRI', '020'), setCode: 'DRI', setName: 'Rivais Destinados (Destined Rivals)', setNumber: '020', tpciCode: 'DRI 020', tpciSetCode: 'DRI', localSetId: 'sv9pt5' },
  { id: 'DRI-136', name: 'Marnie\'s Grimmsnarl ex', imageUrl: getTCGdexImageUrl('DRI', '136'), setCode: 'DRI', setName: 'Rivais Destinados (Destined Rivals)', setNumber: '136', tpciCode: 'DRI 136', tpciSetCode: 'DRI', localSetId: 'sv9pt5' },

  // --- STAPLES DO FORMATO STANDARD ATUAL (SCARLET & VIOLET) ---
  { id: 'SSP-054', name: 'Pikachu ex', imageUrl: getTCGdexImageUrl('SSP', '054'), setCode: 'SSP', setName: 'Surging Sparks', setNumber: '054', tpciCode: 'SSP 054', tpciSetCode: 'SSP', localSetId: 'sv8' },
  { id: 'SSP-034', name: 'Ceruledge ex', imageUrl: getTCGdexImageUrl('SSP', '034'), setCode: 'SSP', setName: 'Surging Sparks', setNumber: '034', tpciCode: 'SSP 034', tpciSetCode: 'SSP', localSetId: 'sv8' },
  { id: 'SSP-076', name: 'Latias ex', imageUrl: getTCGdexImageUrl('SSP', '076'), setCode: 'SSP', setName: 'Surging Sparks', setNumber: '076', tpciCode: 'SSP 076', tpciSetCode: 'SSP', localSetId: 'sv8' },
  { id: 'SCR-128', name: 'Terapagos ex', imageUrl: getTCGdexImageUrl('SCR', '128'), setCode: 'SCR', setName: 'Stellar Crown', setNumber: '128', tpciCode: 'SCR 128', tpciSetCode: 'SCR', localSetId: 'sv7' },
  { id: 'SCR-131', name: 'Area Zero Underdepths', imageUrl: getTCGdexImageUrl('SCR', '131'), setCode: 'SCR', setName: 'Stellar Crown', setNumber: '131', tpciCode: 'SCR 131', tpciSetCode: 'SCR', localSetId: 'sv7' },
  { id: 'SFA-020', name: 'Dusknoir', imageUrl: getTCGdexImageUrl('SFA', '020'), setCode: 'SFA', setName: 'Shrouded Fable', setNumber: '020', tpciCode: 'SFA 020', tpciSetCode: 'SFA', localSetId: 'sv6pt5' },
  { id: 'SFA-096', name: 'Fezandipiti ex', imageUrl: getTCGdexImageUrl('SFA', '096'), setCode: 'SFA', setName: 'Shrouded Fable', setNumber: '096', tpciCode: 'SFA 096', tpciSetCode: 'SFA', localSetId: 'sv6pt5' },
  { id: 'TWM-130', name: 'Dragapult ex', imageUrl: getTCGdexImageUrl('TWM', '130'), setCode: 'TWM', setName: 'Twilight Masquerade', setNumber: '130', tpciCode: 'TWM 130', tpciSetCode: 'TWM', localSetId: 'sv6' },
  { id: 'TWM-025', name: 'Teal Mask Ogerpon ex', imageUrl: getTCGdexImageUrl('TWM', '025'), setCode: 'TWM', setName: 'Twilight Masquerade', setNumber: '025', tpciCode: 'TWM 025', tpciSetCode: 'TWM', localSetId: 'sv6' },
  { id: 'TWM-095', name: 'Munkidori', imageUrl: getTCGdexImageUrl('TWM', '095'), setCode: 'TWM', setName: 'Twilight Masquerade', setNumber: '095', tpciCode: 'TWM 095', tpciSetCode: 'TWM', localSetId: 'sv6' },
  { id: 'TEF-123', name: 'Raging Bolt ex', imageUrl: getTCGdexImageUrl('TEF', '123'), setCode: 'TEF', setName: 'Temporal Forces', setNumber: '123', tpciCode: 'TEF 123', tpciSetCode: 'TEF', localSetId: 'sv5' },
  { id: 'TEF-144', name: 'Buddy-Buddy Poffin', imageUrl: getTCGdexImageUrl('TEF', '144'), setCode: 'TEF', setName: 'Temporal Forces', setNumber: '144', tpciCode: 'TEF 144', tpciSetCode: 'TEF', localSetId: 'sv5' },
  { id: 'TEF-157', name: 'Prime Catcher', imageUrl: getTCGdexImageUrl('TEF', '157'), setCode: 'TEF', setName: 'Temporal Forces', setNumber: '157', tpciCode: 'TEF 157', tpciSetCode: 'TEF', localSetId: 'sv5' },
  { id: 'OBF-125', name: 'Charizard ex', imageUrl: getTCGdexImageUrl('OBF', '125'), setCode: 'OBF', setName: 'Obsidian Flames', setNumber: '125', tpciCode: 'OBF 125', tpciSetCode: 'OBF', localSetId: 'sv3' },
  { id: 'OBF-225', name: 'Pidgeot ex', imageUrl: getTCGdexImageUrl('OBF', '225'), setCode: 'OBF', setName: 'Obsidian Flames', setNumber: '225', tpciCode: 'OBF 225', tpciSetCode: 'OBF', localSetId: 'sv3' },
  { id: 'MEW-151', name: 'Mew ex', imageUrl: getTCGdexImageUrl('MEW', '151'), setCode: 'MEW', setName: '151', setNumber: '151', tpciCode: 'MEW 151', tpciSetCode: 'MEW', localSetId: 'sv3pt5' },
  { id: 'PAL-185', name: 'Iono', imageUrl: getTCGdexImageUrl('PAL', '185'), setCode: 'PAL', setName: 'Paldea Evolved', setNumber: '185', tpciCode: 'PAL 185', tpciSetCode: 'PAL', localSetId: 'sv2' },
  { id: 'PAL-172', name: 'Boss\'s Orders', imageUrl: getTCGdexImageUrl('PAL', '172'), setCode: 'PAL', setName: 'Paldea Evolved', setNumber: '172', tpciCode: 'PAL 172', tpciSetCode: 'PAL', localSetId: 'sv2' },
  { id: 'PAL-188', name: 'Super Rod', imageUrl: getTCGdexImageUrl('PAL', '188'), setCode: 'PAL', setName: 'Paldea Evolved', setNumber: '188', tpciCode: 'PAL 188', tpciSetCode: 'PAL', localSetId: 'sv2' },
  { id: 'SVI-166', name: 'Arven', imageUrl: getTCGdexImageUrl('SVI', '166'), setCode: 'SVI', setName: 'Scarlet & Violet Base', setNumber: '166', tpciCode: 'SVI 166', tpciSetCode: 'SVI', localSetId: 'sv1' },
  { id: 'SVI-181', name: 'Nest Ball', imageUrl: getTCGdexImageUrl('SVI', '181'), setCode: 'SVI', setName: 'Scarlet & Violet Base', setNumber: '181', tpciCode: 'SVI 181', tpciSetCode: 'SVI', localSetId: 'sv1' },
  { id: 'SVI-196', name: 'Ultra Ball', imageUrl: getTCGdexImageUrl('SVI', '196'), setCode: 'SVI', setName: 'Scarlet & Violet Base', setNumber: '196', tpciCode: 'SVI 196', tpciSetCode: 'SVI', localSetId: 'sv1' },
  { id: 'SVI-191', name: 'Rare Candy', imageUrl: getTCGdexImageUrl('SVI', '191'), setCode: 'SVI', setName: 'Scarlet & Violet Base', setNumber: '191', tpciCode: 'SVI 191', tpciSetCode: 'SVI', localSetId: 'sv1' }
];

export function normalizeSearchTerm(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const MODERN_MEGA_SET_IDS = new Set(['asc', 'pfl', 'por', 'meg', 'cri', 'pbl']);

/**
 * Executes a fast, 100% reliable local search against the modern Pokémon catalog.
 * Guarantees that whether on GitHub Pages, offline, or when backend API returns 404,
 * the user can ALWAYS browse and search modern sets and Mega Evolution cards with PTCGL formats.
 */
export function searchCardsLocally(rawQuery: string, rawSet: string): CatalogCard[] {
  const normQuery = normalizeSearchTerm(rawQuery);
  const normSet = normalizeSearchTerm(rawSet);

  const tpciFromRawSet = rawSet ? normalizeTPCiSetCode(rawSet) : '';
  let resolvedSetToken = tpciFromRawSet;
  let resolvedNumber = '';
  let queryText = normQuery;

  // Check aliases for set queries (e.g. "herois excelsor" -> "ASC")
  if (!resolvedSetToken && SET_QUERY_ALIASES[normQuery]) {
    resolvedSetToken = (LOCAL_TO_TPCI_SET_MAP[SET_QUERY_ALIASES[normQuery]] || SET_QUERY_ALIASES[normQuery]).toUpperCase();
    queryText = '';
  }

  // Detect TPCi code search like "ASC 085" or "PFL 013" or "TWM 130"
  const codeMatch = rawQuery.match(/^([A-Za-z0-9.-]{2,7})[- ]+(\d+|promo)$/i);
  if (codeMatch) {
    resolvedSetToken = normalizeTPCiSetCode(codeMatch[1]);
    resolvedNumber = codeMatch[2].replace(/^0+/, '') || '1';
    queryText = '';
  }

  const isMegaSearch = queryText.includes('mega') || 
                       MODERN_MEGA_SET_IDS.has(resolvedSetToken.toLowerCase()) || 
                       MODERN_MEGA_SET_IDS.has(normSet);

  const matched = MODERN_CARDS_CATALOG.filter(c => {
    const cardSetCode = (c.setCode || '').toUpperCase();
    const cardLocalSet = (c.localSetId || '').toLowerCase();
    const cardSetName = normalizeSearchTerm(c.setName || '');
    const cardName = normalizeSearchTerm(c.name || '');

    // Set filter
    if (resolvedSetToken) {
      const setMatches = cardSetCode === resolvedSetToken ||
                         cardLocalSet === resolvedSetToken.toLowerCase() ||
                         cardSetCode.toLowerCase().includes(normSet) ||
                         cardSetName.includes(normSet);
      if (!setMatches) return false;
    }

    // Number filter
    if (resolvedNumber) {
      const cardNum = String(c.setNumber).replace(/^0+/, '');
      if (cardNum !== resolvedNumber && c.setNumber !== resolvedNumber) {
        return false;
      }
    }

    // Query text filter
    if (queryText) {
      if (SET_QUERY_ALIASES[queryText]) {
        const aliasTarget = (LOCAL_TO_TPCI_SET_MAP[SET_QUERY_ALIASES[queryText]] || SET_QUERY_ALIASES[queryText]).toUpperCase();
        if (cardSetCode === aliasTarget) return true;
      }
      const nameMatches = cardName.includes(queryText);
      const setMatches = cardSetCode.toLowerCase().includes(queryText) || cardSetName.includes(queryText);
      const numMatches = c.setNumber && String(c.setNumber).includes(queryText);
      const megaMatches = isMegaSearch && cardName.includes('mega');
      return nameMatches || setMatches || numMatches || megaMatches;
    }

    return true;
  });

  // If user searched for "mega" and we have mega cards, sort them to the very top
  if (isMegaSearch) {
    return matched.sort((a, b) => {
      const aIsMega = a.name.toLowerCase().includes('mega') ? 1 : 0;
      const bIsMega = b.name.toLowerCase().includes('mega') ? 1 : 0;
      return bIsMega - aIsMega;
    });
  }

  return matched;
}

// Auto-seed collection registry with modern meta cards
try {
  registerCollectionCards(MODERN_CARDS_CATALOG);
} catch {
  // safe fallback
}
