// ============================================================================
// DECK POKÉMON SPRITE EXTRACTOR
// Analisa a lista de cartas (PTCGL / Limitless TCG) de qualquer baralho e
// identifica os 2 Pokémon principais com base em regras competitivas (ex, VSTAR,
// VMAX, atacantes de destaque e evoluções chave).
// Permite extração automática e escolha interativa de sprites pelo usuário.
// ============================================================================

import { getArchetypeSprites } from '../components/Matches';
import { sanitizePokemonCreatureName } from './pokemonSprites';

export interface ExtractedPokemonInfo {
  name: string;        // Nome limpo (ex: "Charizard ex", "Pidgeot ex")
  rawName: string;     // Nome com coleção (ex: "Charizard ex OBF 125")
  count: number;       // Quantidade de cópias no baralho
  score: number;       // Pontuação de relevância no metagame
  isAce: boolean;      // Possui regra especial (ex, VSTAR, VMAX, Mega, Radiant)
  spriteName: string;  // Identificador normalizado para o PokemonSprite
  category: 'Ace' | 'Evolução Chave' | 'Atacante' | 'Suporte' | 'Básico';
}

// Famílias conhecidas para rebaixar pré-evoluções quando a evolução máxima estiver no baralho
const EVOLUTION_FAMILIES: Record<string, string[]> = {
  charizard: ['charmander', 'charmeleon'],
  dragapult: ['dreepy', 'drakloak'],
  pidgeot: ['pidgey', 'pidgeotto'],
  gardevoir: ['ralts', 'kirlia'],
  dusknoir: ['duskull', 'dusclops'],
  baxcalibur: ['frigibax', 'arctibax'],
  archeops: ['archen'],
  cinccino: ['minccino'],
  bibarel: ['bidoof'],
  gholdengo: ['gimmighoul'],
  magnezone: ['magnemite', 'magneton'],
  blastoise: ['squirtle', 'wartortle'],
  venusaur: ['bulbasaur', 'ivysaur'],
  garchomp: ['gible', 'gabite', "cynthia's gible", "cynthia's gabite"],
  roserade: ['roselia', "cynthia's roselia"],
  metagross: ['beldum', 'metang'],
  tyranitar: ['larvitar', 'pupitar'],
  dragonite: ['dratini', 'dragonair'],
  salamence: ['bagon', 'shelgon'],
  lucario: ['riolu']
};

/**
 * Remove códigos de coleção, números de carta e sufixos do PTCGL
 * Mantém identificadores essenciais como "ex", "VSTAR", "VMAX", "Radiant", "Mega"
 * e normaliza nomes canônicos de cartas de treinadores como Cynthia's Garchomp ex e Lillie's Clefairy ex.
 */
export function cleanPokemonName(raw: string): string {
  if (!raw) return '';
  
  // Remove parênteses (ex: "(TWM 130)")
  let name = raw.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  // Remove padrão de coleção no final (ex: "PAR 170", "SVI 196", "TWM 25", "TEF 123", "ASR 46", "JTG 86", "JTG 086")
  name = name.replace(/\s+[A-Z0-9]{2,5}\s+\d+[a-zA-Z]?$/i, '').trim();

  // Remove quantidades no início caso existam (ex: "3 Charizard ex" -> "Charizard ex")
  name = name.replace(/^\d+\s+/, '').trim();

  // Normalização precisa de cartas com Treinador/Dono no nome
  // Caso 1: Variações de Cynthia's Garchomp ex
  if (/(?:garchomp.*cynthia|cynthia.*garchomp)/i.test(name)) {
    return "Cynthia's Garchomp ex";
  }
  // Caso 2: Variações de Lillie's Clefairy ex
  if (/(?:clefairy.*lili|lili.*clefairy)/i.test(name)) {
    return "Lillie's Clefairy ex";
  }
  // Caso 3: Outros Pokémon específicos da Cynthia
  if (/(?:gabite.*cynthia|cynthia.*gabite)/i.test(name)) {
    return "Cynthia's Gabite";
  }
  if (/(?:gible.*cynthia|cynthia.*gible)/i.test(name)) {
    return "Cynthia's Gible";
  }
  if (/(?:roserade.*cynthia|cynthia.*roserade)/i.test(name)) {
    return "Cynthia's Roserade";
  }

  // Se tiver prefixo cynthias sem apóstrofo
  if (/^cynthias\s+/i.test(name)) {
    name = name.replace(/^cynthias\s+/i, "Cynthia's ");
  }
  // Se tiver prefixo lillies sem apóstrofo
  if (/^lillies\s+/i.test(name)) {
    name = name.replace(/^lillies\s+/i, "Lillie's ");
  }

  return name;
}

