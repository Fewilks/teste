// ============================================================================
// tcgdexRuntime.ts — Cliente da API TCGdex com cache
//
// Uso: consulta a TCGdex pra descobrir o número REAL de qualquer carta pelo
// nome, dentro de um set específico. Sem chutar números na mão.
//
// Endpoint usado: https://api.tcgdex.net/v2/{lang}/sets/{setId}
//   → devolve { id, name, cards: [{ id, localId, name, image }, ...] }
//
// Cache em 2 níveis:
//   1) memória (Map) — instantâneo
//   2) localStorage — persiste por 7 dias
// ============================================================================

const API_BASE = 'https://api.tcgdex.net/v2';

export interface TcgdexCardBrief {
  id: string;         // "sv03-125"
  localId: string;    // "125"
  name: string;       // "Charizard ex"
  image?: string;     // "https://assets.tcgdex.net/pt/sv/sv03/125"
}

export interface TcgdexSetDetail {
  id: string;         // "sv03"
  name: string;       // "Obsidian Flames"
  cards: TcgdexCardBrief[];
}

// ----------------------------------------------------------------------------
// CACHE
// ----------------------------------------------------------------------------

const memCache = new Map<string, TcgdexSetDetail | null>();
const inflight = new Map<string, Promise<TcgdexSetDetail | null>>();

const LS_PREFIX = 'tcgdex:set:';
const LS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

function loadFromLS(key: string): TcgdexSetDetail | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: TcgdexSetDetail | null };
    if (Date.now() - parsed.ts > LS_TTL_MS) {
      localStorage.removeItem(LS_PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch { return null; }
}

function saveToLS(key: string, data: TcgdexSetDetail | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota — ignora */ }
}

// ----------------------------------------------------------------------------
// NORMALIZAÇÃO DE NOME
// ----------------------------------------------------------------------------

export function normalizeCardLookup(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------------------
// FETCH DE SET
// ----------------------------------------------------------------------------

export async function fetchTcgdexSet(
  setId: string,
  lang: 'pt' | 'en' = 'pt'
): Promise<TcgdexSetDetail | null> {
  const key = `${lang}:${setId}`;

  if (memCache.has(key)) return memCache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const cached = loadFromLS(key);
  if (cached) {
    memCache.set(key, cached);
    return cached;
  }

  const promise = (async (): Promise<TcgdexSetDetail | null> => {
    try {
      const r = await fetch(`${API_BASE}/${lang}/sets/${setId}`);
      if (!r.ok) {
        memCache.set(key, null);
        saveToLS(key, null);
        return null;
      }
      const json = (await r.json()) as TcgdexSetDetail;
      memCache.set(key, json);
      saveToLS(key, json);
      return json;
    } catch {
      memCache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

// ----------------------------------------------------------------------------
// BUSCA POR NOME DENTRO DE UM SET
// ----------------------------------------------------------------------------

export async function findCardInSet(
  setId: string,
  cardName: string,
  lang: 'pt' | 'en' = 'pt'
): Promise<TcgdexCardBrief | null> {
  const set = await fetchTcgdexSet(setId, lang);
  if (!set?.cards || !Array.isArray(set.cards)) return null;

  const target = normalizeCardLookup(cardName);

  // 1) match exato
  let found = set.cards.find(c => normalizeCardLookup(c.name) === target);
  if (found) return found;

  // 2) match com strip de sufixos (ex, v, vstar, vmax, gx, "da lilian" etc)
  const stripped = target
    .replace(/\s+(ex|v|vstar|vmax|gx|break)$/i, '')
    .replace(/\s+(da|do|de)\s+[a-z0-9\s]+$/i, '')
    .trim();

  if (stripped && stripped !== target) {
    found = set.cards.find(c => normalizeCardLookup(c.name) === stripped);
    if (found) return found;
  }

  // 3) match por prefixo (ex: "Dunsparce" casa "Dunsparce") — mas cuidado com falso positivo
  //    Só aceita se o candidato tiver o mesmo "core" (sem sufixos)
  const candidates = set.cards.filter(c => {
    const cNorm = normalizeCardLookup(c.name);
    return cNorm === stripped || cNorm.startsWith(stripped + ' ');
  });
  if (candidates.length === 1) return candidates[0];
  // Se tem vários candidatos com mesmo core, prefere o sem sufixo
  if (candidates.length > 1) {
    const exactCore = candidates.find(c => normalizeCardLookup(c.name) === stripped);
    return exactCore || candidates[0];
  }

  return null;
}

// ----------------------------------------------------------------------------
// BUSCA EM VÁRIOS SETS (em ordem de prioridade)
// ----------------------------------------------------------------------------

export async function findCardInSets(
  setIds: string[],
  cardName: string,
  lang: 'pt' | 'en' = 'pt'
): Promise<{ set: TcgdexSetDetail; card: TcgdexCardBrief } | null> {
  // Fetch todos em paralelo, mas retorna o primeiro match na ORDEM pedida
  const results = await Promise.all(
    setIds.map(async setId => {
      const set = await fetchTcgdexSet(setId, lang);
      if (!set) return null;
      const card = await findCardInSet(setId, cardName, lang);
      return card ? { set, card } : null;
    })
  );
  for (const r of results) if (r) return r;
  return null;
}

// ----------------------------------------------------------------------------
// WARMUP — baixa vários sets em background
// ----------------------------------------------------------------------------

export function warmupSets(setIds: string[], lang: 'pt' | 'en' = 'pt'): void {
  // Não bloqueia. Só dispara os fetches pra encher o cache.
  for (const id of setIds) {
    fetchTcgdexSet(id, lang).catch(() => { /* ignora */ });
  }
}

// ----------------------------------------------------------------------------
// DEBUG
// ----------------------------------------------------------------------------

export function clearTcgdexCache(): void {
  memCache.clear();
  inflight.clear();
  try {
    if (typeof localStorage !== 'undefined') {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(LS_PREFIX)) keys.push(k);
      }
      for (const k of keys) localStorage.removeItem(k);
    }
  } catch { /* ignora */ }
}
