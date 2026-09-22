import { MetaDeck } from '../types';

export const fallbackMetaDecks: MetaDeck[] = [
  {
    name: 'Dragapult ex',
    archetype: 'Jogador: Andrew Hedrick (1º Lugar - Worlds)',
    share: 1,
    winRate: 66.8,
    imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TWM/TWM_130_R_EN_LG.png',
    updatedAt: new Date().toISOString().split('T')[0],
    description: 'Baralho campeão mundial de Andrew Hedrick. Combina Dragapult ex com Phantom Dive para causar 200 no ativo e espalhar 60 de dano no banco, acelerado por Drakloak (Recon Directive) e Munkidori.',
    cards: [
      { name: 'Dragapult ex (TWM 130)', count: 3 },
      { name: 'Drakloak (TWM 129)', count: 4 },
      { name: 'Dreepy (TWM 128)', count: 4 },
      { name: 'Munkidori (TWM 95)', count: 2 }
    ],
    rawList: `Pokémon: 20\n4 Dreepy TWM 128\n4 Drakloak TWM 129\n3 Dragapult ex TWM 130\n2 Munkidori TWM 95\n2 Budew ASC 16\n1 Fezandipiti ex TWM 96\n1 Radiant Alakazam SIT 59\n1 Manaphy BRS 41\n1 Mew ex MEW 151\n1 Cleffa OBF 80\n\nTrainer: 32\n4 Arven SVI 166\n3 Iono PAF 80\n2 Boss's Orders PAL 172\n1 Professor's Research SVI 190\n4 Buddy-Buddy Poffin TEF 144\n4 Ultra Ball SVI 196\n3 Rare Candy SVI 191\n2 Super Rod PAL 188\n2 Counter Catcher PAR 160\n1 Prime Catcher TEF 157\n1 Technical Machine: Devolution PAR 177\n1 Night Stretcher SFA 61\n2 Area Zero Underdepths SCR 131\n2 Technical Machine: Evolution PAR 178\n\nEnergy: 8\n4 Basic Psychic Energy SVE 5\n3 Basic Fire Energy SVE 2\n1 Basic Darkness Energy SVE 7`
  },
  {
    name: 'Teal Mask Ogerpon ex / Clefairy',
    archetype: 'Jogador: Diego Cassiraga (2º Lugar - Worlds)',
    share: 2,
    winRate: 63.5,
    imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TWM/TWM_025_R_EN_LG.png',
    updatedAt: new Date().toISOString().split('T')[0],
    description: 'Vice-campeão mundial de Diego Cassiraga. Aceleração de energias massiva com Teal Dance da Teal Mask Ogerpon ex combinada com atacantes flexíveis e busca consistente.',
    cards: [
      { name: 'Teal Mask Ogerpon ex (TWM 25)', count: 4 },
      { name: 'Clefairy ex (TWM 64)', count: 3 },
      { name: 'Bug Catching Set (TWM 143)', count: 4 },
      { name: 'Energy Switch (SVI 173)', count: 4 }
    ],
    rawList: `Pokémon: 16\n4 Teal Mask Ogerpon ex TWM 25\n3 Clefairy ex TWM 64\n2 Fezandipiti ex TWM 96\n2 Mew ex MEW 151\n2 Squawkabilly ex PAF 75\n1 Radiant Greninja ASR 46\n1 Iron Bundle PAR 56\n1 Pecharunt ex SFA 39\n\nTrainer: 32\n4 Professor Sada's Vitality PAR 170\n3 Iono PAF 80\n2 Boss's Orders PAL 172\n4 Bug Catching Set TWM 143\n4 Nest Ball SVI 181\n4 Ultra Ball SVI 196\n4 Energy Switch SVI 173\n2 Earthen Vessel PAR 163\n2 Super Rod PAL 188\n1 Prime Catcher TEF 157\n1 Secret Box TWM 163\n1 PokéStop PGO 68\n\nEnergy: 12\n9 Basic Grass Energy SVE 1\n3 Basic Psychic Energy SVE 5`
  },
  {
    name: 'Charizard ex / Pidgeot ex',
    archetype: 'Charizard ex / Pidgeot ex / Dusknoir',
    share: 3,
    winRate: 61.2,
    imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/OBF/OBF_125_R_EN_LG.png',
    updatedAt: new Date().toISOString().split('T')[0],
    description: 'Um dos decks mais premiados do formato Standard. Charizard ex energiza a si mesmo e aliados através da habilidade Infernal Reign, enquanto Pidgeot ex busca qualquer carta do baralho com Quick Search a cada turno.',
    cards: [
      { name: 'Charizard ex (OBF 125)', count: 3 },
      { name: 'Pidgeot ex (OBF 164)', count: 2 },
      { name: 'Dusknoir (SFA 20)', count: 2 },
      { name: 'Rare Candy (SVI 191)', count: 4 }
    ],
    rawList: `Pokémon: 19\n3 Charmander MEW 4\n1 Charmeleon PAF 8\n3 Charizard ex OBF 125\n2 Pidgey MEW 16\n2 Pidgeot ex OBF 164\n2 Duskull SFA 18\n1 Dusclops SFA 19\n1 Dusknoir SFA 20\n1 Fezandipiti ex TWM 96\n1 Rotom V LOR 58\n1 Lumineon V BRS 40\n1 Radiant Charizard PGO 11\n\nTrainer: 34\n4 Arven SVI 166\n3 Iono PAF 80\n2 Boss's Orders PAL 172\n1 Professor's Research SVI 190\n1 Briar SCR 132\n4 Rare Candy SVI 191\n4 Buddy-Buddy Poffin TEF 144\n4 Ultra Ball SVI 196\n2 Nest Ball SVI 181\n2 Super Rod PAL 188\n1 Prime Catcher TEF 157\n1 Counter Catcher PAR 160\n1 Forest Seal Stone SIT 156\n1 Technical Machine: Evolution PAR 178\n1 Collapsed Stadium BRS 137\n\nEnergy: 7\n6 Basic Fire Energy SVE 2\n1 Basic Darkness Energy SVE 7`
  },
  {
    name: 'Gardevoir ex',
    archetype: 'Gardevoir ex / Drifloon / Scream Tail',
    share: 4,
    winRate: 60.5,
    imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/SVI/SVI_086_R_EN_LG.png',
    updatedAt: new Date().toISOString().split('T')[0],
    description: 'Acelera energias Psíquicas ilimitadamente da pilha de descarte com Psychic Embrace. Utiliza Drifloon com Bravery Charm e Scream Tail para nocautear atacantes de múltiplos prêmios com facilidade.',
    cards: [
      { name: 'Gardevoir ex (SVI 086)', count: 2 },
      { name: 'Kirlia (SIT 068)', count: 4 },
      { name: 'Drifloon (SVI 089)', count: 2 },
      { name: 'Scream Tail (PAR 086)', count: 2 }
    ],
    rawList: `Pokémon: 18\n4 Ralts ASR 60\n4 Kirlia SIT 68\n2 Gardevoir ex SVI 86\n2 Drifloon SVI 89\n2 Scream Tail PAR 86\n1 Fezandipiti ex TWM 96\n1 Radiant Greninja ASR 46\n1 Munkidori TWM 95\n1 Flutter Mane TEF 78\n\nTrainer: 33\n4 Arven SVI 166\n4 Iono PAF 80\n2 Boss's Orders PAL 172\n1 Professor's Research SVI 190\n4 Buddy-Buddy Poffin TEF 144\n4 Ultra Ball SVI 196\n2 Nest Ball SVI 181\n2 Super Rod PAL 188\n2 Earthen Vessel PAR 163\n2 Bravery Charm PAL 173\n1 Counter Catcher PAR 160\n1 Unfair Stamp TWM 165\n1 Technical Machine: Evolution PAR 178\n1 Artazon PAL 171\n\nEnergy: 9\n7 Basic Psychic Energy SVE 5\n2 Basic Darkness Energy SVE 7`
  },
  {
    name: 'Raging Bolt ex',
    archetype: 'Raging Bolt ex / Teal Mask Ogerpon',
    share: 5,
    winRate: 58.9,
    imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/TEF/TEF_123_R_EN_LG.png',
    updatedAt: new Date().toISOString().split('T')[0],
    description: 'Dano explosivo ilimitado. Descarta energias em jogo para causar 70 de dano por energia, utilizando Ogerpon para acelerar energias de Grama e puxar cartas adicionais.',
    cards: [
      { name: 'Raging Bolt ex (TEF 123)', count: 4 },
      { name: 'Teal Mask Ogerpon ex (TWM 25)', count: 4 },
      { name: 'Professor Sada\'s Vitality (PAR 170)', count: 4 }
    ],
    rawList: `Pokémon: 12\n4 Raging Bolt ex TEF 123\n4 Teal Mask Ogerpon ex TWM 25\n1 Radiant Greninja ASR 46\n1 Fezandipiti ex TWM 96\n1 Flutter Mane TEF 78\n1 Sandy Shocks ex PAR 108\n\nTrainer: 35\n4 Professor Sada's Vitality PAR 170\n2 Iono PAF 80\n1 Boss's Orders PAL 172\n4 Earthen Vessel PAR 163\n4 Nest Ball SVI 181\n4 Ultra Ball SVI 196\n3 Pokégear 3.0 SVI 186\n2 Energy Switch SVI 173\n2 Bravery Charm PAL 173\n1 Prime Catcher TEF 157\n1 Superior Energy Retrieval PAL 189\n1 Super Rod PAL 188\n1 Lost Vacuum LOR 162\n1 Pal Pad SVI 182\n1 Night Stretcher SFA 61\n1 Squawkabilly ex PAF 75\n\nEnergy: 13\n6 Basic Grass Energy SVE 1\n4 Basic Lightning Energy SVE 4\n3 Basic Fighting Energy SVE 6`
  },
  {
    name: 'Regidrago VSTAR',
    archetype: 'Regidrago VSTAR / Teal Mask Ogerpon',
    share: 6,
    winRate: 58.2,
    imageUrl: 'https://images.pokemontcg.io/swsh12/136.png',
    updatedAt: new Date().toISOString().split('T')[0],
    description: 'Extremamente versátil. Usa o ataque Apex Dragon para copiar ataques de qualquer dragão no descarte (como Giratina VSTAR ou Noivern ex), energizado rapidamente por Teal Mask Ogerpon ex.',
    cards: [
      { name: 'Regidrago VSTAR (SIT 136)', count: 3 },
      { name: 'Teal Mask Ogerpon ex (TWM 25)', count: 4 },
      { name: 'Energy Switch (SVI 173)', count: 4 }
    ],
    rawList: `Pokémon: 17\n3 Regidrago V SIT 135\n3 Regidrago VSTAR SIT 136\n3 Teal Mask Ogerpon ex TWM 25\n1 Giratina VSTAR LOR 131\n1 Noivern ex PAF 69\n1 Haxorus TWM 156\n1 Dragapult ex TWM 130\n1 Kyurem SFA 47\n1 Mew ex MEW 151\n1 Radiant Charizard PGO 11\n1 Fezandipiti ex TWM 96\n\nTrainer: 31\n4 Professor Sada's Vitality PAR 170\n3 Iono PAF 80\n2 Boss's Orders PAL 172\n4 Ultra Ball SVI 196\n4 Nest Ball SVI 181\n4 Energy Switch SVI 173\n4 Earthen Vessel PAR 163\n2 Super Rod PAL 188\n1 Superior Energy Retrieval PAL 189\n1 Prime Catcher TEF 157\n1 Pokégear 3.0 SVI 186\n1 Lost Vacuum LOR 162\n\nEnergy: 12\n6 Basic Grass Energy SVE 1\n3 Basic Fire Energy SVE 2\n3 Basic Psychic Energy SVE 13`
  },
  {
    name: "Cynthia's Garchomp ex",
    archetype: "Cynthia's Garchomp ex / Roserade",
    share: 7,
    winRate: 62.4,
    imageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/JTG/JTG_086_R_EN.png',
    updatedAt: new Date().toISOString().split('T')[0],
    description: 'Estratégia ofensiva com Cynthia\'s Garchomp ex e suporte de Cynthia\'s Roserade para controle de mesa e aceleração rápida com Cynthia\'s Ambition.',
    cards: [
      { name: "Cynthia's Garchomp ex (JTG 86)", count: 3 },
      { name: "Cynthia's Roserade (JTG 8)", count: 2 },
      { name: "Cynthia's Gabite (JTG 85)", count: 2 },
      { name: "Cynthia's Gible (JTG 84)", count: 4 }
    ],
    rawList: `Pokémon: 18\n3 Cynthia's Garchomp ex JTG 86\n2 Cynthia's Gabite JTG 85\n4 Cynthia's Gible JTG 84\n2 Cynthia's Roserade JTG 8\n2 Cynthia's Roselia JTG 7\n1 Fezandipiti ex TWM 96\n1 Mew ex MEW 151\n1 Radiant Greninja ASR 46\n2 Budew ASC 16\n\nTrainer: 34\n4 Arven SVI 166\n4 Cynthia's Ambition BRS 138\n3 Iono PAF 80\n2 Boss's Orders PAL 172\n4 Buddy-Buddy Poffin TEF 144\n4 Ultra Ball SVI 196\n3 Rare Candy SVI 191\n2 Super Rod PAL 188\n2 Counter Catcher PAR 160\n1 Prime Catcher TEF 157\n2 Night Stretcher SFA 61\n3 Artazon PAL 171\n\nEnergy: 8\n5 Basic Fighting Energy SVE 6\n3 Basic Water Energy SVE 3`
  }
];
