import React from 'react';
import { Member } from '../types';
import { getRoleBadge } from '../utils';
import { Lock, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';
import PokemonSprite from './PokemonSprite';

interface RoleLockProps {
  currentMember: Member;
  requiredRole: 'pokeball' | 'greatball' | 'ultraball' | 'masterball' | 'Premium ball';
  featureName: string;
  onGoToProfile: () => void;
}

export default function RoleLock({ currentMember, requiredRole, featureName, onGoToProfile }: RoleLockProps) {
  // Convert roles to a human-friendly label
  const getRoleLabel = (r: string): string => {
    switch (r) {
      case 'pokeball': return '🔴 Pokéball';
      case 'greatball': return '🔵 Greatball';
      case 'ultraball': return '⚫ Ultraball';
      case 'masterball': return '🟣 Masterball';
      case 'Premium ball': return '✨ Premium ball (Staff)';
      default: return r;
    }
  };

  return (
    <div className="max-w-xl mx-auto py-16 px-6 text-center" id={`role-lock-${featureName.toLowerCase().replace(/\s+/g, '-')}`}>
      
      {/* Decorative Lock and Pokémon Shield */}
      <div className="relative inline-flex items-center justify-center mb-8">
        <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="w-24 h-24 bg-slate-900 border-2 border-dashed border-purple-500/40 rounded-full flex items-center justify-center relative z-10">
          <PokemonSprite name="substitute" size="md" className="opacity-80" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-purple-600 p-2.5 rounded-xl border-2 border-slate-950 shadow-xl text-white z-20 animate-bounce">
          <Lock className="w-5 h-5" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/20 px-3 py-1 rounded-full text-[10px] text-purple-400 font-mono font-bold uppercase">
          <ShieldAlert className="w-3.5 h-3.5" /> Acesso Restrito ao Nível
        </div>

        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
          Suba seu Rank para Liberar o <span className="text-purple-400">{featureName}</span>
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Para acessar esta funcionalidade competitiva, seu perfil de treinador precisa estar na categoria de rank <strong className="text-slate-200">{getRoleLabel(requiredRole)}</strong> ou superior.
        </p>

        {/* Status Comparison */}
        <div className="max-w-xs mx-auto grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-850/60 my-6 text-left">
          <div>
            <div className="text-[9px] text-slate-500 uppercase font-bold">Seu Cargo:</div>
            <div className="mt-1 flex items-center">{getRoleBadge(currentMember.role)}</div>
          </div>
          <div className="border-l border-slate-850 pl-4">
            <div className="text-[9px] text-slate-500 uppercase font-bold">Necessário:</div>
            <div className="mt-1 flex items-center">{getRoleBadge(requiredRole)}</div>
          </div>
        </div>

        {/* Redirect Action Button */}
        <button
          id="btn-lock-go-to-profile"
          onClick={onGoToProfile}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-950/40 border border-purple-500/20 group hover:scale-102"
        >
          <span>Subir de Rank no Meu Perfil</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-[10px] text-slate-500 font-mono mt-4">
          Como este é um ambiente de simulação, você pode alterar o seu cargo livremente a qualquer momento.
        </p>
      </div>

    </div>
  );
}
