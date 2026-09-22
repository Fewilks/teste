// ============================================================================
// pokemonLocalApi.ts — Porta os endpoints do server.ts pro navegador
// ============================================================================

import { COMPREHENSIVE_SETS as CATALOG_SETS } from '../data/pokemonCatalog';

// ----------------------------------------------------------------------------
// 1. MAPAS DE SET (iguais ao server.ts)
// ----------------------------------------------------------------------------

const SET_TO_TCGDEX_MAP: Record<string, { series: string; set: string }> = {
  'ASC': { series: 'me', set: 'me02.5' },
  'PFL': { series: 'me', set: 'me02' },
  'POR': { series: 'me', set: 'me03' },
  'MEG': { series: 'me', set: 'me01' },
  'CRI': { series: 'me', set: 'me04' },
  'PBL': { series: 'me', set: 'me05' },
  'PRE': { series: 'sv', set: 'sv08.5' },
  'JTG': { series: 'sv', set: 'sv09' },
  'DRI': { series: 'sv', set: 'sv09.5' },
  'BLK': { series: 'sv', set: 'sv10' },
  'WHT': { series: 'sv', set: 'sv10.5' },
  'SSP': { series: 'sv', set: 'sv08' },
  'SCR': { series: 'sv', set: 'sv07' },
  'SFA': { series: 'sv', set: 'sv06.5' },
  'TWM': { series: 'sv', set: 'sv06' },
  'TEF': { series: 'sv', set: 'sv05' },
  'PAF': { series: 'sv', set: 'sv04.5' },
  'PAR': { series: 'sv', set: 'sv04' },
  'MEW': { series: 'sv', set: 'sv03.5' },
  'OBF': { series: 'sv', set: 'sv03' },
  'PAL': { series: 'sv', set: 'sv02' },
  'SVI': { series: 'sv', set: 'sv01' },
  'SVE': { series: 'sv', set: 'sve' },
  'SVP': { series: 'sv', set: 'svp' },
  'CRZ': { series: 'swsh', set: 'swsh12.5' },
  'SIT': { series: 'swsh', set: 'swsh12' },
  'LOR': { series: 'swsh', set: 'swsh11' },
  'ASR': { series: 'swsh', set: 'swsh10' },
  'BRS': { series: 'swsh', set: 'swsh09' },
  'FST': { series: 'swsh', set: 'swsh08' },
  'EVS': { series: 'swsh', set: 'swsh07' },
  'CRE': { series: 'swsh', set: 'swsh06' },
  'BST': { series: 'swsh', set: 'swsh05' },
  '30TH': { series: 'me', set: '30th' },
  '30TH-C': { series: 'me', set: '30th-c' },
};

const TPCI_TO_LOCAL_SET_MAP: Record<string, string> = {
  'SVI': 'sv1', 'PAL': 'sv2', 'OBF': 'sv3', 'MEW': 'sv3pt5', 'PAR': 'sv4',
  'PAF': 'sv45', 'TEF': 'sv5', 'TWM': 'sv6', 'SFA': 'sv6pt5', 'SCR': 'sv7',
  'SSP': 'sv8', 'PRE': 'sv8pt5', 'SVE': 'sve', 'SVP': 'svp',
  'ME1': 'me1', 'ME2': 'me2', 'ASC': 'asc', 'PFL': 'pfl', 'POR': 'por',
  'MEG': 'meg', 'CRI': 'cri', 'PBL': 'pbl', '30TH': '30th', '30TH-C': '30th-c',
  'JTG': 'jtg', 'DRI': 'dri', 'BLK': 'blk', 'WHT': 'wht',
  'SSH': 'swsh1', 'RCL': 'swsh2', 'DAA': 'swsh3', 'CPA': 'swsh35', 'VIV': 'swsh4',
  'SHF': 'swsh45', 'BST': 'swsh5', 'CRE': 'swsh6', 'EVS': 'swsh7', 'FST': 'swsh8',
  'BRS': 'swsh9', 'ASR': 'swsh10', 'PGO': 'pgo', 'LOR': 'swsh11', 'CEL': 'cel',
  'SIT': 'swsh12', 'CRZ': 'swsh12pt5',
};

