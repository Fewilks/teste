import { MetaDeck } from '../types';
import { fallbackMetaDecks } from '../data/fallbackDecks';
import { limitlessUrl } from '../utils/setSync';

export interface LimitlessApiResponse {
  decks: MetaDeck[];
  tournamentName: string;
  tournamentDate?: string;
  playersCount?: number;
  source: 'api-server' | 'api-direct-limitless' | 'offline-fallback' | 'local-storage-cache';
  cachedAt?: string;
}

export const METAGAME_CACHE_KEY = 'spirits_metagame_cache';

/**
 * Lê o último estado do metagame salvo em localStorage.
 * Retorna null se não houver dados gravados ou se a estrutura estiver corrompida.
 */
export function getStoredMetaDecks(): LimitlessApiResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(METAGAME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.decks) && parsed.decks.length > 0) {
      return {
        decks: parsed.decks,
        tournamentName: parsed.tournamentName || 'Metagame (Cache Local)',
        tournamentDate: parsed.tournamentDate,
        playersCount: parsed.playersCount,
        source: 'local-storage-cache',
        cachedAt: parsed.cachedAt
      };
    }
  } catch (e) {
    console.warn('Erro ao ler cache de metagame do localStorage:', e);
  }
  return null;
}

/**
 * Persiste os dados válidos do metagame no localStorage do navegador.
 */
export function saveStoredMetaDecks(data: LimitlessApiResponse): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (data && Array.isArray(data.decks) && data.decks.length > 0 && data.source !== 'offline-fallback') {
      const payload = {
        decks: data.decks,
        tournamentName: data.tournamentName,
        tournamentDate: data.tournamentDate || new Date().toISOString().split('T')[0],
        playersCount: data.playersCount,
        source: data.source,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem(METAGAME_CACHE_KEY, JSON.stringify(payload));
      return true;
    }
  } catch (e) {
    console.warn('Erro ao salvar metagame no localStorage:', e);
  }
  return false;
}

// In-memory client cache and deduplication
let cachedMetaResponse: { data: LimitlessApiResponse; timestamp: number } | null = null;
let activeFetchPromise: Promise<LimitlessApiResponse> | null = null;
const CLIENT_CACHE_TTL = 3 * 60 * 1000; // 3 minutos de cache em memória

/**
 * Detecta se o aplicativo está rodando em uma hospedagem estática (como GitHub Pages)
 * onde não existe servidor backend Express para responder rotas /api/*.
 */
export function isStaticDeployment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host.endsWith('github.io') ||
    host.includes('github') ||
    host.endsWith('.surge.sh') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.web.app') ||
    window.location.protocol === 'file:'
  );
}

/**
 * Converte a estrutura de decklist retornada pela Limitless TCG API
 * para o formato de texto canônico do PTCGL (Pokémon TCG Live).
 */
