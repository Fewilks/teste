// ============================================================================
// POKÉMON CREATURE SPRITES & AVATARS
// Exclusivo para avatares de usuários, ícones de arquétipo e telas de loading.
// NÃO altera o banco ou a resolução de cartas TCG.
// ============================================================================

export interface PokemonAvatarOption {
  id: string;
  name: string;
  category: 'Popular' | 'Fantasma & Sombrio' | 'Elétrico' | 'Fogo & Dragão' | 'Psíquico' | 'Água & Grama' | 'Lendários & Ex';
}

export const POPULAR_POKEMON_AVATARS: PokemonAvatarOption[] = [
  // Populares / Mascotes
  { id: 'pikachu', name: 'Pikachu', category: 'Popular' },
  { id: 'gengar', name: 'Gengar', category: 'Popular' },
  { id: 'charizard', name: 'Charizard', category: 'Popular' },
  { id: 'lucario', name: 'Lucario', category: 'Popular' },
  { id: 'mew', name: 'Mew', category: 'Popular' },
  { id: 'eevee', name: 'Eevee', category: 'Popular' },
  { id: 'snorlax', name: 'Snorlax', category: 'Popular' },

  // Fantasma & Sombrio (Temática Spirits)
  { id: 'gengar-gmax', name: 'Gengar Gigantamax', category: 'Fantasma & Sombrio' },
  { id: 'umbreon', name: 'Umbreon', category: 'Fantasma & Sombrio' },
  { id: 'sableye', name: 'Sableye', category: 'Fantasma & Sombrio' },
  { id: 'dusclops', name: 'Dusclops', category: 'Fantasma & Sombrio' },
  { id: 'dusknoir', name: 'Dusknoir', category: 'Fantasma & Sombrio' },
  { id: 'absol', name: 'Absol', category: 'Fantasma & Sombrio' },
  { id: 'roaringmoon', name: 'Roaring Moon', category: 'Fantasma & Sombrio' },

  // Elétrico
  { id: 'raichu', name: 'Raichu', category: 'Elétrico' },
  { id: 'miraidon', name: 'Miraidon', category: 'Elétrico' },
  { id: 'ironhands', name: 'Iron Hands', category: 'Elétrico' },
  { id: 'rotom', name: 'Rotom', category: 'Elétrico' },
  { id: 'rotom-wash', name: 'Rotom Wash', category: 'Elétrico' },
  { id: 'raikou', name: 'Raikou', category: 'Elétrico' },

  // Fogo & Dragão
  { id: 'dragapult', name: 'Dragapult', category: 'Fogo & Dragão' },
  { id: 'rayquaza', name: 'Rayquaza', category: 'Fogo & Dragão' },
  { id: 'garchomp', name: 'Garchomp', category: 'Fogo & Dragão' },
  { id: 'dragonite', name: 'Dragonite', category: 'Fogo & Dragão' },
  { id: 'ceruledge', name: 'Ceruledge', category: 'Fogo & Dragão' },
  { id: 'moltres', name: 'Moltres', category: 'Fogo & Dragão' },
  { id: 'koraidon', name: 'Koraidon', category: 'Fogo & Dragão' },
  { id: 'ragingbolt', name: 'Raging Bolt', category: 'Fogo & Dragão' },

  // Psíquico
  { id: 'mewtwo', name: 'Mewtwo', category: 'Psíquico' },
  { id: 'gardevoir', name: 'Gardevoir', category: 'Psíquico' },
  { id: 'alakazam', name: 'Alakazam', category: 'Psíquico' },
  { id: 'espeon', name: 'Espeon', category: 'Psíquico' },
  { id: 'sylveon', name: 'Sylveon', category: 'Psíquico' },
  { id: 'fezandipiti', name: 'Fezandipiti', category: 'Psíquico' },

  // Água & Grama
  { id: 'greninja', name: 'Greninja', category: 'Água & Grama' },
  { id: 'blastoise', name: 'Blastoise', category: 'Água & Grama' },
  { id: 'venusaur', name: 'Venusaur', category: 'Água & Grama' },
  { id: 'palkia', name: 'Palkia', category: 'Água & Grama' },
  { id: 'chienpao', name: 'Chien-Pao', category: 'Água & Grama' },
  { id: 'ogerpon', name: 'Ogerpon', category: 'Água & Grama' },

  // Lendários, Megas & Ex
  { id: 'lucario-mega', name: 'Mega Lucario', category: 'Lendários & Ex' },
  { id: 'charizard-megax', name: 'Mega Charizard X', category: 'Lendários & Ex' },
  { id: 'gardevoir-mega', name: 'Mega Gardevoir', category: 'Lendários & Ex' },
  { id: 'rayquaza-mega', name: 'Mega Rayquaza', category: 'Lendários & Ex' },
  { id: 'gengar-mega', name: 'Mega Gengar', category: 'Lendários & Ex' },
  { id: 'zygarde-complete', name: 'Mega Zygarde (100%)', category: 'Lendários & Ex' },
  { id: 'terapagos', name: 'Terapagos', category: 'Lendários & Ex' },
  { id: 'lugia', name: 'Lugia', category: 'Lendários & Ex' },
  { id: 'scizor', name: 'Scizor', category: 'Lendários & Ex' },
  { id: 'dudunsparce', name: 'Dudunsparce', category: 'Lendários & Ex' },
  { id: 'substitute', name: 'Substituto (Mascote)', category: 'Lendários & Ex' }
];

