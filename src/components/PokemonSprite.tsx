import React, { useState, useEffect } from 'react';
import { getCreatureSpriteHierarchy, sanitizePokemonCreatureName } from '../utils/pokemonSprites';

interface PokemonSpriteProps {
  name: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  key?: React.Key;
}

export const getPokemonSpriteUrl = (pokemonName: string): string => {
  const list = getCreatureSpriteHierarchy(pokemonName);
  return list[0] || 'https://play.pokemonshowdown.com/sprites/dex/substitute.png';
};

export default function PokemonSprite({ name, className = '', size = 'md' }: PokemonSpriteProps) {
  const [level, setLevel] = useState<number>(0);

  useEffect(() => {
    setLevel(0);
  }, [name]);

  const sources = getCreatureSpriteHierarchy(name);
  const currentSrc = sources[level] || sources[sources.length - 1];

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
    '2xl': 'w-36 h-36'
  };

  const handleImgError = () => {
    if (level < sources.length - 1) {
      setLevel(prev => prev + 1);
    }
  };

  const cleanId = sanitizePokemonCreatureName(name);

  return (
    <div className={`flex items-center justify-center overflow-hidden shrink-0 ${sizeClasses[size]} ${className}`}>
      <img
        id={`sprite-${cleanId}`}
        key={`${cleanId}-${level}`}
        src={currentSrc}
        alt={name || 'Pokémon'}
        className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:scale-110"
        onError={handleImgError}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  );
}