const LOCAL_TO_TPCI_SET_MAP: Record<string, string> = {
  'sv1': 'SVI', 'sv2': 'PAL', 'sv3': 'OBF', 'sv3pt5': 'MEW', 'sv4': 'PAR',
  'sv45': 'PAF', 'sv5': 'TEF', 'sv6': 'TWM', 'sv6pt5': 'SFA', 'sv7': 'SCR',
  'sv8': 'SSP', 'sv8pt5': 'PRE', 'pre': 'PRE', 'sfa': 'SFA', 'twm': 'TWM',
  'tef': 'TEF', 'paf': 'PAF', 'par': 'PAR', 'obf': 'OBF', 'pal': 'PAL', 'sve': 'SVE',
  'me1': 'ME1', 'me2': 'ME2', 'me2.5': 'ME2', 'asc': 'ASC', 'pfl': 'PFL',
  'por': 'POR', 'meg': 'MEG', 'cri': 'CRI', 'pbl': 'PBL',
  '30th': '30TH', '30th-c': '30TH-C',
  'jtg': 'JTG', 'dri': 'DRI', 'blk': 'BLK', 'wht': 'WHT',
  'swsh12pt5': 'CRZ', 'crz': 'CRZ', 'swsh12': 'SIT', 'sit': 'SIT',
  'swsh11': 'LOR', 'lor': 'LOR', 'swsh10': 'ASR', 'asr': 'ASR',
  'swsh9': 'BRS', 'brs': 'BRS',
};

const SET_QUERY_ALIASES: Record<string, string> = {
  'herois excelsos': 'asc', 'heróis excelsos': 'asc', 'herois': 'asc',
  'ascended heroes': 'asc', 'asc': 'asc',
  'fogo fantasmagorico': 'pfl', 'fogo fantasmagórico': 'pfl', 'phantasmal flames': 'pfl', 'pfl': 'pfl',
  'ordem perfeita': 'por', 'perfect order': 'por', 'por': 'por',
  'mega evolucao': 'meg', 'mega evolução': 'meg', 'mega evolution': 'meg', 'meg': 'meg',
  'caos ascendente': 'cri', 'chaos rising': 'cri', 'cri': 'cri',
  'escuridao total': 'pbl', 'escuridão total': 'pbl', 'pitch black': 'pbl', 'pbl': 'pbl',
  'evolucoes prismaticas': 'pre', 'evoluções prismáticas': 'pre', 'prismatic evolutions': 'pre', 'pre': 'pre',
  'jornada em conjunto': 'jtg', 'journey together': 'jtg', 'jtg': 'jtg',
  'rivais destinados': 'dri', 'destined rivals': 'dri', 'dri': 'dri',
  'raio negro': 'blk', 'black bolt': 'blk', 'blk': 'blk',
  'chama branca': 'wht', 'white flare': 'wht', 'wht': 'wht',
  'celebracoes de 30 anos': '30th', 'celebrações de 30 anos': '30th', '30 anos': '30th',
  '30th': '30th', '30th-c': '30th-c',
};

// ----------------------------------------------------------------------------
// 2. COMPREHENSIVE_SETS — usa o catálogo local se existir, senão fallback interno
// ----------------------------------------------------------------------------