/**
 * Normaliza nomes de arquétipos, cartas ou apelidos para IDs compatíveis com Pokemon Showdown & PokeAPI
 * Suporta detecção avançada de Mega Evoluções (ex: Mega Lucario, Mega Charizard X, Mega Zygarde, etc.)
 */
export function sanitizePokemonCreatureName(input: string): string {
  if (!input) return 'substitute';
  
  // 1. Remove parênteses com apelidos ou nomes de expansões brasileiras/inglesas
  // Ex: "Mega Lucario ex (Heróis Excelsos)" -> "Mega Lucario ex"
  let s = input.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim().toLowerCase();

  // 2. Remove acentuação
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 3. Remove prefixos de treinadores/donos de cartas (ex: "Cynthia's Garchomp ex", "Lillie's Clefairy", "Red's Pikachu")
  // e sufixos em português (ex: "Garchomp da Cynthia", "Clefairy da Lílian", "Pikachu do Red")
  s = s.replace(/^[a-z0-9'\s-]+\'s\s+/i, '');
  s = s.replace(/\b(cynthia|cynthias|lillie|lillies|lilian|red|reds|marnie|marnies|iono|ionos|steven|stevens|n)\'s?\s+/gi, '');
  s = s.replace(/\s+(?:da|de|do)\s+(?:cynthia|lilian|lillie|red|marnie|iono|steven|n)\b/gi, '');

  // 4. Remove sufixos comuns de cartas TCG
  s = s.replace(/\b(ex|vstar|vmax|v|radiant|radiante|baby|deck|forma|forme|origin|origem|paldea|galar|alola|hisui)\b/gi, '').trim();

  // 5. Mapeamentos específicos diretos
  const exactMap: Record<string, string> = {
    // Pokémon com dono / Treinadores (Cynthia, Lillie, Red, Marnie, etc.)
    "cynthia's garchomp": 'garchomp',
    'cynthias garchomp': 'garchomp',
    'cynthia garchomp': 'garchomp',
    'garchomp da cynthia': 'garchomp',
    "cynthia's gabite": 'gabite',
    'cynthias gabite': 'gabite',
    'gabite da cynthia': 'gabite',
    "cynthia's gible": 'gible',
    'cynthias gible': 'gible',
    'gible da cynthia': 'gible',
    "cynthia's roserade": 'roserade',
    'cynthias roserade': 'roserade',
    'roserade da cynthia': 'roserade',
    "cynthia's spiritomb": 'spiritomb',
    "cynthia's milotic": 'milotic',
    "cynthia's togekiss": 'togekiss',
    "cynthia's lucario": 'lucario',
    'clefairy ex': 'clefairy',
    "lillie's clefairy": 'clefairy',
    'lillies clefairy': 'clefairy',
    'clefairy da lilian': 'clefairy',
    "lillie's comfey": 'comfey',
    "lillie's ribombee": 'ribombee',
    "red's charizard": 'charizard',
    "red's pikachu": 'pikachu',
    "marnie's grimmsnarl": 'grimmsnarl',
    "n's reshiram": 'reshiram',
    "n's zekrom": 'zekrom',
    "n's zoroark": 'zoroark',
    "iono's bellibolt": 'bellibolt',

    'mega charizard x': 'charizard-megax',
    'mega charizard y': 'charizard-megay',
    'mega mewtwo x': 'mewtwo-megax',
    'mega mewtwo y': 'mewtwo-megay',
    'mega zygarde': 'zygarde-complete',
    'zygarde mega': 'zygarde-complete',
    'zygarde 100%': 'zygarde-complete',
    'zygarde complete': 'zygarde-complete',
    'primal groudon': 'groudon-primal',
    'primal kyogre': 'kyogre-primal',
    'ultra necrozma': 'necrozma-ultra',
    'roaring moon': 'roaringmoon',
    'iron hands': 'ironhands',
    'iron thorns': 'ironthorns',
    'iron crown': 'ironcrown',
    'iron bundle': 'ironbundle',
    'iron valiant': 'ironvaliant',
    'raging bolt': 'ragingbolt',
    'chien-pao': 'chienpao',
    'chien pao': 'chienpao',
    'origin forme palkia': 'palkia-origin',
    'palkia vstar': 'palkia-origin',
    'origin forme dialga': 'dialga-origin',
    'dialga vstar': 'dialga-origin',
    'teal mask ogerpon': 'ogerpon',
    'ogerpon ex': 'ogerpon',
    'bloodmoon ursaluna': 'ursaluna-bloodmoon',
    'squawkabilly': 'squawkabilly',
    'fan rotom': 'rotom-fan',
    'rotom v': 'rotom',
    'charizard ex': 'charizard',
    'dragapult ex': 'dragapult',
    'gardevoir ex': 'gardevoir',
    'pidgeot ex': 'pidgeot',
    'miraidon ex': 'miraidon',
    'gholdengo ex': 'gholdengo',
    'terapagos ex': 'terapagos',
    'regidrago vstar': 'regidrago',
    'lugia vstar': 'lugia',
    'fezandipiti ex': 'fezandipiti',
    'mew ex': 'mew'
  };

  const normalizedKey = s.replace(/\s+/g, ' ').trim();
  if (exactMap[normalizedKey]) return exactMap[normalizedKey];

  // 5. Detecção genérica inteligente de Mega Evolução
  // Ex: "mega lucario", "lucario mega", "m-lucario", "mega-lucario", "m lucario"
  const isMega = /\b(mega|m)\b/i.test(s) || s.startsWith('mega-') || s.startsWith('m-');
  if (isMega) {
    // Verifica se possui variante X ou Y
    const hasX = /\b(x)\b/i.test(s) || s.endsWith('-x') || s.endsWith(' x');
    const hasY = /\b(y)\b/i.test(s) || s.endsWith('-y') || s.endsWith(' y');

    // Extrai o nome do pokémon removendo termos mega/m e letras x/y
    let basePoke = s
      .replace(/\b(mega|m)\b/gi, '')
      .replace(/\b[xy]\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

    if (basePoke === 'zygarde') return 'zygarde-complete';

    if (basePoke) {
      if (hasX) return `${basePoke}-megax`;
      if (hasY) return `${basePoke}-megay`;
      return `${basePoke}-mega`;
    }
  }

  // 6. Limpa caracteres especiais mantendo hífen se já existir
  s = s.replace(/[^a-z0-9-]/g, '');
  return s || 'substitute';
}

/**
 * Retorna lista ordenada de URLs para renderizar o sprite da criatura Pokémon
 * com múltiplos fallbacks (Showdown animated -> Showdown dex -> PokeAPI animated -> Base Pokémon fallback -> Mascote substituto)
 */
export function getCreatureSpriteHierarchy(nameOrArchetype: string): string[] {
  const clean = sanitizePokemonCreatureName(nameOrArchetype);

  const sources: string[] = [
    // 1. Showdown Animated GIF
    `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif`,
    // 2. Showdown Dex standard
    `https://play.pokemonshowdown.com/sprites/dex/${clean}.png`,
    // 3. Showdown Gen 5 Pixel Art
    `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`,
    // 4. PokeAPI Showdown Animated (Mirror)
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${clean}.gif`
  ];

  // Se for Mega Evolução com variante X/Y com ou sem hífen (ex: charizard-megax vs charizard-mega-x)
  if (clean.includes('-megax')) {
    const hyphenated = clean.replace('-megax', '-mega-x');
    sources.splice(1, 0, `https://play.pokemonshowdown.com/sprites/ani/${hyphenated}.gif`);
    sources.push(`https://play.pokemonshowdown.com/sprites/dex/${hyphenated}.png`);
  } else if (clean.includes('-megay')) {
    const hyphenated = clean.replace('-megay', '-mega-y');
    sources.splice(1, 0, `https://play.pokemonshowdown.com/sprites/ani/${hyphenated}.gif`);
    sources.push(`https://play.pokemonshowdown.com/sprites/dex/${hyphenated}.png`);
  }

  // Fallback para a forma base caso o sprite da mega ou variante temporariamente falhe
  if (clean.includes('-mega') || clean.includes('-complete') || clean.includes('-primal')) {
    const baseName = clean.split('-')[0];
    if (baseName && baseName !== 'substitute') {
      sources.push(`https://play.pokemonshowdown.com/sprites/ani/${baseName}.gif`);
      sources.push(`https://play.pokemonshowdown.com/sprites/dex/${baseName}.png`);
    }
  }

  // Fallback final com mascote substituto do Showdown
  sources.push('https://play.pokemonshowdown.com/sprites/dex/substitute.png');

  return sources;
}
