import React, { useState, useEffect } from 'react';
import { 
  resolveCard, 
  POKEMON_CARD_BACK, 
  POKEMON_CARD_BACK_FALLBACK, 
  CardMetadata,
  formatPTCGLCardCode,
  getPokemonSpriteHierarchy
} from '../utils/cardImages';
import { Eye, Zap, Flame, ShieldAlert, Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';
import ModalPortal from './ModalPortal';

export interface PokemonCardProps {
  name: string;
  imageUrl?: string;
  setCode?: string;
  setNumber?: string;
  card?: Partial<CardMetadata>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isBack?: boolean;
  damage?: number;
  energiesCount?: number;
  energyType?: string;
  isActiveSpot?: boolean;
  activeColor?: 'purple' | 'rose' | 'amber';
  onClick?: () => void;
  showNameLabel?: boolean;
  className?: string;
  showInspectButton?: boolean;
  hasEvolvedInTurn?: boolean;
  evolvedFrom?: string;
}

export default function PokemonCard({
  name,
  imageUrl,
  setCode,
  setNumber,
  card,
  size = 'md',
  isBack = false,
  damage = 0,
  energiesCount = 0,
  energyType,
  isActiveSpot = false,
  activeColor = 'purple',
  onClick,
  showNameLabel = false,
  className = '',
  showInspectButton = false,
  hasEvolvedInTurn = false,
  evolvedFrom
}: PokemonCardProps) {
  const [imgLevel, setImgLevel] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);

  const fallbackData = resolveCard(name);
  const cardData: CardMetadata = {
    id: card?.id || fallbackData.id,
    name: card?.name || fallbackData.name,
    category: card?.category || fallbackData.category,
    imageUrl: imageUrl || card?.imageUrl || fallbackData.imageUrl,
    setCode: setCode || card?.setCode || fallbackData.setCode,
    setNumber: setNumber || card?.setNumber || fallbackData.setNumber,
    localSetId: card?.localSetId || fallbackData.localSetId,
    stage: card?.stage || fallbackData.stage,
    hp: card?.hp || fallbackData.hp,
    energyType: card?.energyType || fallbackData.energyType,
    isFromCollection: Boolean(imageUrl || card?.isFromCollection || fallbackData.isFromCollection),
    collectionScanUrl: imageUrl || card?.collectionScanUrl || fallbackData.collectionScanUrl
  };
  const ptcglCard = formatPTCGLCardCode(cardData);
  const spriteHierarchy = getPokemonSpriteHierarchy(cardData);

  // ============================================================================
  // FIX CRÍTICO: reset do imgLevel quando a carta muda.
  // Sem isso, o React reutiliza o estado entre cartas diferentes
  // (ex: um Dunsparce que falhou no nível 3 contamina o próximo Mew ex).
  // ============================================================================
  useEffect(() => {
    setImgLevel(0);
  }, [name, imageUrl, setCode, setNumber, card?.id]);

  const sizeClasses = {
    xs: 'w-9 h-12 rounded-sm',
    sm: 'w-14 h-20 md:w-16 md:h-22 rounded-md',
    md: 'w-24 h-34 sm:w-28 sm:h-40 rounded-lg',
    lg: 'w-32 h-44 sm:w-36 sm:h-50 rounded-xl',
    xl: 'w-56 h-78 sm:w-64 sm:h-90 rounded-2xl'
  };

  const ringClasses = {
    purple: 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/30',
    rose: 'ring-2 ring-rose-500 shadow-lg shadow-rose-500/30',
    amber: 'ring-2 ring-amber-500 shadow-lg shadow-amber-500/30'
  };

  const handleImageError = () => {
    // Limita o nível máximo de erro para não entrar em loop infinito
    if (imgLevel < 4) {
      setImgLevel(prev => prev + 1);
    }
  };

  const getCardSource = (): string => {
    if (isBack) {
      return imgLevel > 0 ? POKEMON_CARD_BACK_FALLBACK : POKEMON_CARD_BACK;
    }
    
    // Se o usuário passou uma URL específica (ex: do acervo), prioriza ela
    if (imageUrl && imgLevel === 0) return imageUrl;
    if (card?.imageUrl && imgLevel === 0) return card.imageUrl;

    switch (imgLevel) {
      case 0:
        return spriteHierarchy.primary;
      case 1:
        return spriteHierarchy.artwork;
      case 2:
        return spriteHierarchy.battleSprite;
      case 3:
        return spriteHierarchy.dexSprite;
      default:
        // Fallback final: se tudo falhar, usa a imagem de fallback do sistema
        return spriteHierarchy.fallback || POKEMON_CARD_BACK_FALLBACK;
    }
  };

  const cardSrc = getCardSource();

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div
        onClick={onClick ? onClick : () => setIsInspecting(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative ${sizeClasses[size]} shrink-0 cursor-pointer transition-all duration-200 transform ${
          isHovered ? '-translate-y-1 scale-105 z-20' : 'z-10'
        } ${
          hasEvolvedInTurn 
            ? 'ring-2 ring-amber-400 shadow-xl shadow-amber-500/40 animate-evolution-glow scale-[1.02]' 
            : (isActiveSpot ? ringClasses[activeColor] : 'shadow-md shadow-black/60')
        } group`}
        title={`${cardData.name}${hasEvolvedInTurn ? ` (Evoluiu neste turno a partir de ${evolvedFrom || 'básico'}!)` : ''} (Clique para ampliar)`}
      >
        {hasEvolvedInTurn && !isBack && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-yellow-100 flex items-center gap-1 z-30 animate-bounce tracking-wide uppercase whitespace-nowrap">
            <Sparkles className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
            <span>{evolvedFrom ? `De ${evolvedFrom}!` : 'Evoluiu!'}</span>
          </div>
        )}

        <div className={`w-full h-full rounded-inherit overflow-hidden bg-slate-950 border relative flex items-center justify-center ${
          hasEvolvedInTurn ? 'border-amber-300' : 'border-slate-700/60'
        }`}>
          {/* Adicionado key={imgLevel} para forçar o React a recarregar a tag img quando a imagem falha */}
          <img
            key={`${cardData.id}-${imgLevel}`}
            src={cardSrc}
            alt={isBack ? 'Carta de Prêmio' : cardData.name}
            onError={handleImageError}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center transition-transform duration-300"
          />

          {hasEvolvedInTurn && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer pointer-events-none z-20" />
          )}

          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {damage > 0 && !isBack && (
            <div className="absolute top-1 right-1 bg-rose-600/95 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow-md border border-rose-400 flex items-center gap-0.5 animate-pulse z-20">
              <ShieldAlert className="w-2.5 h-2.5" />
              <span>-{damage}</span>
            </div>
          )}

          {energiesCount > 0 && !isBack && (
            <div className="absolute bottom-1 left-1 bg-amber-500/95 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-md border border-amber-300 flex items-center gap-0.5 z-20">
              <Flame className="w-2.5 h-2.5 text-slate-950" />
              <span>x{energiesCount}</span>
            </div>
          )}

          {isActiveSpot && !isBack && (
            <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white shadow-md z-20 ${
              activeColor === 'rose' ? 'bg-rose-600' : 'bg-purple-600'
            }`}>
              Ativo
            </div>
          )}

          {showInspectButton && (
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
              <span className="p-1.5 rounded-full bg-purple-600 text-white shadow-lg">
                <Eye className="w-3.5 h-3.5" />
              </span>
            </div>
          )}
        </div>
      </div>

      {showNameLabel && !isBack && (
        <div className="mt-1.5 text-center max-w-[125px]">
          <div className="text-xs font-bold text-slate-100 capitalize truncate" title={cardData.name}>
            {cardData.name}
          </div>
          <div className="card-data-field text-[9px] font-mono text-purple-300 font-bold tracking-tight truncate" title={`Código Oficial PTCGL: ${ptcglCard.canonicalCode}`}>
            {ptcglCard.canonicalCode}
          </div>
          {hasEvolvedInTurn ? (
            <div className="text-[9px] font-extrabold text-amber-300 uppercase tracking-wide flex items-center justify-center gap-0.5 animate-pulse truncate" title={evolvedFrom ? `Evoluiu a partir de ${evolvedFrom}` : 'Evoluiu neste turno'}>
              <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span>{evolvedFrom ? `De ${evolvedFrom}` : 'Evoluiu'}</span>
            </div>
          ) : cardData.stage ? (
            <div className="text-[9px] font-semibold text-purple-400 uppercase tracking-wide">
              {cardData.stage}
            </div>
          ) : null}
        </div>
      )}

      <ModalPortal isOpen={isInspecting} onClose={() => setIsInspecting(false)}>
        <div 
          className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center relative my-auto animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIsInspecting(false)}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>

          <div className="card-data-field flex items-center justify-center gap-2">
            <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">
              {isBack ? 'Carta de Prêmio' : cardData.category}
            </span>
            {!isBack && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950 border border-purple-500/40 text-[10px] font-mono font-bold text-amber-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {ptcglCard.canonicalCode}
              </span>
            )}
            {!isBack && cardData.isFromCollection && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-semibold text-emerald-300">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Vinculado ao Acervo
              </span>
            )}
          </div>

          <div className="w-56 h-78 sm:w-64 sm:h-90 mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950 flex items-center justify-center relative">
            <img
              key={`inspect-${cardData.id}-${imgLevel}`}
              src={cardSrc}
              alt={cardData.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>

          {hasEvolvedInTurn && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 text-xs text-amber-200 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium">
                <strong className="text-amber-300">Evolução do Turno:</strong> {evolvedFrom ? `${evolvedFrom} ➔ ` : ''}{cardData.name}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">{isBack ? 'Prêmio em Jogo' : cardData.name}</h3>
            <p className="card-data-field text-xs font-mono text-slate-400">
              Código Oficial PTCGL: <span className="text-purple-300 font-bold">{ptcglCard.canonicalCode}</span>
            </p>
          </div>

          <button
            onClick={() => setIsInspecting(false)}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>
      </ModalPortal>
    </div>
  );
}