const FALLBACK_SETS = [
  { id: '30TH', ptcglCode: '30TH', localId: '30th', name: 'Celebrações de 30 Anos (30th Anniversary Celebration - 30TH)', series: 'Mega Evolution', releaseDate: '2026-02-27' },
  { id: '30TH-C', ptcglCode: '30TH-C', localId: '30th-c', name: 'Coleção Clássica de 30 Anos (30TH-C)', series: 'Mega Evolution', releaseDate: '2026-02-27' },
  { id: 'ASC', ptcglCode: 'ASC', localId: 'asc', name: 'Heróis Excelsos (Ascended Heroes - ASC)', series: 'Mega Evolution', releaseDate: '2026-01-30' },
  { id: 'PFL', ptcglCode: 'PFL', localId: 'pfl', name: 'Fogo Fantasmagórico (Phantasmal Flames - PFL)', series: 'Mega Evolution', releaseDate: '2025-11-14' },
  { id: 'POR', ptcglCode: 'POR', localId: 'por', name: 'Ordem Perfeita (Perfect Order - POR)', series: 'Mega Evolution', releaseDate: '2026-03-27' },
  { id: 'MEG', ptcglCode: 'MEG', localId: 'meg', name: 'Mega Evolução Base (MEG)', series: 'Mega Evolution', releaseDate: '2025-09-26' },
  { id: 'CRI', ptcglCode: 'CRI', localId: 'cri', name: 'Caos Ascendente (Chaos Rising - CRI)', series: 'Mega Evolution', releaseDate: '2026-05-22' },
  { id: 'PBL', ptcglCode: 'PBL', localId: 'pbl', name: 'Escuridão Total (Pitch Black - PBL)', series: 'Mega Evolution', releaseDate: '2026-07-17' },
  { id: 'PRE', ptcglCode: 'PRE', localId: 'pre', name: 'Evoluções Prismáticas (Prismatic Evolutions - PRE)', series: 'Scarlet & Violet', releaseDate: '2025-01-17' },
  { id: 'JTG', ptcglCode: 'JTG', localId: 'jtg', name: 'Jornada em Conjunto (Journey Together - JTG)', series: 'Scarlet & Violet', releaseDate: '2025-03-28' },
  { id: 'DRI', ptcglCode: 'DRI', localId: 'dri', name: 'Rivais Destinados (Destined Rivals - DRI)', series: 'Scarlet & Violet', releaseDate: '2025-05-30' },
  { id: 'BLK', ptcglCode: 'BLK', localId: 'blk', name: 'Raio Negro (Black Bolt - BLK)', series: 'Scarlet & Violet', releaseDate: '2025-07-18' },
  { id: 'WHT', ptcglCode: 'WHT', localId: 'wht', name: 'Chama Branca (White Flare - WHT)', series: 'Scarlet & Violet', releaseDate: '2025-07-18' },
  { id: 'SSP', ptcglCode: 'SSP', localId: 'sv8', name: 'Faíscas Impetuosas (Surging Sparks - SSP)', series: 'Scarlet & Violet', releaseDate: '2024-11-08' },
  { id: 'SCR', ptcglCode: 'SCR', localId: 'sv7', name: 'Coroa Estelar (Stellar Crown - SCR)', series: 'Scarlet & Violet', releaseDate: '2024-09-13' },
  { id: 'SFA', ptcglCode: 'SFA', localId: 'sv6pt5', name: 'Fábulas Nebulosas (Shrouded Fable - SFA)', series: 'Scarlet & Violet', releaseDate: '2024-08-02' },
  { id: 'TWM', ptcglCode: 'TWM', localId: 'sv6', name: 'Máscaras do Crepúsculo (Twilight Masquerade - TWM)', series: 'Scarlet & Violet', releaseDate: '2024-05-24' },
  { id: 'TEF', ptcglCode: 'TEF', localId: 'sv5', name: 'Forças Temporais (Temporal Forces - TEF)', series: 'Scarlet & Violet', releaseDate: '2024-03-22' },
  { id: 'PAF', ptcglCode: 'PAF', localId: 'sv45', name: 'Destinos de Paldea (Paldean Fates - PAF)', series: 'Scarlet & Violet', releaseDate: '2024-01-26' },
  { id: 'PAR', ptcglCode: 'PAR', localId: 'sv4', name: 'Fenda Paradoxal (Paradox Rift - PAR)', series: 'Scarlet & Violet', releaseDate: '2023-11-03' },
  { id: 'MEW', ptcglCode: 'MEW', localId: 'sv3pt5', name: '151 (MEW)', series: 'Scarlet & Violet', releaseDate: '2023-09-22' },
  { id: 'OBF', ptcglCode: 'OBF', localId: 'sv3', name: 'Obsidiana em Chamas (Obsidian Flames - OBF)', series: 'Scarlet & Violet', releaseDate: '2023-08-11' },
  { id: 'PAL', ptcglCode: 'PAL', localId: 'sv2', name: 'Evoluções em Paldea (Paldea Evolved - PAL)', series: 'Scarlet & Violet', releaseDate: '2023-06-09' },
  { id: 'SVI', ptcglCode: 'SVI', localId: 'sv1', name: 'Escarlate e Violeta Base (SVI)', series: 'Scarlet & Violet', releaseDate: '2023-03-31' },
];

