import React from 'react';
import PokemonSprite from './PokemonSprite';

interface PokemonLoaderProps {
  pokemon?: string;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

export default function PokemonLoader({
  pokemon = 'gengar',
  title = 'Carregando dados da Spirits Arena...',
  subtitle = 'Sincronizando estatísticas e registros...',
  size = 'md',
  fullScreen = false,
  className = ''
}: PokemonLoaderProps) {
  const containerClasses = fullScreen
    ? 'min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6'
    : 'flex flex-col items-center justify-center py-16 px-4 text-center';

  const spriteSize = size === 'sm' ? 'md' : size === 'lg' ? 'xl' : 'lg';

  return (
    <div className={`${containerClasses} ${className}`} id="pokemon-loading-screen">
      {/* Animated Portal Effect */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer pulsing aura */}
        <div className="absolute w-28 h-28 bg-purple-600/15 rounded-full blur-xl animate-pulse pointer-events-none" />
        
        {/* Rotating ethereal ring */}
        <div className="absolute w-24 h-24 border-2 border-purple-500/20 border-t-purple-400 border-r-indigo-400 rounded-full animate-spin" />
        
        {/* Glowing inner base */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-950/50 backdrop-blur-sm">
          <div className="animate-bounce">
            <PokemonSprite name={pokemon} size={spriteSize} className="filter drop-shadow-[0_4px_8px_rgba(147,51,234,0.4)]" />
          </div>
        </div>
      </div>

      {/* Text Hierarchy */}
      <h3 className="text-white font-extrabold text-base md:text-lg tracking-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-slate-400 text-xs mt-1.5 font-mono max-w-sm">
          {subtitle}
        </p>
      )}

      {/* Subtle indicator dots */}
      <div className="flex items-center gap-1.5 mt-4">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-150" />
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse delay-300" />
      </div>
    </div>
  );
}
