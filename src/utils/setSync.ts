// ============================================================================
// setSync.ts — Fonte única de verdade para sets TCG
//
// Regulation Marks (Standard 2026):
//   D, E, F  → ROTACIONADAS
//   G, H, I  → VÁLIDAS
//
// CASCATA DE IMAGEM (v3 — ORB-safe):
//   1. pokemontcg.io     (CDN estável, sem Cloudflare)   ← PRIMÁRIO
//   2. Limitless TCG     (CDN estável, cobre sets novos) ← SECUNDÁRIO
//   3. TCGdex            (por último, pode dar ERR_BLOCKED_BY_ORB)
//   4. Card back         (fallback final)
// ============================================================================

export type SetEra =
  | 'base' | 'ex' | 'dp' | 'hgss' | 'col' | 'bw' | 'xy'
  | 'sm' | 'swsh' | 'sv' | 'me' | 'tcgp' | 'anniv';

export type RegulationMark = 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';

export interface SetSyncEntry {
  tpci: string;
  tcgdexSeries: string | null;
  tcgdexSet: string | null;
  ptcgIo: string | null;
  name: string;
  namePt?: string;
  era: SetEra;
  isSubset?: boolean;
  regulationMark?: RegulationMark;
}

// ============================================================================
// TABELA COMPLETA
// ============================================================================