const COMPREHENSIVE_SETS = Array.isArray(CATALOG_SETS) && CATALOG_SETS.length > 0
  ? (CATALOG_SETS as any[])
  : FALLBACK_SETS;

// ----------------------------------------------------------------------------
// 3. HELPERS
// ----------------------------------------------------------------------------

function getTCGdexImageUrl(setCode: string, setNumber: string | number, lang: 'pt' | 'en' = 'pt'): string {
  if (!setCode || !setNumber) return 'https://images.pokemontcg.io/card-back.png';
  const cleanSet = String(setCode).trim();
  const mapping =
    SET_TO_TCGDEX_MAP[cleanSet] ||
    SET_TO_TCGDEX_MAP[cleanSet.toUpperCase()] ||
    SET_TO_TCGDEX_MAP[cleanSet.toLowerCase()];

  const rawNum = String(setNumber).trim().replace(/^#/, '');
  const cleanNum = rawNum.replace(/^0+/, '') || '1';
  const paddedNum = cleanNum.padStart(3, '0');

  const isSvOrMe = mapping ? (mapping.series === 'sv' || mapping.series === 'me') : /^(sv|me)/i.test(cleanSet);
  const finalNum = isSvOrMe ? paddedNum : cleanNum;

  if (mapping) return `https://assets.tcgdex.net/${lang}/${mapping.series}/${mapping.set}/${finalNum}/high.webp`;
  return `https://assets.tcgdex.net/${lang}/sv/${cleanSet.toLowerCase()}/${finalNum}/high.webp`;
}

function normalizeSearchTerm(str: string): string {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Cache em memória para sets TCGdex completos
const TCGDEX_SET_CACHE = new Map<string, any[]>();

async function fetchTcgdexCompleteSet(
  tcgdexSetId: string,
  series: string,
  tpciSetCode: string,
  setNameFallback: string
): Promise<any[]> {
  const cacheKey = `${series}-${tcgdexSetId}`;
  if (TCGDEX_SET_CACHE.has(cacheKey)) return TCGDEX_SET_CACHE.get(cacheKey)!;

  let cardsData: any[] = [];
  const ptNameMap = new Map<string, string>();
  const ptImageMap = new Map<string, string>();

  const [ptResult, enResult] = await Promise.allSettled([
    fetch(`https://api.tcgdex.net/v2/pt/sets/${tcgdexSetId}`).then(r => r.ok ? r.json() : null),
    fetch(`https://api.tcgdex.net/v2/en/sets/${tcgdexSetId}`).then(r => r.ok ? r.json() : null),
  ]);

  const ptData = ptResult.status === 'fulfilled' ? ptResult.value : null;
  const enData = enResult.status === 'fulfilled' ? enResult.value : null;

  if (ptData?.cards) {
    for (const c of ptData.cards) {
      const cleanNum = String(c.localId || '').replace(/^0+/, '');
      if (cleanNum && c.name) ptNameMap.set(cleanNum, c.name);
      if (cleanNum && c.image) ptImageMap.set(cleanNum, `${c.image}/high.webp`);
    }
    cardsData = ptData.cards;
  }

  if (enData?.cards && enData.cards.length > cardsData.length) {
    cardsData = enData.cards;
  }

  if (cardsData.length === 0) return [];

  const isSvOrMe = series === 'sv' || series === 'me';
  const mapped = cardsData.map((c: any) => {
    const rawLocalId = String(c.localId || '').trim();
    const cleanNum = rawLocalId.replace(/^0+/, '') || '1';
    const formattedNum = isSvOrMe && /^\d+$/.test(rawLocalId) ? cleanNum.padStart(3, '0') : rawLocalId;

    let imageUrl = ptImageMap.get(cleanNum) || '';
    if (!imageUrl) {
      if (c.image) imageUrl = `${c.image}/high.webp`;
      else imageUrl = `https://assets.tcgdex.net/pt/${series}/${tcgdexSetId}/${formattedNum}/high.webp`;
    }

    const finalName = ptNameMap.get(cleanNum) || c.name;

    return {
      id: `${tpciSetCode}-${formattedNum}`,
      localId: c.id || `${tcgdexSetId}-${formattedNum}`,
      name: finalName,
      imageUrl,
      setCode: tpciSetCode,
      setName: setNameFallback,
      setNumber: formattedNum,
      tpciCode: `${tpciSetCode} ${formattedNum}`,
      tpciSetCode,
      localSetId: tcgdexSetId,
    };
  });

  TCGDEX_SET_CACHE.set(cacheKey, mapped);
  return mapped;
}

// ----------------------------------------------------------------------------
// 4. META DECKS (fallback)
// ----------------------------------------------------------------------------

const metaDecks = [
  { name: 'Pikachu ex', archetype: 'Pikachu ex / Latias ex / Magneton', share: 18.2, winRate: 55.4, imageUrl: 'https://images.pokemontcg.io/sv8/57.png', updatedAt: '2024-11-08', description: 'O deck do momento após Surging Sparks.', cards: [], rawList: '' },
  { name: 'Regidrago VSTAR', archetype: 'Regidrago VSTAR / Teal Mask Ogerpon', share: 14.5, winRate: 53.8, imageUrl: 'https://images.pokemontcg.io/swsh12/136.png', updatedAt: '2023-06-09', description: 'Extremamente versátil.', cards: [], rawList: '' },
  { name: 'Raging Bolt ex', archetype: 'Raging Bolt ex / Teal Mask Ogerpon', share: 13.2, winRate: 52.9, imageUrl: 'https://images.pokemontcg.io/sv5/123.png', updatedAt: '2024-03-22', description: 'Dano explosivo ilimitado.', cards: [], rawList: '' },
  { name: 'Terapagos ex', archetype: 'Terapagos ex / Pidgeot ex / Dusknoir', share: 15.1, winRate: 53.6, imageUrl: 'https://images.pokemontcg.io/sv7/128.png', updatedAt: '2024-09-13', description: 'Area Zero Underdepths + Dusknoir.', cards: [], rawList: '' },
  { name: 'Ceruledge ex', archetype: 'Ceruledge ex / Dusknoir / Pecharunt', share: 12.8, winRate: 52.8, imageUrl: 'https://images.pokemontcg.io/sv8/36.png', updatedAt: '2024-11-08', description: 'Descarte em massa de energias.', cards: [], rawList: '' },
  { name: 'Dragapult ex', archetype: 'Dragapult ex / Pidgeot ex', share: 10.4, winRate: 51.9, imageUrl: 'https://images.pokemontcg.io/sv6/130.png', updatedAt: '2024-05-24', description: 'Dano cirúrgico.', cards: [], rawList: '' },
];

// ----------------------------------------------------------------------------
// 5. FALLBACK CARDS
// ----------------------------------------------------------------------------

const fallbackCards: any[] = [
  { id: 'OBF-125', name: 'Charizard ex', setCode: 'OBF', setName: 'Obsidian Flames', setNumber: '125', localSetId: 'sv3' },
  { id: 'TWM-130', name: 'Dragapult ex', setCode: 'TWM', setName: 'Twilight Masquerade', setNumber: '130', localSetId: 'sv6' },
  { id: 'OBF-164', name: 'Pidgeot ex', setCode: 'OBF', setName: 'Obsidian Flames', setNumber: '164', localSetId: 'sv3' },
  { id: 'SFA-038', name: 'Fezandipiti ex', setCode: 'SFA', setName: 'Shrouded Fable', setNumber: '038', localSetId: 'sv6pt5' },
  { id: 'SCR-128', name: 'Terapagos ex', setCode: 'SCR', setName: 'Stellar Crown', setNumber: '128', localSetId: 'sv7' },
  { id: 'SSP-057', name: 'Pikachu ex', setCode: 'SSP', setName: 'Surging Sparks', setNumber: '057', localSetId: 'sv8' },
  { id: 'PAL-185', name: 'Iono', setCode: 'PAL', setName: 'Paldea Evolved', setNumber: '185', localSetId: 'sv2' },
  { id: 'SVI-166', name: 'Arven', setCode: 'SVI', setName: 'Scarlet & Violet Base', setNumber: '166', localSetId: 'sv1' },
  { id: 'TEF-144', name: 'Buddy-Buddy Poffin', setCode: 'TEF', setName: 'Temporal Forces', setNumber: '144', localSetId: 'sv5' },
  { id: 'TEF-157', name: 'Prime Catcher', setCode: 'TEF', setName: 'Temporal Forces', setNumber: '157', localSetId: 'sv5' },
  { id: 'SCR-131', name: 'Area Zero Underdepths', setCode: 'SCR', setName: 'Stellar Crown', setNumber: '131', localSetId: 'sv7' },
].map(c => ({
  ...c,
  imageUrl: getTCGdexImageUrl(c.setCode, c.setNumber),
  tpciCode: `${c.setCode} ${c.setNumber}`,
  tpciSetCode: c.setCode,
}));

// ----------------------------------------------------------------------------
// 6. HANDLERS DOS ENDPOINTS
// ----------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleMeta(): Promise<Response> {
  return jsonResponse({
    decks: metaDecks,
    tournamentName: 'Standard format meta (Local Database / Fallback)',
  });
}

async function handleSets(): Promise<Response> {
  // Retorna array DIRETO (igual ao server.ts)
  return jsonResponse(COMPREHENSIVE_SETS);
}

async function handleSearch(params: URLSearchParams): Promise<Response> {
  const rawQuery = (params.get('q') || '').trim();
  const rawSet = (params.get('set') || '').trim();

  if (!rawQuery && !rawSet) return jsonResponse([]);

  const normQuery = normalizeSearchTerm(rawQuery);
  const normSet = normalizeSearchTerm(rawSet);

  let resolvedSetId = rawSet ? (TPCI_TO_LOCAL_SET_MAP[rawSet.toUpperCase()] || rawSet.toLowerCase()) : '';
  let resolvedNumber = '';
  let nameQuery = rawQuery;

  if (!resolvedSetId && SET_QUERY_ALIASES[normQuery]) {
    resolvedSetId = SET_QUERY_ALIASES[normQuery];
    nameQuery = '';
  }

  const codeMatch = rawQuery.match(/^([A-Za-z0-9.-]{2,7})[- ]+(\d+|promo)$/i);
  if (codeMatch) {
    const setToken = codeMatch[1].toUpperCase();
    resolvedSetId = TPCI_TO_LOCAL_SET_MAP[setToken] || setToken.toLowerCase();
    resolvedNumber = codeMatch[2];
    nameQuery = '';
  } else {
    const ptcglNameMatch = rawQuery.match(/^(.+?)\s+([A-Za-z]{3,4})\s+(\d+)$/i);
    if (ptcglNameMatch) {
      nameQuery = ptcglNameMatch[1].trim();
      const setToken = ptcglNameMatch[2].toUpperCase();
      resolvedSetId = TPCI_TO_LOCAL_SET_MAP[setToken] || setToken.toLowerCase();
      resolvedNumber = ptcglNameMatch[3];
    }
  }

  const tcgdexMapping =
    (rawSet && SET_TO_TCGDEX_MAP[rawSet]) ||
    (rawSet && SET_TO_TCGDEX_MAP[rawSet.toUpperCase()]) ||
    (rawSet && SET_TO_TCGDEX_MAP[rawSet.toLowerCase()]) ||
    (resolvedSetId && SET_TO_TCGDEX_MAP[resolvedSetId.toUpperCase()]) ||
    (resolvedSetId && SET_TO_TCGDEX_MAP[resolvedSetId.toLowerCase()]);

  if (tcgdexMapping) {
    const rawSetCode = rawSet
      ? (LOCAL_TO_TPCI_SET_MAP[rawSet.toLowerCase()] || rawSet.toUpperCase())
      : (LOCAL_TO_TPCI_SET_MAP[resolvedSetId.toLowerCase()] || resolvedSetId.toUpperCase());
    const matchedExp = COMPREHENSIVE_SETS.find((s: any) =>
      s.id?.toUpperCase() === rawSetCode ||
      s.ptcglCode?.toUpperCase() === rawSetCode ||
      (s.localId && s.localId.toLowerCase() === rawSetCode.toLowerCase())
    );
    const setName = matchedExp?.name || rawSet || resolvedSetId;

    try {
      const allCards = await fetchTcgdexCompleteSet(tcgdexMapping.set, tcgdexMapping.series, rawSetCode, setName);
      if (allCards.length > 0) {
        let results = allCards;

        if (resolvedNumber) {
          const targetClean = resolvedNumber.replace(/^0+/, '');
          results = results.filter(c =>
            c.setNumber === resolvedNumber ||
            String(c.setNumber).replace(/^0+/, '') === targetClean
          );
        }

        if (nameQuery) {
          const nq = normalizeSearchTerm(nameQuery);
          results = results.filter(c => normalizeSearchTerm(c.name).includes(nq));
        }

        if (results.length > 0) return jsonResponse(results);
      }
    } catch (err) {
      console.warn('[pokemonLocalApi] TCGdex fetch error:', err);
    }
  }

  const normQ = normalizeSearchTerm(nameQuery || rawQuery);
  const matched = fallbackCards.filter(c => {
    const cardSetCode = (c.setCode || '').toLowerCase();
    const cardName = normalizeSearchTerm(c.name || '');

    if (resolvedSetId) {
      const setMatches =
        cardSetCode === resolvedSetId ||
        cardSetCode === (TPCI_TO_LOCAL_SET_MAP[resolvedSetId.toUpperCase()] || '').toLowerCase() ||
        cardSetCode.includes(normSet);
      if (!setMatches) return false;
    }

    if (normQ) {
      return cardName.includes(normQ) || (c.setNumber && String(c.setNumber).includes(normQ));
    }
    return true;
  });

  return jsonResponse(matched);
}

async function handleParseDeck(body: string): Promise<Response> {
  // Regex parser (mesmo do server.ts, sem Gemini)
  const lines = String(body || '').split('\n');
  const cards: any[] = [];
  let currentCategory: 'Pokémon' | 'Treinador' | 'Energia' = 'Pokémon';

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('pokémon:') || lowerLine.startsWith('pokemon:')) { currentCategory = 'Pokémon'; continue; }
    if (lowerLine.startsWith('treinador:') || lowerLine.startsWith('trainer:') || lowerLine.startsWith('trainers:')) { currentCategory = 'Treinador'; continue; }
    if (lowerLine.startsWith('energia:') || lowerLine.startsWith('energy:')) { currentCategory = 'Energia'; continue; }

    const match = line.match(/^(\d+)\s+(.+?)(?:\s+([A-Z]{3,4}|[a-z]{3,4})\s+(\d+))?$/);
    if (match) {
      const count = parseInt(match[1], 10);
      const name = match[2].trim();
      const set = match[3] ? match[3].toUpperCase() : undefined;
      const number = match[4] || undefined;

      const imageUrl = set && number
        ? getTCGdexImageUrl(set, number)
        : 'https://images.pokemontcg.io/card-back.png';

      cards.push({ name, count, set, number, type: currentCategory, imageUrl });
    } else {
      const simpleMatch = line.match(/^(\d+)\s+(.+)$/);
      if (simpleMatch) {
        cards.push({
          name: simpleMatch[2].trim(),
          count: parseInt(simpleMatch[1], 10),
          type: currentCategory,
          imageUrl: 'https://images.pokemontcg.io/card-back.png',
        });
      }
    }
  }

  return jsonResponse(cards);
}