/**
 * Percorre a lista de texto do PTCGL ou um array de cartas de um baralho
 * e extrai todos os Pokémon encontrados com pontuação de importância.
 */
export function extractAllPokemonsFromDeck(
  text?: string, 
  cardsArray?: { name: string; count?: number }[]
): ExtractedPokemonInfo[] {
  const pokemonMap = new Map<string, { rawName: string; count: number }>();

  // 1. Processa texto bruto (PTCGL / Limitless export format)
  if (text && typeof text === 'string') {
    const lines = text.split('\n');
    let inPokemonSection = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Início da seção de Pokémon
      if (/^(pokémon|pokemon|pokémons|pokemons)\b/i.test(trimmed)) {
        inPokemonSection = true;
        continue;
      }

      // Início de outras seções encerra a de Pokémon
      if (/^(treinador|trainer|treinadores|trainers|energia|energy|energias|energies)\b/i.test(trimmed)) {
        inPokemonSection = false;
        continue;
      }

      // Se estamos na seção de Pokémon ou se a linha contém o formato "3 Nome SET NUM"
      const match = trimmed.match(/^(\d+)\s+([A-Za-z0-9\s\-\'\.]+?)(?:\s+[A-Z0-9]{2,5}\s+\d+.*)?$/i);
      if (match) {
        const count = parseInt(match[1], 10) || 1;
        const candidate = match[2].trim();

        // Filtra falsos positivos de energias e treinadores comuns se não estiver explícito na seção
        const isTrainerOrEnergy = /^(energia|energy|professor|arven|iono|boss|ultra ball|nest ball|buddy|super rod|rare candy|switch|earthen|vessel|prime catcher|counter catcher|cynthia\'s ambition|cynthia\'s guidance|ambicao da cynthia|lillie\'s determination|determinacao da lilian)\b/i.test(candidate);
        
        if (!isTrainerOrEnergy && candidate.length > 2) {
          const cleaned = cleanPokemonName(candidate);
          const key = cleaned.toLowerCase();
          
          if (!pokemonMap.has(key)) {
            pokemonMap.set(key, { rawName: cleaned, count });
          } else {
            const existing = pokemonMap.get(key)!;
            existing.count += count;
          }
        }
      }
    }
  }

  // 2. Processa array de cartas fornecido diretamente pela API Limitless
  if (cardsArray && Array.isArray(cardsArray) && cardsArray.length > 0) {
    for (const card of cardsArray) {
      if (!card.name) continue;
      const count = card.count || 1;
      const candidate = cleanPokemonName(card.name);

      const isTrainerOrEnergy = /^(energia|energy|professor|arven|iono|boss|ultra ball|nest ball|buddy|super rod|rare candy|switch|earthen|vessel|prime catcher|counter catcher)\b/i.test(candidate);
      if (!isTrainerOrEnergy && candidate.length > 2) {
        const key = candidate.toLowerCase();
        if (!pokemonMap.has(key)) {
          pokemonMap.set(key, { rawName: candidate, count });
        } else {
          const existing = pokemonMap.get(key)!;
          existing.count = Math.max(existing.count, count);
        }
      }
    }
  }

  if (pokemonMap.size === 0) {
    return [];
  }

  // 3. Avalia e pontua cada Pokémon identificado
  const allPokemonKeys = Array.from(pokemonMap.keys());
  const results: ExtractedPokemonInfo[] = [];

  for (const [key, data] of pokemonMap.entries()) {
    const rawName = data.rawName;
    const count = data.count;
    const isAce = /\b(ex|vstar|vmax|v-union|mega|tera|gmax|radiant|radiante)\b/i.test(rawName);
    const isBasicV = /\bv\b/i.test(rawName) && !/\b(vstar|vmax|v-union)\b/i.test(rawName);

    // Identifica se é pré-evolução de algum Pokémon que também está presente no deck
    const cleanBase = sanitizePokemonCreatureName(rawName);
    let isPreEvolution = false;

    for (const [evolved, preList] of Object.entries(EVOLUTION_FAMILIES)) {
      if (preList.includes(cleanBase)) {
        // Se a evolução estiver presente no deck, este é pré-evolução
        const hasEvolved = allPokemonKeys.some(k => sanitizePokemonCreatureName(k).includes(evolved));
        if (hasEvolved) {
          isPreEvolution = true;
          break;
        }
      }
    }

    // Se temos "Charizard V" e "Charizard VSTAR", VSTAR é prioritário
    if (isBasicV) {
      const hasVStarOrMax = allPokemonKeys.some(k => 
        k.includes(cleanBase) && /\b(vstar|vmax)\b/i.test(k)
      );
      if (hasVStarOrMax) {
        isPreEvolution = true;
      }
    }

    // Cálculo do Score
    let baseScore = 40;
    let category: ExtractedPokemonInfo['category'] = 'Atacante';

    if (isAce && !isBasicV) {
      baseScore = 100;
      category = 'Ace';
    } else if (isBasicV) {
      baseScore = isPreEvolution ? 45 : 80;
      category = isPreEvolution ? 'Básico' : 'Ace';
    } else if (isPreEvolution) {
      baseScore = 15;
      category = 'Básico';
    } else if (/\b(dusknoir|dusclops|drakloak|pidgeot|archeops|baxcalibur|cinccino|bibarel|kirlia|fezandipiti|munkidori|squawkabilly|rotom)\b/i.test(rawName)) {
      baseScore = 75;
      category = 'Evolução Chave';
    } else if (count >= 3) {
      baseScore = 60;
      category = 'Atacante';
    } else {
      category = 'Suporte';
    }

    const finalScore = baseScore + (count * 3);

    results.push({
      name: rawName,
      rawName,
      count,
      score: finalScore,
      isAce,
      spriteName: cleanBase,
      category
    });
  }

  // Ordena por pontuação de maior para menor
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Retorna os 2 Pokémon mais importantes do baralho para uso como sprites representativos.
 */
export function getTopTwoPokemons(
  deckText?: string,
  cardsArray?: { name: string; count?: number }[],
  fallbackName?: string
): { pokemon1: string; pokemon2: string; sprites: string[] } {
  const detected = extractAllPokemonsFromDeck(deckText, cardsArray);

  if (detected.length >= 2) {
    const p1 = detected[0].name;
    const p2 = detected[1].name;
    return {
      pokemon1: p1,
      pokemon2: p2,
      sprites: [detected[0].spriteName, detected[1].spriteName]
    };
  }

  if (detected.length === 1) {
    const p1 = detected[0].name;
    // Tenta obter um segundo pelo fallback de nome do arquétipo
    const fallbackSprites = fallbackName ? getArchetypeSprites(fallbackName) : [];
    const p2 = fallbackSprites[1] || '';
    return {
      pokemon1: p1,
      pokemon2: p2,
      sprites: [detected[0].spriteName, p2 ? sanitizePokemonCreatureName(p2) : ''].filter(Boolean)
    };
  }

  // Se a lista não forneceu cartas de Pokémon, usa o analisador de arquétipo
  const fallbackSprites = fallbackName ? getArchetypeSprites(fallbackName) : ['substitute'];
  const p1 = fallbackSprites[0] || 'substitute';
  const p2 = fallbackSprites[1] || '';

  return {
    pokemon1: p1,
    pokemon2: p2,
    sprites: fallbackSprites
  };
}