export const SET_SYNC_TABLE: SetSyncEntry[] = [
  // ---------- BASE ----------
  { tpci: 'BS', tcgdexSeries: 'base', tcgdexSet: 'base1', ptcgIo: 'base1', name: 'Base Set', namePt: 'Coleção Básica', era: 'base' },
  { tpci: 'JU', tcgdexSeries: 'base', tcgdexSet: 'base2', ptcgIo: 'base2', name: 'Jungle', namePt: 'Selva', era: 'base' },
  { tpci: 'FO', tcgdexSeries: 'base', tcgdexSet: 'base3', ptcgIo: 'base3', name: 'Fossil', namePt: 'Fóssil', era: 'base' },

  // ---------- EX ----------
  { tpci: 'RS',  tcgdexSeries: 'ex', tcgdexSet: 'ex1',  ptcgIo: 'ex1',  name: 'EX Ruby & Sapphire',         namePt: 'EX Rubi e Safira',       era: 'ex' },
  { tpci: 'SS',  tcgdexSeries: 'ex', tcgdexSet: 'ex2',  ptcgIo: 'ex2',  name: 'EX Sandstorm',               era: 'ex' },
  { tpci: 'DR',  tcgdexSeries: 'ex', tcgdexSet: 'ex3',  ptcgIo: 'ex3',  name: 'EX Dragon',                  era: 'ex' },
  { tpci: 'MA',  tcgdexSeries: 'ex', tcgdexSet: 'ex4',  ptcgIo: 'ex4',  name: 'EX Team Magma vs Team Aqua', era: 'ex' },
  { tpci: 'HL',  tcgdexSeries: 'ex', tcgdexSet: 'ex5',  ptcgIo: 'ex5',  name: 'EX Hidden Legends',          era: 'ex' },
  { tpci: 'RG',  tcgdexSeries: 'ex', tcgdexSet: 'ex6',  ptcgIo: 'ex6',  name: 'EX FireRed & LeafGreen',     era: 'ex' },
  { tpci: 'TRR', tcgdexSeries: 'ex', tcgdexSet: 'ex7',  ptcgIo: 'ex7',  name: 'EX Team Rocket Returns',     namePt: 'EX O Retorno da Equipe Rocket', era: 'ex' },
  { tpci: 'DX',  tcgdexSeries: 'ex', tcgdexSet: 'ex8',  ptcgIo: 'ex8',  name: 'EX Deoxys',                  era: 'ex' },
  { tpci: 'EM',  tcgdexSeries: 'ex', tcgdexSet: 'ex9',  ptcgIo: 'ex9',  name: 'EX Emerald',                 era: 'ex' },
  { tpci: 'UF',  tcgdexSeries: 'ex', tcgdexSet: 'ex10', ptcgIo: 'ex10', name: 'EX Unseen Forces',           era: 'ex' },
  { tpci: 'DS',  tcgdexSeries: 'ex', tcgdexSet: 'ex11', ptcgIo: 'ex11', name: 'EX Delta Species',           era: 'ex' },
  { tpci: 'LM',  tcgdexSeries: 'ex', tcgdexSet: 'ex12', ptcgIo: 'ex12', name: 'EX Legend Maker',            era: 'ex' },
  { tpci: 'HP',  tcgdexSeries: 'ex', tcgdexSet: 'ex13', ptcgIo: 'ex13', name: 'EX Holon Phantoms',          era: 'ex' },
  { tpci: 'CG',  tcgdexSeries: 'ex', tcgdexSet: 'ex14', ptcgIo: 'ex14', name: 'EX Crystal Guardians',       era: 'ex' },
  { tpci: 'DF',  tcgdexSeries: 'ex', tcgdexSet: 'ex15', ptcgIo: 'ex15', name: 'EX Dragon Frontiers',        era: 'ex' },
  { tpci: 'PK',  tcgdexSeries: 'ex', tcgdexSet: 'ex16', ptcgIo: 'ex16', name: 'EX Power Keepers',           era: 'ex' },

  // ---------- DP ----------
  { tpci: 'DP', tcgdexSeries: 'dp', tcgdexSet: 'dp1', ptcgIo: 'dp1', name: 'Diamond & Pearl',      namePt: 'Diamante & Pérola',   era: 'dp' },
  { tpci: 'MT', tcgdexSeries: 'dp', tcgdexSet: 'dp2', ptcgIo: 'dp2', name: 'Mysterious Treasures', namePt: 'Tesouros Misteriosos', era: 'dp' },
  { tpci: 'SW', tcgdexSeries: 'dp', tcgdexSet: 'dp3', ptcgIo: 'dp3', name: 'Secret Wonders',       namePt: 'Maravilhas Secretas', era: 'dp' },
  { tpci: 'GE', tcgdexSeries: 'dp', tcgdexSet: 'dp4', ptcgIo: 'dp4', name: 'Great Encounters',     era: 'dp' },
  { tpci: 'MD', tcgdexSeries: 'dp', tcgdexSet: 'dp5', ptcgIo: 'dp5', name: 'Majestic Dawn',        era: 'dp' },
  { tpci: 'LA', tcgdexSeries: 'dp', tcgdexSet: 'dp6', ptcgIo: 'dp6', name: 'Legends Awakened',     era: 'dp' },
  { tpci: 'SF', tcgdexSeries: 'dp', tcgdexSet: 'dp7', ptcgIo: 'dp7', name: 'Stormfront',           era: 'dp' },

  // ---------- HGSS ----------
  { tpci: 'HS', tcgdexSeries: 'hgss', tcgdexSet: 'hgss1', ptcgIo: 'hgss1', name: 'HeartGold SoulSilver', namePt: 'HeartGold SoulSilver', era: 'hgss' },
  { tpci: 'UL', tcgdexSeries: 'hgss', tcgdexSet: 'hgss2', ptcgIo: 'hgss2', name: 'Unleashed',            namePt: 'Revelado',             era: 'hgss' },
  { tpci: 'UD', tcgdexSeries: 'hgss', tcgdexSet: 'hgss3', ptcgIo: 'hgss3', name: 'Undaunted',            namePt: 'Destemido',            era: 'hgss' },
  { tpci: 'TM', tcgdexSeries: 'hgss', tcgdexSet: 'hgss4', ptcgIo: 'hgss4', name: 'Triumphant',           namePt: 'Triunfante',           era: 'hgss' },

  // ---------- CoL ----------
  { tpci: 'CL', tcgdexSeries: 'col', tcgdexSet: 'col1', ptcgIo: 'col1', name: 'Call of Legends', namePt: 'Chamado das Lendas', era: 'col' },

  // ---------- BW ----------
  { tpci: 'BLW', tcgdexSeries: 'bw', tcgdexSet: 'bw1',  ptcgIo: 'bw1',  name: 'Black & White',       namePt: 'Black & White',              era: 'bw' },
  { tpci: 'EPO', tcgdexSeries: 'bw', tcgdexSet: 'bw2',  ptcgIo: 'bw2',  name: 'Emerging Powers',     namePt: 'Poderes Emergentes',         era: 'bw' },
  { tpci: 'NVI', tcgdexSeries: 'bw', tcgdexSet: 'bw3',  ptcgIo: 'bw3',  name: 'Noble Victories',     namePt: 'Vitórias Nobres',            era: 'bw' },
  { tpci: 'NXD', tcgdexSeries: 'bw', tcgdexSet: 'bw4',  ptcgIo: 'bw4',  name: 'Next Destinies',      namePt: 'Próximos Destinos',          era: 'bw' },
  { tpci: 'DEX', tcgdexSeries: 'bw', tcgdexSet: 'bw5',  ptcgIo: 'bw5',  name: 'Dark Explorers',      namePt: 'Exploradores da Escuridão',  era: 'bw' },
  { tpci: 'DRX', tcgdexSeries: 'bw', tcgdexSet: 'bw6',  ptcgIo: 'bw6',  name: 'Dragons Exalted',     namePt: 'Dragões Enaltecidos',        era: 'bw' },
  { tpci: 'DRV', tcgdexSeries: 'bw', tcgdexSet: 'dv1',  ptcgIo: 'dv1',  name: 'Dragon Vault',        namePt: 'Cofre do Dragão',            era: 'bw' },
  { tpci: 'BCR', tcgdexSeries: 'bw', tcgdexSet: 'bw7',  ptcgIo: 'bw7',  name: 'Boundaries Crossed',  namePt: 'Fronteiras Cruzadas',        era: 'bw' },
  { tpci: 'PLS', tcgdexSeries: 'bw', tcgdexSet: 'bw8',  ptcgIo: 'bw8',  name: 'Plasma Storm',        namePt: 'Tempestade de Plasma',       era: 'bw' },
  { tpci: 'PLF', tcgdexSeries: 'bw', tcgdexSet: 'bw9',  ptcgIo: 'bw9',  name: 'Plasma Freeze',       namePt: 'Congelamento de Plasma',     era: 'bw' },
  { tpci: 'PLB', tcgdexSeries: 'bw', tcgdexSet: 'bw10', ptcgIo: 'bw10', name: 'Plasma Blast',        namePt: 'Explosão de Plasma',         era: 'bw' },
  { tpci: 'LTR', tcgdexSeries: 'bw', tcgdexSet: 'bw11', ptcgIo: 'bw11', name: 'Legendary Treasures', namePt: 'Tesouros Lendários',         era: 'bw' },

  // ---------- XY ----------
  { tpci: 'KSS', tcgdexSeries: 'xy', tcgdexSet: 'xy0',  ptcgIo: 'xy0',  name: 'Kalos Starter Set', namePt: 'Conjunto para Iniciantes Kalos', era: 'xy' },
  { tpci: 'XY',  tcgdexSeries: 'xy', tcgdexSet: 'xy1',  ptcgIo: 'xy1',  name: 'XY',                namePt: 'XY',                             era: 'xy' },
  { tpci: 'FLF', tcgdexSeries: 'xy', tcgdexSet: 'xy2',  ptcgIo: 'xy2',  name: 'Flashfire',         namePt: 'Flash de Fogo',                  era: 'xy' },
  { tpci: 'FFI', tcgdexSeries: 'xy', tcgdexSet: 'xy3',  ptcgIo: 'xy3',  name: 'Furious Fists',     namePt: 'Punhos Furiosos',                era: 'xy' },
  { tpci: 'PHF', tcgdexSeries: 'xy', tcgdexSet: 'xy4',  ptcgIo: 'xy4',  name: 'Phantom Forces',    namePt: 'Força Fantasma',                 era: 'xy' },
  { tpci: 'PRC', tcgdexSeries: 'xy', tcgdexSet: 'xy5',  ptcgIo: 'xy5',  name: 'Primal Clash',      namePt: 'Conflito Primitivo',             era: 'xy' },
  { tpci: 'DCR', tcgdexSeries: 'xy', tcgdexSet: 'dc1',  ptcgIo: 'dc1',  name: 'Double Crisis',     namePt: 'Crise Dupla',                    era: 'xy' },
  { tpci: 'ROS', tcgdexSeries: 'xy', tcgdexSet: 'xy6',  ptcgIo: 'xy6',  name: 'Roaring Skies',     namePt: 'Céus Estrondosos',               era: 'xy' },
  { tpci: 'AOR', tcgdexSeries: 'xy', tcgdexSet: 'xy7',  ptcgIo: 'xy7',  name: 'Ancient Origins',   namePt: 'Origens Ancestrais',             era: 'xy' },
  { tpci: 'BKT', tcgdexSeries: 'xy', tcgdexSet: 'xy8',  ptcgIo: 'xy8',  name: 'BREAKthrough',      namePt: 'Turbo Revolução',                era: 'xy' },
  { tpci: 'BKP', tcgdexSeries: 'xy', tcgdexSet: 'xy9',  ptcgIo: 'xy9',  name: 'BREAKpoint',        namePt: 'Turbo Colisão',                  era: 'xy' },
  { tpci: 'GEN', tcgdexSeries: 'xy', tcgdexSet: 'g1',   ptcgIo: 'g1',   name: 'Generations',       namePt: 'Gerações',                       era: 'xy' },
  { tpci: 'FCO', tcgdexSeries: 'xy', tcgdexSet: 'xy10', ptcgIo: 'xy10', name: 'Fates Collide',     namePt: 'Fusão de Destinos',              era: 'xy' },
  { tpci: 'STS', tcgdexSeries: 'xy', tcgdexSet: 'xy11', ptcgIo: 'xy11', name: 'Steam Siege',       namePt: 'Cerco de Vapor',                 era: 'xy' },
  { tpci: 'EVO', tcgdexSeries: 'xy', tcgdexSet: 'xy12', ptcgIo: 'xy12', name: 'Evolutions',        namePt: 'Evoluções',                      era: 'xy' },

  // ---------- SM ----------
  { tpci: 'SUM',    tcgdexSeries: 'sm', tcgdexSet: 'sm1',   ptcgIo: 'sm1',   name: 'Sun & Moon',            namePt: 'Sol e Lua',                           era: 'sm', regulationMark: 'D' },
  { tpci: 'PR-SM',  tcgdexSeries: 'sm', tcgdexSet: 'smp',   ptcgIo: 'smp',   name: 'Sun & Moon Promos',     namePt: 'Sol e Lua Promos',                    era: 'sm', regulationMark: 'D' },
  { tpci: 'GRI',    tcgdexSeries: 'sm', tcgdexSet: 'sm2',   ptcgIo: 'sm2',   name: 'Guardians Rising',      namePt: 'Guardiões Ascendentes',               era: 'sm', regulationMark: 'D' },
  { tpci: 'BUS',    tcgdexSeries: 'sm', tcgdexSet: 'sm3',   ptcgIo: 'sm3',   name: 'Burning Shadows',       namePt: 'Sombras Ardentes',                    era: 'sm', regulationMark: 'D' },
  { tpci: 'SLG',    tcgdexSeries: 'sm', tcgdexSet: 'sm3.5', ptcgIo: 'sm35',  name: 'Shining Legends',       namePt: 'Lendas Luminescentes',                era: 'sm', regulationMark: 'D' },
  { tpci: 'CIN',    tcgdexSeries: 'sm', tcgdexSet: 'sm4',   ptcgIo: 'sm4',   name: 'Crimson Invasion',      namePt: 'Invasão Carmim',                      era: 'sm', regulationMark: 'D' },
  { tpci: 'UPR',    tcgdexSeries: 'sm', tcgdexSet: 'sm5',   ptcgIo: 'sm5',   name: 'Ultra Prism',           namePt: 'Ultra Prisma',                        era: 'sm', regulationMark: 'E' },
  { tpci: 'FLI',    tcgdexSeries: 'sm', tcgdexSet: 'sm6',   ptcgIo: 'sm6',   name: 'Forbidden Light',       namePt: 'Luz Proibida',                        era: 'sm', regulationMark: 'E' },
  { tpci: 'CES',    tcgdexSeries: 'sm', tcgdexSet: 'sm7',   ptcgIo: 'sm7',   name: 'Celestial Storm',       namePt: 'Tempestade Celestial',                era: 'sm', regulationMark: 'E' },
  { tpci: 'DRM',    tcgdexSeries: 'sm', tcgdexSet: 'sm7.5', ptcgIo: 'sm75',  name: 'Dragon Majesty',        namePt: 'Dragões Soberanos',                   era: 'sm', regulationMark: 'E' },
  { tpci: 'LOT',    tcgdexSeries: 'sm', tcgdexSet: 'sm8',   ptcgIo: 'sm8',   name: 'Lost Thunder',          namePt: 'Trovões Perdidos',                    era: 'sm', regulationMark: 'E' },
  { tpci: 'TEU',    tcgdexSeries: 'sm', tcgdexSet: 'sm9',   ptcgIo: 'sm9',   name: 'Team Up',               namePt: 'União de Aliados',                    era: 'sm', regulationMark: 'E' },
  { tpci: 'DET',    tcgdexSeries: 'sm', tcgdexSet: 'det1',  ptcgIo: 'det1',  name: 'Detective Pikachu',     namePt: 'Detetive Pikachu',                    era: 'sm', regulationMark: 'E' },
  { tpci: 'UNB',    tcgdexSeries: 'sm', tcgdexSet: 'sm10',  ptcgIo: 'sm10',  name: 'Unbroken Bonds',        namePt: 'Elos Inquebráveis',                   era: 'sm', regulationMark: 'E' },
  { tpci: 'UNM',    tcgdexSeries: 'sm', tcgdexSet: 'sm11',  ptcgIo: 'sm11',  name: 'Unified Minds',         namePt: 'Sintonia Mental',                     era: 'sm', regulationMark: 'E' },
  { tpci: 'HIF-SV', tcgdexSeries: 'sm', tcgdexSet: 'sma',   ptcgIo: 'sma',   name: 'Hidden Fates Shiny Vault', namePt: 'Destinos Ocultos Cofre Brilhante', era: 'sm', regulationMark: 'E', isSubset: true },
  { tpci: 'HIF',    tcgdexSeries: 'sm', tcgdexSet: 'sm115', ptcgIo: 'sm115', name: 'Hidden Fates',          namePt: 'Destinos Ocultos',                    era: 'sm', regulationMark: 'E' },
  { tpci: 'CEC',    tcgdexSeries: 'sm', tcgdexSet: 'sm12',  ptcgIo: 'sm12',  name: 'Cosmic Eclipse',        namePt: 'Eclipse Cósmico',                     era: 'sm', regulationMark: 'E' },

  // ---------- SWSH ----------
  { tpci: 'PR-SW',  tcgdexSeries: 'swsh', tcgdexSet: 'swshp',      ptcgIo: 'swshp',      name: 'SWSH Black Star Promos',        namePt: 'ESES Promos',                              era: 'swsh', regulationMark: 'D' },
  { tpci: 'SSH',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh1',      ptcgIo: 'swsh1',      name: 'Sword & Shield',                namePt: 'Espada e Escudo',                          era: 'swsh', regulationMark: 'D' },
  { tpci: 'RCL',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh2',      ptcgIo: 'swsh2',      name: 'Rebel Clash',                   namePt: 'Rixa Rebelde',                             era: 'swsh', regulationMark: 'D' },
  { tpci: 'DAA',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh3',      ptcgIo: 'swsh3',      name: 'Darkness Ablaze',               namePt: 'Escuridão Incandescente',                  era: 'swsh', regulationMark: 'D' },
  { tpci: 'CPA',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh3.5',    ptcgIo: 'swsh35',     name: "Champion's Path",               namePt: 'Caminho do Campeão',                       era: 'swsh', regulationMark: 'D' },
  { tpci: 'VIV',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh4',      ptcgIo: 'swsh4',      name: 'Vivid Voltage',                 namePt: 'Voltagem Vívida',                          era: 'swsh', regulationMark: 'D' },
  { tpci: 'SHF',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh4.5',    ptcgIo: 'swsh45',     name: 'Shining Fates',                 namePt: 'Destinos Brilhantes',                      era: 'swsh', regulationMark: 'D' },
  { tpci: 'SHF-SV', tcgdexSeries: 'swsh', tcgdexSet: 'swsh4.5sv',  ptcgIo: 'swsh45sv',   name: 'Shining Fates Shiny Vault',     era: 'swsh', regulationMark: 'D', isSubset: true },
  { tpci: 'BST',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh5',      ptcgIo: 'swsh5',      name: 'Battle Styles',                 namePt: 'Estilos de Batalha',                       era: 'swsh', regulationMark: 'E' },
  { tpci: 'CRE',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh6',      ptcgIo: 'swsh6',      name: 'Chilling Reign',                namePt: 'Reinado Arrepiante',                       era: 'swsh', regulationMark: 'E' },
  { tpci: 'EVS',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh7',      ptcgIo: 'swsh7',      name: 'Evolving Skies',                namePt: 'Céus em Evolução',                         era: 'swsh', regulationMark: 'E' },
  { tpci: 'CEL-CC', tcgdexSeries: 'swsh', tcgdexSet: 'cel25cc',    ptcgIo: 'cel25cc',    name: 'Celebrations Classic Collection', namePt: 'Celebrações Coleção Clássica',           era: 'swsh', regulationMark: 'D', isSubset: true },
  { tpci: 'CEL',    tcgdexSeries: 'swsh', tcgdexSet: 'cel25',      ptcgIo: 'cel25',      name: 'Celebrations',                  namePt: 'Celebrações',                              era: 'swsh', regulationMark: 'D' },
  { tpci: 'FST',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh8',      ptcgIo: 'swsh8',      name: 'Fusion Strike',                 namePt: 'Golpe Fusão',                              era: 'swsh', regulationMark: 'E' },
  { tpci: 'BRS-TG', tcgdexSeries: 'swsh', tcgdexSet: 'swsh9tg',    ptcgIo: 'swsh9tg',    name: 'Brilliant Stars Trainer Gallery', namePt: 'Astros Cintilantes Galeria de Treinador', era: 'swsh', regulationMark: 'F', isSubset: true },
  { tpci: 'BRS',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh9',      ptcgIo: 'swsh9',      name: 'Brilliant Stars',               namePt: 'Astros Cintilantes',                       era: 'swsh', regulationMark: 'F' },
  { tpci: 'ASR',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh10',     ptcgIo: 'swsh10',     name: 'Astral Radiance',               namePt: 'Estrelas Radiantes',                       era: 'swsh', regulationMark: 'F' },
  { tpci: 'ASR-TG', tcgdexSeries: 'swsh', tcgdexSet: 'swsh10tg',   ptcgIo: 'swsh10tg',   name: 'Astral Radiance Trainer Gallery', namePt: 'Estrelas Radiantes Galeria de Treinador', era: 'swsh', regulationMark: 'F', isSubset: true },
  { tpci: 'PGO',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh10.5',   ptcgIo: 'pgo',        name: 'Pokémon GO',                    namePt: 'Pokémon GO',                               era: 'swsh', regulationMark: 'F' },
  { tpci: 'LOR',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh11',     ptcgIo: 'swsh11',     name: 'Lost Origin',                   namePt: 'Origem Perdida',                           era: 'swsh', regulationMark: 'F' },
  { tpci: 'LOR-TG', tcgdexSeries: 'swsh', tcgdexSet: 'swsh11tg',   ptcgIo: 'swsh11tg',   name: 'Lost Origin Trainer Gallery',   namePt: 'Origem Perdida Galeria de Treinador',      era: 'swsh', regulationMark: 'F', isSubset: true },
  { tpci: 'SIT',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh12',     ptcgIo: 'swsh12',     name: 'Silver Tempest',                namePt: 'Tempestade Prateada',                      era: 'swsh', regulationMark: 'F' },
  { tpci: 'SIT-TG', tcgdexSeries: 'swsh', tcgdexSet: 'swsh12tg',   ptcgIo: 'swsh12tg',   name: 'Silver Tempest Trainer Gallery', namePt: 'Tempestade Prateada Galeria de Treinador', era: 'swsh', regulationMark: 'F', isSubset: true },
  { tpci: 'CRZ',    tcgdexSeries: 'swsh', tcgdexSet: 'swsh12.5',   ptcgIo: 'swsh12pt5',  name: 'Crown Zenith',                  namePt: 'Realeza Absoluta',                         era: 'swsh', regulationMark: 'F' },
  { tpci: 'CRZ-GG', tcgdexSeries: 'swsh', tcgdexSet: 'swsh12.5gg', ptcgIo: 'swsh12pt5gg',name: 'Crown Zenith Galarian Gallery', namePt: 'Realeza Absoluta Galeria de Galar',        era: 'swsh', regulationMark: 'F', isSubset: true },

  // ---------- SV ----------
  { tpci: 'SVI', tcgdexSeries: 'sv', tcgdexSet: 'sv01',    ptcgIo: 'sv1',    name: 'Scarlet & Violet',     namePt: 'Escarlate e Violeta',          era: 'sv', regulationMark: 'G' },
  { tpci: 'SVE', tcgdexSeries: 'sv', tcgdexSet: 'sve',     ptcgIo: 'sve',    name: 'SV Energies',          namePt: 'Escarlate e Violeta Energia',  era: 'sv', regulationMark: 'G' },
  { tpci: 'SVP', tcgdexSeries: 'sv', tcgdexSet: 'svp',     ptcgIo: 'svp',    name: 'SV Black Star Promos', namePt: 'SVP Black Star Promos',        era: 'sv', regulationMark: 'G' },
  { tpci: 'PAL', tcgdexSeries: 'sv', tcgdexSet: 'sv02',    ptcgIo: 'sv2',    name: 'Paldea Evolved',       namePt: 'Evoluções em Paldea',          era: 'sv', regulationMark: 'G' },
  { tpci: 'OBF', tcgdexSeries: 'sv', tcgdexSet: 'sv03',    ptcgIo: 'sv3',    name: 'Obsidian Flames',      namePt: 'Obsidiana em Chamas',          era: 'sv', regulationMark: 'G' },
  { tpci: 'MEW', tcgdexSeries: 'sv', tcgdexSet: 'sv03.5',  ptcgIo: 'sv3pt5', name: '151',                  namePt: '151',                          era: 'sv', regulationMark: 'G' },
  { tpci: 'PAR', tcgdexSeries: 'sv', tcgdexSet: 'sv04',    ptcgIo: 'sv4',    name: 'Paradox Rift',         namePt: 'Fenda Paradoxal',              era: 'sv', regulationMark: 'G' },
  { tpci: 'PAF', tcgdexSeries: 'sv', tcgdexSet: 'sv04.5',  ptcgIo: 'sv4pt5', name: 'Paldean Fates',        namePt: 'Destinos de Paldea',           era: 'sv', regulationMark: 'G' },
  { tpci: 'TEF', tcgdexSeries: 'sv', tcgdexSet: 'sv05',    ptcgIo: 'sv5',    name: 'Temporal Forces',      namePt: 'Forças Temporais',             era: 'sv', regulationMark: 'H' },
  { tpci: 'TWM', tcgdexSeries: 'sv', tcgdexSet: 'sv06',    ptcgIo: 'sv6',    name: 'Twilight Masquerade',  namePt: 'Máscaras do Crepúsculo',       era: 'sv', regulationMark: 'H' },
  { tpci: 'SFA', tcgdexSeries: 'sv', tcgdexSet: 'sv06.5',  ptcgIo: 'sv6pt5', name: 'Shrouded Fable',       namePt: 'Fábulas Nebulosas',            era: 'sv', regulationMark: 'H' },
  { tpci: 'SCR', tcgdexSeries: 'sv', tcgdexSet: 'sv07',    ptcgIo: 'sv7',    name: 'Stellar Crown',        namePt: 'Coroa Estelar',                era: 'sv', regulationMark: 'H' },
  { tpci: 'SSP', tcgdexSeries: 'sv', tcgdexSet: 'sv08',    ptcgIo: 'sv8',    name: 'Surging Sparks',       namePt: 'Fagulhas Impetuosas',          era: 'sv', regulationMark: 'H' },
  { tpci: 'PRE', tcgdexSeries: 'sv', tcgdexSet: 'sv08.5',  ptcgIo: 'sv8pt5', name: 'Prismatic Evolutions', namePt: 'Evoluções Prismáticas',        era: 'sv', regulationMark: 'H' },
  { tpci: 'JTG', tcgdexSeries: 'sv', tcgdexSet: 'sv09',    ptcgIo: 'sv9',    name: 'Journey Together',     namePt: 'Amigos de Jornada',            era: 'sv', regulationMark: 'I' },
  { tpci: 'DRI', tcgdexSeries: 'sv', tcgdexSet: 'sv10',    ptcgIo: 'sv10',   name: 'Destined Rivals',      namePt: 'Rivais Predestinados',         era: 'sv', regulationMark: 'I' },
  { tpci: 'BLK', tcgdexSeries: 'sv', tcgdexSet: 'sv10.5b', ptcgIo: 'sv10pt5b', name: 'Black Bolt',         namePt: 'Raio Negro',                   era: 'sv', regulationMark: 'I' },
  { tpci: 'WHT', tcgdexSeries: 'sv', tcgdexSet: 'sv10.5w', ptcgIo: 'sv10pt5w', name: 'White Flare',        namePt: 'Fogo Branco',                  era: 'sv', regulationMark: 'I' },

  // ---------- ME ----------
  { tpci: 'MEE',   tcgdexSeries: 'me', tcgdexSet: 'mee',    ptcgIo: null,   name: 'Mega Evolution Energy',  namePt: 'Megaevolução Energia',    era: 'me', regulationMark: 'I' },
  { tpci: 'MEG',   tcgdexSeries: 'me', tcgdexSet: 'me01',   ptcgIo: 'me1',  name: 'Mega Evolution',         namePt: 'Megaevolução',            era: 'me', regulationMark: 'I' },
  { tpci: 'PR-ME', tcgdexSeries: 'me', tcgdexSet: 'mep',    ptcgIo: 'mep',  name: 'MEP Black Star Promos',  namePt: 'MEP Black Star Promos',   era: 'me', regulationMark: 'I' },
  { tpci: 'PFL',   tcgdexSeries: 'me', tcgdexSet: 'me02',   ptcgIo: 'me2',  name: 'Phantasmal Flames',      namePt: 'Fogo Fantasmagórico',     era: 'me', regulationMark: 'I' },
  { tpci: 'ASC',   tcgdexSeries: 'me', tcgdexSet: 'me02.5', ptcgIo: 'me2pt5', name: 'Ascended Heroes',      namePt: 'Heróis Excelsos',         era: 'me', regulationMark: 'I' },
  { tpci: 'POR',   tcgdexSeries: 'me', tcgdexSet: 'me03',   ptcgIo: 'me3',  name: 'Perfect Order',          namePt: 'Equilíbrio Perfeito',     era: 'me', regulationMark: 'I' },
  { tpci: 'CRI',   tcgdexSeries: 'me', tcgdexSet: 'me04',   ptcgIo: 'me4',  name: 'Chaos Rising',           namePt: 'Caos Ascendente',         era: 'me', regulationMark: 'I' },
  { tpci: 'PBL',   tcgdexSeries: 'me', tcgdexSet: 'me05',   ptcgIo: 'me5',  name: 'Pitch Black',            namePt: 'Escuridão Absoluta',      era: 'me', regulationMark: 'I' },

  // ---------- 30th Anniversary ----------
  { tpci: '30TH',   tcgdexSeries: 'anniv', tcgdexSet: '30th',   ptcgIo: '30th',   name: '30th Anniversary Celebration',  namePt: 'Celebração de 30 Anos',         era: 'anniv', regulationMark: 'I' },
  { tpci: '30C',    tcgdexSeries: 'anniv', tcgdexSet: '30th',   ptcgIo: '30th',   name: '30th Anniversary (30C alias)',  namePt: 'Celebração de 30 Anos (30C)',   era: 'anniv', regulationMark: 'I' },
  { tpci: '30TH-C', tcgdexSeries: 'anniv', tcgdexSet: '30th-c', ptcgIo: '30th-c', name: '30th Classic Collection',       namePt: 'Coleção Clássica de 30 Anos',   era: 'anniv', regulationMark: 'I', isSubset: true },

  // ---------- Pocket ----------
  { tpci: 'TCGP-A1',  tcgdexSeries: 'tcgp', tcgdexSet: 'A1',  ptcgIo: null, name: 'Genetic Apex',         namePt: 'Dominação Genética',       era: 'tcgp' },
  { tpci: 'TCGP-A1a', tcgdexSeries: 'tcgp', tcgdexSet: 'A1a', ptcgIo: null, name: 'Mythical Island',      namePt: 'Ilha Mítica',              era: 'tcgp' },
  { tpci: 'TCGP-A2',  tcgdexSeries: 'tcgp', tcgdexSet: 'A2',  ptcgIo: null, name: 'Space-Time Smackdown', namePt: 'Embate do Tempo e Espaço', era: 'tcgp' },
  { tpci: 'TCGP-A2a', tcgdexSeries: 'tcgp', tcgdexSet: 'A2a', ptcgIo: null, name: 'Triumphant Light',     namePt: 'Luz Triunfante',           era: 'tcgp' },
  { tpci: 'TCGP-A2b', tcgdexSeries: 'tcgp', tcgdexSet: 'A2b', ptcgIo: null, name: 'Shining Revelry',      namePt: 'Festival Brilhante',       era: 'tcgp' },
  { tpci: 'TCGP-A3',  tcgdexSeries: 'tcgp', tcgdexSet: 'A3',  ptcgIo: null, name: 'Celestial Guardians',  namePt: 'Guardiões Celestiais',     era: 'tcgp' },
  { tpci: 'TCGP-A4a', tcgdexSeries: 'tcgp', tcgdexSet: 'A4a', ptcgIo: null, name: 'Secluded Springs',     namePt: 'Nascentes Reclusas',       era: 'tcgp' },
  { tpci: 'TCGP-B1a', tcgdexSeries: 'tcgp', tcgdexSet: 'B1a', ptcgIo: null, name: 'Crimson Blaze',        namePt: 'Chama Carmesim',           era: 'tcgp' },
  { tpci: 'TCGP-B2',  tcgdexSeries: 'tcgp', tcgdexSet: 'B2',  ptcgIo: null, name: 'Dream Parade',         namePt: 'Desfile Onírico',          era: 'tcgp' },
  { tpci: 'TCGP-B2a', tcgdexSeries: 'tcgp', tcgdexSet: 'B2a', ptcgIo: null, name: 'Paldean Wonders',      namePt: 'Paldean Wonders',          era: 'tcgp' },
];

// ============================================================================
// LOOKUP MAPS
// ============================================================================

const BY_TPCI = new Map<string, SetSyncEntry>();
const BY_TCGDEX = new Map<string, SetSyncEntry>();
const BY_PTCGIO = new Map<string, SetSyncEntry>();

for (const e of SET_SYNC_TABLE) {
  BY_TPCI.set(e.tpci.toUpperCase(), e);
  if (e.tcgdexSet) {
    BY_TCGDEX.set(e.tcgdexSet.toLowerCase(), e);
    if (e.tcgdexSeries) BY_TCGDEX.set(`${e.tcgdexSeries}/${e.tcgdexSet}`.toLowerCase(), e);
  }
  if (e.ptcgIo) BY_PTCGIO.set(e.ptcgIo.toLowerCase(), e);
}

const SET_CODE_ALIASES: Record<string, string> = {
  '30C': '30TH',
  '30TH': '30TH',
  'PR-SW': 'PR-SW',
  'PR-SM': 'PR-SM',
  'PR-ME': 'PR-ME',
};

export function findSet(query: string): SetSyncEntry | null {
  if (!query) return null;
  const q = String(query).trim();
  const upper = q.toUpperCase();
  if (SET_CODE_ALIASES[upper]) {
    const alias = SET_CODE_ALIASES[upper];
    return BY_TPCI.get(alias) || null;
  }
  return (
    BY_TPCI.get(upper) ||
    BY_TCGDEX.get(q.toLowerCase()) ||
    BY_PTCGIO.get(q.toLowerCase()) ||
    null
  );
}

export function getTpciCode(query: string): string | null {
  return findSet(query)?.tpci ?? null;
}

export function getAllTpciCodes(): string[] {
  return SET_SYNC_TABLE.map(e => e.tpci);
}

// ============================================================================
// REGULATION MARK HELPERS
// ============================================================================

export const CURRENT_STANDARD_MARKS: RegulationMark[] = ['G', 'H', 'I'];
export const ROTATED_MARKS: RegulationMark[] = ['D', 'E', 'F'];

export function getSetRegulationMark(setQuery: string): RegulationMark | null {
  const entry = findSet(setQuery);
  return entry?.regulationMark ?? null;
}

export function isSetStandardLegal(setQuery: string): boolean {
  const mark = getSetRegulationMark(setQuery);
  if (!mark) return true;
  return CURRENT_STANDARD_MARKS.includes(mark);
}

export function isSetRotated(setQuery: string): boolean {
  const mark = getSetRegulationMark(setQuery);
  if (!mark) return false;
  return ROTATED_MARKS.includes(mark);
}

// ============================================================================
// URL BUILDERS
// ============================================================================

const CARD_BACK = 'https://images.pokemontcg.io/card-back.png';

/** pokemontcg.io — CDN estável, sem Cloudflare. */
export function ptcgIoUrl(setQuery: string, num: string | number): string | null {
  const entry = findSet(setQuery);
  if (!entry?.ptcgIo || num === undefined || num === null) return null;
  const clean = String(num).trim().replace(/^#/, '').replace(/^0+/, '') || '1';
  return `https://images.pokemontcg.io/${entry.ptcgIo}/${clean}.png`;
}

/** Limitless TCG — CDN estável, cobre sets que a pokemontcg.io não tem. */
export function limitlessUrl(setQuery: string, num: string | number): string | null {
  const entry = findSet(setQuery);
  if (!entry) return null;
  const tpci = entry.tpci.toUpperCase();
  const clean = String(num).trim().replace(/^#/, '').replace(/^0+/, '') || '1';
  const padded = clean.padStart(3, '0');
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${tpci}/${tpci}_${padded}_R_EN_LG.png`;
}

/** TCGdex — CDN pode bloquear por ORB. Usar por último. */
export function tcgdexUrl(
  setQuery: string,
  num: string | number,
  lang: 'pt' | 'en' = 'en'
): string | null {
  const entry = findSet(setQuery);
  if (!entry?.tcgdexSeries || !entry.tcgdexSet || num === undefined || num === null) return null;
  const rawClean = String(num).trim().replace(/^#/, '');
  const clean = rawClean.replace(/^0+/, '') || '1';
  const isSvOrMe = entry.tcgdexSeries === 'sv' || entry.tcgdexSeries === 'me';
  const targetNum = isSvOrMe && /^\d+$/.test(clean) ? clean.padStart(3, '0') : clean;
  return `https://assets.tcgdex.net/${lang}/${entry.tcgdexSeries}/${entry.tcgdexSet}/${targetNum}/high.webp`;
}

// ============================================================================
// HIERARQUIA DE IMAGEM (5 níveis + fallback)
//
// v3 ORB-SAFE: pokemontcg.io primeiro, Limitless segundo, TCGdex por último.
// Sets novos (sem cobertura no pokemontcg.io) priorizam Limitless e TCGdex.
// ============================================================================

export interface ImageHierarchy {
  primary: string;    // pokemontcg.io (stable) ou Limitless
  secondary: string;  // Limitless TCG ou TCGdex
  tertiary: string;   // TCGdex EN
  quaternary: string; // TCGdex PT
  fallback: string;   // card back
}

export function buildImageHierarchy(
  setQuery: string,
  num: string | number,
  preferredLang: 'pt' | 'en' = 'pt'
): ImageHierarchy {
  const entry = findSet(setQuery);
  const rawClean = String(num).replace(/^#/, '');
  const clean = rawClean.replace(/^0+/, '') || '1';
  const padded = clean.padStart(3, '0');
  const isSvOrMe = entry ? (entry.tcgdexSeries === 'sv' || entry.tcgdexSeries === 'me') : false;
  const tcgdexNum = isSvOrMe && /^\d+$/.test(clean) ? padded : clean;

  const isNewSetWithoutTcgio = entry?.tpci && ['JTG', 'DRI', 'BLK', 'WHT', 'MEE', 'MEG', 'PR-ME', 'PFL', 'ASC', 'POR', 'CRI', 'PBL', '30TH', '30C', '30TH-C'].includes(entry.tpci.toUpperCase());

  const ptIo = (!isNewSetWithoutTcgio && entry?.ptcgIo) ? `https://images.pokemontcg.io/${entry.ptcgIo}/${clean}.png` : null;
  const lim  = entry ? `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${entry.tpci.toUpperCase()}/${entry.tpci.toUpperCase()}_${padded}_R_EN_LG.png` : null;
  const en   = entry?.tcgdexSet ? `https://assets.tcgdex.net/en/${entry.tcgdexSeries}/${entry.tcgdexSet}/${tcgdexNum}/high.webp` : null;
  const pt   = entry?.tcgdexSet ? `https://assets.tcgdex.net/pt/${entry.tcgdexSeries}/${entry.tcgdexSet}/${tcgdexNum}/high.webp` : null;

  // Se o set é moderno (JTG, DRI, WHT, BLK, Mega), prioriza Limitless e TCGdex pois pokemontcg.io ainda não possui
  const ordered = isNewSetWithoutTcgio
    ? (preferredLang === 'pt' ? [lim, pt, en, ptIo] : [lim, en, pt, ptIo])
    : (preferredLang === 'pt' ? [ptIo, lim, pt, en] : [ptIo, lim, en, pt]);

  const nonNull = ordered.filter(Boolean) as string[];
  return {
    primary:    nonNull[0] || CARD_BACK,
    secondary:  nonNull[1] || CARD_BACK,
    tertiary:   nonNull[2] || CARD_BACK,
    quaternary: nonNull[3] || CARD_BACK,
    fallback:   CARD_BACK,
  };
}

export const CARD_BACK_URL = CARD_BACK;