// ----------------------------------------------------------------------------
// 7. INTERCEPTOR DE FETCH
// ----------------------------------------------------------------------------

let _installed = false;

async function handleLocalApi(url: string, init?: RequestInit): Promise<Response> {
  const u = new URL(url, 'http://local');
  const path = u.pathname;
  const method = (init?.method || 'GET').toUpperCase();

  try {
    if (/\/api\/health\/?$/.test(path)) return jsonResponse({ status: 'ok' });
    if (/\/api\/pokemon\/meta\/?$/.test(path)) return handleMeta();
    if (/\/api\/pokemon\/sets\/?$/.test(path)) return handleSets();
    if (/\/api\/pokemon\/search\/?$/.test(path)) return handleSearch(u.searchParams);
    if (/\/api\/pokemon\/parse-deck\/?$/.test(path) && method === 'POST') {
      let bodyText = '';
      try {
        const parsed = init?.body ? JSON.parse(String(init.body)) : {};
        bodyText = parsed.deckText || '';
      } catch { /* ignora */ }
      return handleParseDeck(bodyText);
    }
    return jsonResponse({ error: 'Endpoint não suportado', path }, 404);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

export function installPokemonApiInterceptor(): void {
  if (typeof window === 'undefined') return;
  if (_installed) return;

  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : fetch.bind(globalThis);

    const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let url = '';
      if (typeof input === 'string') url = input;
      else if (input instanceof URL) url = input.toString();
      else if (input && typeof input === 'object' && 'url' in input) url = (input as Request).url;

      if (/\/api\/pokemon\//.test(url) || /\/api\/health/.test(url)) {
        // Tenta o servidor real primeiro se acessível
        try {
          const resp = await originalFetch(input, init);
          if (resp && resp.ok) {
            return resp;
          }
        } catch {
          // Servidor indisponível ou ambiente estático (ex: GitHub Pages ou mobile sem backend)
        }
        return handleLocalApi(url, init);
      }

      return originalFetch(input, init);
    };

    let overridden = false;

    // 1. Tentar Object.defineProperty no window
    try {
      Object.defineProperty(window, 'fetch', {
        value: customFetch,
        writable: true,
        configurable: true,
      });
      overridden = true;
    } catch {
      // Ignora erro se window.fetch for getter-only ou protegido
    }

    // 2. Se não conseguiu, tentar no Window.prototype
    if (!overridden && typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
        });
        overridden = true;
      } catch {
        // Ignora erro
      }
    }

    // 3. Tentar globalThis como fallback
    if (!overridden && typeof globalThis !== 'undefined') {
      try {
        (globalThis as any).fetch = customFetch;
        overridden = true;
      } catch {
        // Ignora erro
      }
    }

    _installed = true;
    if (overridden) {
      console.info('[pokemonLocalApi] interceptor instalado com sucesso');
    } else {
      console.warn('[pokemonLocalApi] fetch nativo protegido — prosseguindo normalmente sem interceptor');
    }
  } catch (err) {
    console.warn('[pokemonLocalApi] Falha suave ao registrar interceptor:', err);
  }
}