export function formatLimitlessDecklistToPTCGL(decklist: {
  pokemon?: { count: number; name: string; set?: string; number?: string }[];
  trainer?: { count: number; name: string; set?: string; number?: string }[];
  energy?: { count: number; name: string; set?: string; number?: string }[];
}): string {
  const sections: string[] = [];

  if (decklist.pokemon && decklist.pokemon.length > 0) {
    const total = decklist.pokemon.reduce((acc, p) => acc + (p.count || 1), 0);
    const lines = decklist.pokemon.map(p => `${p.count} ${p.name} ${p.set || ''} ${p.number || ''}`.trim());
    sections.push(`Pokémon: ${total}\n${lines.join('\n')}`);
  }

  if (decklist.trainer && decklist.trainer.length > 0) {
    const total = decklist.trainer.reduce((acc, t) => acc + (t.count || 1), 0);
    const lines = decklist.trainer.map(t => `${t.count} ${t.name} ${t.set || ''} ${t.number || ''}`.trim());
    sections.push(`Trainer: ${total}\n${lines.join('\n')}`);
  }

  if (decklist.energy && decklist.energy.length > 0) {
    const total = decklist.energy.reduce((acc, e) => acc + (e.count || 1), 0);
    const lines = decklist.energy.map(e => `${e.count} ${e.name} ${e.set || ''} ${e.number || ''}`.trim());
    sections.push(`Energy: ${total}\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Resolve a imagem de capa mais representativa para um deck da Limitless.
 */
function resolveBestDeckImage(pokemonCards: { name: string; set?: string; number?: string }[]): string {
  if (!pokemonCards || pokemonCards.length === 0) {
    return 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TWM/TWM_130_R_EN_LG.png';
  }

  // Prioriza atacantes ex, VSTAR ou Mega
  const aceCard = pokemonCards.find(p => 
    p.name.toLowerCase().includes('ex') || 
    p.name.toLowerCase().includes('vstar') ||
    p.name.toLowerCase().includes('mega')
  ) || pokemonCards[0];

  if (aceCard.set && aceCard.number) {
    const url = limitlessUrl(aceCard.set, aceCard.number);
    if (url) return url;
  }

  // Fallbacks visuais conhecidos
  const lower = (aceCard.name || '').toLowerCase();
  if (lower.includes('starmie')) return 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/POR/POR_021_R_EN_LG.png';
  if (lower.includes('dragapult')) return 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TWM/TWM_130_R_EN_LG.png';
  if (lower.includes('charizard')) return 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/OBF/OBF_125_R_EN_LG.png';
  if (lower.includes('gardevoir')) return 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/SVI/SVI_086_R_EN_LG.png';
  if (lower.includes('ogerpon')) return 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TWM/TWM_025_R_EN_LG.png';
  if (lower.includes('bolt')) return 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TEF/TEF_123_R_EN_LG.png';

  return 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TWM/TWM_130_R_EN_LG.png';
}

/**
 * Busca dados diretamente da API oficial da Limitless TCG no cliente.
 * Funciona nativamente no GitHub Pages, mobile e PWA graças ao header CORS (access-control-allow-origin: *).
 */
export async function fetchLimitlessDirect(): Promise<LimitlessApiResponse | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    // 1. Busca lista de torneios recentes de Standard Format
    const cacheBuster = `_t=${Date.now()}`;
    const tournamentsUrl = `https://play.limitlesstcg.com/api/tournaments?game=PTCG&format=STANDARD&${cacheBuster}`;
    
    const tResp = await fetch(tournamentsUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeoutId);

    if (!tResp.ok) {
      throw new Error(`Limitless API HTTP ${tResp.status}`);
    }

    const tournaments: any[] = await tResp.json();
    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      throw new Error('Nenhum torneio retornado pela API');
    }

    // Torneios com muitos jogadores (>= 25) praticamente sempre possuem decklists validadas.
    // Ordenamos os torneios recentes prioritariamente por maior número de jogadores
    // para encontrar as listas logo na primeira requisição de standings e economizar chamadas.
    const recent = tournaments.slice(0, 15);
    const sortedCandidates = [...recent].sort((a, b) => (b.players || 0) - (a.players || 0));
    const pool = sortedCandidates.filter(t => (t.players || 0) >= 16);
    const candidates = pool.length > 0 ? pool : sortedCandidates;

    // Percorre no máximo os 2 melhores torneios para não sobrecarregar limites de requisição da Limitless
    for (const tour of candidates.slice(0, 2)) {
      try {
        const standingsController = new AbortController();
        const sTimeoutId = setTimeout(() => standingsController.abort(), 7000);

        const standingsUrl = `https://play.limitlesstcg.com/api/tournaments/${tour.id}/standings?${cacheBuster}`;
        const sResp = await fetch(standingsUrl, {
          signal: standingsController.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(sTimeoutId);

        if (!sResp.ok) continue;

        const standings: any[] = await sResp.json();
        if (!Array.isArray(standings)) continue;

        const withDecks = standings.filter(
          s => s.decklist && Array.isArray(s.decklist.pokemon) && s.decklist.pokemon.length > 0
        );

        if (withDecks.length >= 3) {
          // Processa até os 10 melhores colocados
          const tourDateStr = tour.date ? new Date(tour.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const topDecks: MetaDeck[] = withDecks.slice(0, 10).map((item, index) => {
            const place = typeof item.placing === 'number' ? item.placing : index + 1;
            const wins = item.record?.wins || 0;
            const losses = item.record?.losses || 0;
            const ties = item.record?.ties || 0;
            const totalMatches = wins + losses + ties;
            const computedWinRate = totalMatches > 0
              ? parseFloat(((wins / totalMatches) * 100).toFixed(1))
              : parseFloat((65 - (place * 1.2)).toFixed(1));

            const deckName = item.deck?.name || 
              item.decklist.pokemon.find((p: any) => p.name.includes('ex') || p.name.includes('VSTAR'))?.name || 
              'Deck Competitivo';

            const countryStr = item.country ? ` (${item.country})` : '';
            const playerName = item.name || 'Jogador';
            const rawList = formatLimitlessDecklistToPTCGL(item.decklist);
            const topCards = (item.decklist.pokemon || []).slice(0, 4).map((p: any) => ({
              name: `${p.name} (${p.set || ''} ${p.number || ''})`.trim(),
              count: p.count || 1
            }));

            const imageUrl = resolveBestDeckImage(item.decklist.pokemon || []);

            return {
              name: deckName,
              archetype: `Jogador: ${playerName}${countryStr} (${place}º Lugar)`,
              share: place,
              winRate: Math.max(48, Math.min(85, computedWinRate)),
              imageUrl,
              description: `Baralho oficial utilizado por ${playerName} conquistando o ${place}º lugar no torneio '${tour.name}' (${tour.players || 0} jogadores) com lista validada pela Limitless TCG.`,
              updatedAt: tourDateStr,
              cards: topCards,
              rawList
            };
          });

          return {
            decks: topDecks,
            tournamentName: tour.name,
            tournamentDate: tourDateStr,
            playersCount: tour.players || topDecks.length,
            source: 'api-direct-limitless'
          };
        }
      } catch (err) {
        console.warn(`Erro ao verificar torneio ${tour.id}:`, err);
      }
    }

    return null;
  } catch (err) {
    console.warn('Erro ao consultar Limitless TCG diretamente via client:', err);
    return null;
  }
}

/**
 * Busca de baralhos do metagame com garantia de dados em tempo real:
 * 1. No GitHub Pages ou hosts estáticos, chama DIRETAMENTE a API oficial da Limitless TCG sem chamar /api/*
 *    (evitando assim o erro HTTP 404 em hosts estáticos).
 * 2. Em ambientes com servidor Node/Express, utiliza o proxy `/api/pokemon/meta`.
 * 3. Possui controle de cache em memória e deduplicação de requisições concorrentes.
 * 4. Fallback imediato para listas locais consolidadas caso o dispositivo esteja sem internet.
 */
export async function fetchLiveMetaDecks(forceRefresh = true): Promise<LimitlessApiResponse> {
  const now = Date.now();

  // Se já temos cache fresco na sessão e não foi forçado, entrega imediatamente
  if (!forceRefresh && cachedMetaResponse && (now - cachedMetaResponse.timestamp < CLIENT_CACHE_TTL)) {
    return cachedMetaResponse.data;
  }

  // Se já existe uma requisição em andamento, reaproveita a Promise (evita requisições duplicadas)
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const isStatic = isStaticDeployment();

      // Se NÃO for hospedagem estática (ex: dev local ou servidor Cloud Run com Node ativo),
      // tenta o endpoint proxy do backend.
      // No GitHub Pages (isStatic === true), NUNCA chama /api/pokemon/meta para evitar o erro 404 no console!
      if (!isStatic) {
        try {
          const cacheBuster = `_t=${Date.now()}`;
          const backendUrl = `/api/pokemon/meta?refresh=${forceRefresh ? 'true' : 'false'}&${cacheBuster}`;
          const res = await fetch(backendUrl, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (res.ok) {
            const data = await res.json();
            const rawDecks = data.decks || (Array.isArray(data) ? data : []);
            if (Array.isArray(rawDecks) && rawDecks.length > 0) {
              const response: LimitlessApiResponse = {
                decks: rawDecks,
                tournamentName: data.tournamentName || 'Limitless Premier Metagame',
                tournamentDate: data.tournamentDate || new Date().toISOString().split('T')[0],
                playersCount: data.playersCount,
                source: 'api-server'
              };
              saveStoredMetaDecks(response);
              cachedMetaResponse = { data: response, timestamp: Date.now() };
              return response;
            }
          }
        } catch (backendErr) {
          console.info('Backend proxy não disponível neste ambiente, alternando para consulta direta:', backendErr);
        }
      }

      // No GitHub Pages ou caso o proxy backend não responda: consulta diretamente a API oficial da Limitless
      try {
        const directResult = await fetchLimitlessDirect();
        if (directResult && directResult.decks && directResult.decks.length > 0) {
          saveStoredMetaDecks(directResult);
          cachedMetaResponse = { data: directResult, timestamp: Date.now() };
          return directResult;
        }
      } catch (directErr) {
        console.warn('Conexão direta com Limitless falhou ou offline:', directErr);
      }

      // Se as chamadas externas falharem, recupera o último estado salvo localmente no localStorage
      const localCached = getStoredMetaDecks();
      if (localCached && localCached.decks.length > 0) {
        console.info('Utilizando último estado do metagame salvo localmente no navegador (localStorage).');
        return localCached;
      }

      // Fallback seguro de emergência caso não haja conexão nem dados prévios em cache
      const fallbackResponse: LimitlessApiResponse = {
        decks: fallbackMetaDecks,
        tournamentName: 'Pokémon World Championships (Modo Offline de Contingência)',
        tournamentDate: new Date().toISOString().split('T')[0],
        playersCount: 200,
        source: 'offline-fallback'
      };
      return fallbackResponse;
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}
