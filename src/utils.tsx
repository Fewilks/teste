import React from 'react';

export function getRoleBadge(role: string) {
  const getBallImg = (ballType: string) => {
    switch (ballType) {
      case 'pokeball':
        return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
      case 'greatball':
        return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png';
      case 'ultraball':
        return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png';
      case 'masterball':
        return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png';
      case 'Premium ball':
        return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/premier-ball.png';
      default:
        return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
    }
  };

  switch (role) {
    case 'pokeball':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-red-950/40 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full font-bold">
          <img src={getBallImg('pokeball')} alt="Poké Ball" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />
          Level Pokéball
        </span>
      );
    case 'greatball':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-950/40 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-bold">
          <img src={getBallImg('greatball')} alt="Great Ball" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />
          Level Greatball
        </span>
      );
    case 'ultraball':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-900 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
          <img src={getBallImg('ultraball')} alt="Ultra Ball" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />
          Level Ultraball
        </span>
      );
    case 'masterball':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-950/40 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-full font-bold">
          <img src={getBallImg('masterball')} alt="Master Ball" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />
          Level Masterball
        </span>
      );
    case 'Premium ball':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-900 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded-full font-extrabold shadow-md shadow-amber-950/20">
          <img src={getBallImg('Premium ball')} alt="Premier Ball" className="w-3.5 h-3.5 object-contain animate-pulse" referrerPolicy="no-referrer" />
          Level Premium (Staff)
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-850 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
          🛡️ {role}
        </span>
      );
  }
}

