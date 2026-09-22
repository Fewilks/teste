import React, { useState, useEffect } from 'react';
import { TrainerLogMatch, BattleTurnAction } from '../../types';
import PokemonCard from '../PokemonCard';
import { convertLocalIdToPTCGL, getRegisteredCollectionCardsCount } from '../../utils/cardImages';
import ReplayActionHistory from './ReplayActionHistory';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Trophy, 
  Swords, 
  Flame, 
  Sparkles, 
  Zap, 
  ShieldAlert, 
  Layers, 
  User, 
  Clock, 
  Filter,
  Eye,
  Info
} from 'lucide-react';

interface BoardReplayProps {
  match: TrainerLogMatch;
}

export default function BoardReplay({ match }: BoardReplayProps) {
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2000); // ms per turn
  const [actionFilter, setActionFilter] = useState<'all' | 'attacks' | 'trainers' | 'abilities' | 'prizes'>('all');

  const turns = match.turns || [];
  const currentTurn = turns[currentTurnIdx] || turns[0];
  const linkedCardsCount = getRegisteredCollectionCardsCount();

  // Match ending & Winner determination
  const isMatchFinished = Boolean(currentTurn?.isGameOver || currentTurnIdx === turns.length - 1);
  const matchWinner: 'player1' | 'player2' = currentTurn?.winner || (match.result === 'win' ? 'player1' : 'player2');
  const winnerName = matchWinner === 'player1' ? match.player1Name : match.player2Name;
  const isPlayer1Winner = isMatchFinished && matchWinner === 'player1';
  const isPlayer2Winner = isMatchFinished && matchWinner === 'player2';

  // Auto playback loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentTurnIdx < turns.length - 1) {
          setCurrentTurnIdx(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentTurnIdx, turns.length, playbackSpeed]);

  if (!currentTurn) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
        Nenhum turno registrado para esta partida.
      </div>
    );
  }

  // Filter actions in current turn
  const filteredActions = currentTurn.actions.filter(act => {
    if (actionFilter === 'all') return true;
    if (actionFilter === 'attacks') return act.type === 'attack' || act.type === 'knockout';
    if (actionFilter === 'trainers') return act.type === 'play' || act.type === 'supporter' || act.type === 'item';
    if (actionFilter === 'abilities') return act.type === 'ability' || act.type === 'energy';
    if (actionFilter === 'prizes') return act.type === 'prize';
    return true;
  });

  const getActionBadge = (action: BattleTurnAction) => {
    const isEvo = action.description.toLowerCase().includes('evoluiu') || action.description.toLowerCase().includes('evolved');
    if (isEvo) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-amber-500/30 to-yellow-400/20 text-amber-300 border border-amber-400/40 shadow-sm animate-pulse">
          <Sparkles className="w-3 h-3 text-amber-400" /> Evolução ✨
        </span>
      );
    }

    switch (action.type) {
      case 'attack':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Swords className="w-3 h-3 text-rose-400" /> Ataque {action.damage ? `(${action.damage} DMG)` : ''}
          </span>
        );
      case 'knockout':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <ShieldAlert className="w-3 h-3 text-purple-400" /> Nocaute!
          </span>
        );
      case 'prize':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Trophy className="w-3 h-3 text-amber-400" /> +{action.prizesTaken || 1} Prêmio(s)
          </span>
        );
      case 'ability':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Habilidade
          </span>
        );
      case 'energy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <Zap className="w-3 h-3 text-yellow-400" /> Energia
          </span>
        );
      case 'draw':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Layers className="w-3 h-3 text-slate-400" /> Compra
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Ação
          </span>
        );
    }
  };

  // Find latest attack in this turn
  const lastAttack = currentTurn.actions.slice().reverse().find(a => a.type === 'attack');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Precise slot-based evolution tracking for this turn
  const p1ActiveEvolution = currentTurn.evolutions?.find(e => e.player === 'player1' && e.isSpotActive);
  const isP1ActiveEvolved = Boolean(p1ActiveEvolution);

  const p2ActiveEvolution = currentTurn.evolutions?.find(e => e.player === 'player2' && e.isSpotActive);
  const isP2ActiveEvolved = Boolean(p2ActiveEvolution);

  const getBenchEvolution = (mon: string, player: 'player1' | 'player2', slotIndex: number) => {
    if (!currentTurn.evolutions || currentTurn.evolutions.length === 0) return undefined;
    
    // 1. Check exact slot index match if recorded
    const exactIndexMatch = currentTurn.evolutions.find(
      e => e.player === player && !e.isSpotActive && e.benchIndex === slotIndex
    );
    if (exactIndexMatch) return exactIndexMatch;

    // 2. Fallback: match by resulting toCard (only if benchIndex is undefined and toCard matches)
    const cardMatch = currentTurn.evolutions.find(
      e => e.player === player && !e.isSpotActive && e.benchIndex === undefined && e.toCard.toLowerCase() === mon.toLowerCase()
    );
    return cardMatch;
  };

  return (
    <div className="space-y-6">
      {/* Educational Banner: Como Funciona o Replay de Turnos */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Como funciona o Replay Virtual do PTCGL</span>
              <p className="text-[11px] text-slate-400">Entenda a simulação visual baseada no log oficial do jogo</p>
            </div>
          </div>
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition-colors"
          >
            {showHowItWorks ? 'Ocultar Explicação' : 'Como Funciona?'}
          </button>
        </div>

        {showHowItWorks && (
          <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-purple-600 text-[10px] flex items-center justify-center text-white">1</span>
                Progressão de Turnos
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Clique nos botões de turno (Setup, T1, T2...) ou use o botão <strong>Reproduzir Replay</strong> para avançar automaticamente no ritmo desejado.
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-cyan-600 text-[10px] flex items-center justify-center text-white">2</span>
                Mesa e Campo em Tempo Real
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                As cartas no <strong>Campo Ativo</strong> e no <strong>Banco</strong> refletem as evoluções, energias ligadas e danos causados em cada instante do jogo.
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-[10px] flex items-center justify-center text-white">3</span>
                Nocautes e Fim da Partida
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Quando um Pokémon é nocauteado e o jogador não tem mais Pokémon para promover, o campo fica vazio e a vitória é anunciada oficialmente.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Turn Scrubber & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTurnIdx(0);
                }}
                disabled={currentTurnIdx === 0}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                title="Voltar ao Início"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTurnIdx(prev => Math.max(0, prev - 1));
                }}
                disabled={currentTurnIdx === 0}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                title="Turno Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                  isPlaying 
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' 
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Reproduzir Replay
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTurnIdx(prev => Math.min(turns.length - 1, prev + 1));
                }}
                disabled={currentTurnIdx >= turns.length - 1}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                title="Próximo Turno"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <button 
                onClick={() => setPlaybackSpeed(3000)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${playbackSpeed === 3000 ? 'bg-purple-600 text-white' : 'hover:text-slate-200'}`}
              >
                0.75x
              </button>
              <button 
                onClick={() => setPlaybackSpeed(2000)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${playbackSpeed === 2000 ? 'bg-purple-600 text-white' : 'hover:text-slate-200'}`}
              >
                1x
              </button>
              <button 
                onClick={() => setPlaybackSpeed(1000)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${playbackSpeed === 1000 ? 'bg-purple-600 text-white' : 'hover:text-slate-200'}`}
              >
                2x
              </button>
            </div>

            {/* Acervo de Cartas Link Indicator */}
            {linkedCardsCount > 0 && (
              <div 
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-[11px] text-emerald-300 font-semibold shadow-sm"
                title="Imagens oficiais do acervo de cartas integradas à simulação deste replay"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Acervo Vinculado ({linkedCardsCount} cartas)</span>
              </div>
            )}
          </div>

          {/* Turn status indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                {currentTurn.turnNumber === 0 
                  ? 'Preparação Inicial (Setup)' 
                  : currentTurn.isGameOver || currentTurnIdx === turns.length - 1 
                  ? `Turno Final ${currentTurn.turnNumber} (Fim de Jogo)` 
                  : `Turno ${currentTurn.turnNumber} de ${turns.length - 1}`}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Jogador da vez: <span className={currentTurn.player === 'player1' ? 'text-purple-400 font-bold' : 'text-rose-400 font-bold'}>{currentTurn.playerName}</span>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${currentTurn.player === 'player1' ? 'bg-purple-500 ring-4 ring-purple-500/20' : 'bg-rose-500 ring-4 ring-rose-500/20'} animate-pulse`} />
          </div>
        </div>

        {/* Turn pills scrubber */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {turns.map((t, idx) => {
            const isSelected = idx === currentTurnIdx;
            const isP1 = t.player === 'player1';
            const isFinalTurn = idx === turns.length - 1 || t.isGameOver;
            return (
              <button
                key={idx}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTurnIdx(idx);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
                  isSelected
                    ? isFinalTurn
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40 ring-2 ring-amber-300 scale-105'
                      : isP1
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 ring-1 ring-purple-400 scale-105'
                      : 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400 scale-105'
                    : isFinalTurn
                    ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {isFinalTurn && <Trophy className="w-3 h-3 text-amber-400" />}
                {t.turnNumber === 0 ? 'Setup' : `T${t.turnNumber}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Grid: Field on the Left, Actions History on the Right (Mobile: History underneath) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: CAMPO DE BATALHA POKÉMON */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl">
            {/* Subtle grid pattern background */}
            <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

            {/* GAME OVER BANNER WHEN TURN IS GAME OVER OR FINAL */}
            {isMatchFinished && (
              <div className="relative mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-purple-950/80 to-slate-950 border border-emerald-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
                    <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-white">
                        Fim de Jogo: {isPlayer1Winner ? match.player1Name : match.player2Name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border border-yellow-200 shadow-md shadow-amber-500/30 flex items-center gap-1 animate-pulse">
                        <Trophy className="w-3.5 h-3.5 fill-slate-950" /> (Vencedor)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 font-medium">
                      {currentTurn.gameEndReason || (isPlayer1Winner 
                        ? `${match.player2Name} não tem mais Pokémon em jogo.` 
                        : `${match.player1Name} não tem mais Pokémon em jogo.`)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prêmios Finais</div>
                  <div className="text-base font-black font-mono text-amber-400">
                    {match.p1PrizesTaken} - {match.p2PrizesTaken}
                  </div>
                </div>
              </div>
            )}

        {/* EVOLUTION EVENT HIGHLIGHT BANNER */}
        {((currentTurn.evolutions && currentTurn.evolutions.length > 0) || isP1ActiveEvolved || isP2ActiveEvolved) && (
          <div className="relative mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-yellow-950/40 to-slate-950 border border-amber-400/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
                <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <span>Evolução Confirmada no Turno #{currentTurn.turnNumber}</span>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 rounded-full text-[9px] font-black tracking-normal uppercase shadow-sm">
                    Apenas Pokémon Evoluído ✨
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                  {currentTurn.evolutions && currentTurn.evolutions.length > 0 ? (
                    currentTurn.evolutions.map((evo, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm">
                        <span className="text-amber-400 font-bold">{evo.player === 'player1' ? match.player1Name : match.player2Name}:</span>
                        <span className="text-slate-400 font-medium">{evo.fromCard || 'Pokémon'}</span>
                        <span className="text-amber-400 font-black">➔</span>
                        <span className="text-amber-200 font-extrabold">{evo.toCard}</span>
                        <span className="text-[10px] text-amber-300/90 font-mono bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {evo.isSpotActive ? 'Campo Ativo' : `Banco #${(evo.benchIndex ?? 0) + 1}`}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-amber-200/90 text-xs font-medium">
                      Pokémon evoluído em campo com brilho dourado
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OPPONENT SIDE (TOP) */}
        <div className="relative space-y-4 mb-6">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-md">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{match.player2Name}</span>
                  <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-extrabold rounded-full border border-rose-500/30">
                    {match.opponentDeckArchetype}
                  </span>
                  {isPlayer2Winner && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border border-yellow-200 shadow-md shadow-amber-500/30 flex items-center gap-1 animate-pulse">
                      <Trophy className="w-3 h-3 fill-slate-950" /> (Vencedor)
                    </span>
                  )}
                  {isPlayer1Winner && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      (Derrotado)
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">Oponente</span>
              </div>
            </div>

            {/* Opponent Prize Cards (Official Pokemon Card Backs) */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-850 shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Prêmios:</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((pNum) => {
                  const isClaimed = pNum > currentTurn.p2PrizesRemaining;
                  return (
                    <div
                      key={pNum}
                      title={isClaimed ? 'Prêmio recolhido' : 'Prêmio em jogo'}
                      className={`transition-all ${isClaimed ? 'opacity-25 grayscale scale-90' : 'hover:scale-110 shadow-sm'}`}
                    >
                      <PokemonCard
                        name="prize"
                        size="xs"
                        isBack={!isClaimed}
                      />
                    </div>
                  );
                })}
              </div>
              <span className="text-xs font-mono font-extrabold text-rose-400 ml-1">
                {currentTurn.p2PrizesRemaining} rest.
              </span>
            </div>
          </div>

          {/* Opponent Field: Active (Left) & Bench (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Opponent Active Pokemon (Featured Card Display) */}
            <div className="md:col-span-4 bg-gradient-to-br from-rose-950/50 to-slate-950 p-4 rounded-2xl border border-rose-500/40 text-center shadow-xl relative flex flex-col items-center min-h-[180px] justify-center">
              {isPlayer2Winner && (
                <div className="w-full flex items-center justify-center mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 border border-yellow-200 shadow-md shadow-amber-500/40 flex items-center gap-1 animate-bounce">
                    <Trophy className="w-3 h-3 fill-slate-950" /> (Vencedor)
                  </span>
                </div>
              )}
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Campo Ativo</span>
                {currentTurn.turnNumber === 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/25 text-amber-300 border border-amber-500/40">
                    Setup Inicial
                  </span>
                ) : currentTurn.player === 'player2' && !currentTurn.isGameOver ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse">
                    Vez do Oponente
                  </span>
                ) : null}
              </div>

              <div className="my-1 flex items-center justify-center">
                {currentTurn.p2Active ? (
                  <PokemonCard
                    name={currentTurn.p2Active}
                    size="md"
                    isActiveSpot={true}
                    activeColor="rose"
                    showNameLabel={true}
                    showInspectButton={true}
                    damage={currentTurn.p2ActiveDamage || 0}
                    energiesCount={currentTurn.p2ActiveEnergies?.length || 0}
                    hasEvolvedInTurn={isP2ActiveEvolved}
                    evolvedFrom={p2ActiveEvolution?.fromCard}
                  />
                ) : currentTurn.p2KnockedOutThisTurn ? (
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <div className="opacity-60 grayscale-[35%] transition-all">
                        <PokemonCard
                          name={currentTurn.p2KnockedOutThisTurn}
                          size="md"
                          isActiveSpot={true}
                          activeColor="rose"
                          showNameLabel={true}
                          showInspectButton={true}
                        />
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="px-3 py-1 bg-red-600/95 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-xl border border-red-300 rotate-[-10deg] animate-pulse">
                          Nocauteado
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-center max-w-[210px]">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-[10px] font-bold text-rose-200 shadow-sm leading-tight">
                        {currentTurn.isGameOver 
                          ? 'Eliminado • Fim de Partida' 
                          : `Nocauteado neste Turno • Promoção no Turno ${currentTurn.turnNumber + 1}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-34 sm:w-28 sm:h-40 rounded-xl border-2 border-dashed border-rose-500/40 bg-rose-950/30 flex flex-col items-center justify-center p-3 text-center">
                    <ShieldAlert className="w-8 h-8 text-rose-400 mb-1 animate-pulse" />
                    <span className="text-xs font-bold text-rose-300">
                      {currentTurn.isGameOver ? 'Nenhum Pokémon' : currentTurn.turnNumber === 0 ? 'Posicionando Pokémon' : 'Sem Pokémon Ativo'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                      {currentTurn.isGameOver 
                        ? 'Todos os Pokémon em campo eliminados' 
                        : currentTurn.turnNumber === 0
                        ? 'Preparação da mesa'
                        : 'Aguardando promoção do banco'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Opponent Bench (Up to 5 slots) */}
            <div className="md:col-span-8 bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-rose-400" /> Banco do Oponente
                </span>
                <span className="text-[10px] text-slate-500">
                  {currentTurn.p2Bench.length}/5 Pokémon
                </span>
              </div>
              <div className="flex flex-wrap gap-3 min-h-[96px] items-center justify-start">
                {currentTurn.p2Bench.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-6 w-full text-center">
                    {currentTurn.isGameOver ? 'Nenhum Pokémon restante no banco' : 'Nenhum Pokémon no banco'}
                  </div>
                ) : (
                  currentTurn.p2Bench.map((mon, idx) => {
                    const benchEvo = getBenchEvolution(mon, 'player2', idx);
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <PokemonCard
                          name={mon}
                          size="sm"
                          showNameLabel={true}
                          showInspectButton={true}
                          hasEvolvedInTurn={Boolean(benchEvo)}
                          evolvedFrom={benchEvo?.fromCard}
                        />
                      </div>
                    );
                  })
                )}
                {/* Empty Bench Slots placeholders */}
                {Array.from({ length: Math.max(0, 5 - currentTurn.p2Bench.length) }).map((_, i) => (
                  <div 
                    key={`empty-p2-${i}`}
                    className="w-14 h-20 md:w-16 md:h-22 rounded-md border border-dashed border-slate-800 bg-slate-900/30 flex items-center justify-center text-[10px] text-slate-600 font-semibold"
                  >
                    Vazio
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MIDFIELD / STADIUM & COMBAT BANNER */}
        <div className="my-6 relative py-3.5 border-y border-dashed border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/70 px-5 rounded-2xl shadow-inner">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-purple-400 tracking-wider">Estádio em Jogo:</span>
            {currentTurn.stadiumInPlay ? (
              <div className="flex items-center gap-2 bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-500/40 shadow-sm">
                <PokemonCard name={currentTurn.stadiumInPlay} size="xs" />
                <span className="text-xs font-bold text-slate-100">
                  {currentTurn.stadiumInPlay}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                Nenhum estádio ativo no momento
              </span>
            )}
          </div>

          {/* Combat announcement */}
          {lastAttack ? (
            <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 px-4 py-2 rounded-xl text-xs font-bold text-rose-200 shadow-lg shadow-rose-950/40">
              <Swords className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
              <span className="truncate max-w-md">{lastAttack.description}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              Fase de planejamento e movimentação deste turno
            </div>
          )}
        </div>

        {/* PLAYER SIDE (BOTTOM) */}
        <div className="relative space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Player Active Pokemon (Featured Card Display) */}
            <div className="md:col-span-4 bg-gradient-to-br from-purple-950/50 to-slate-950 p-4 rounded-2xl border border-purple-500/40 text-center shadow-xl relative flex flex-col items-center min-h-[180px] justify-center">
              {isPlayer1Winner && (
                <div className="w-full flex items-center justify-center mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 border border-yellow-200 shadow-md shadow-amber-500/40 flex items-center gap-1 animate-bounce">
                    <Trophy className="w-3.5 h-3.5 fill-slate-950" /> (Vencedor)
                  </span>
                </div>
              )}
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Seu Campo Ativo</span>
                {currentTurn.turnNumber === 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/25 text-amber-300 border border-amber-500/40">
                    Setup Inicial
                  </span>
                ) : currentTurn.player === 'player1' && !currentTurn.isGameOver ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-600 text-white shadow-md shadow-purple-600/30 animate-pulse">
                    Sua Vez
                  </span>
                ) : null}
              </div>

              <div className="my-1 flex items-center justify-center">
                {currentTurn.p1Active ? (
                  <PokemonCard
                    name={currentTurn.p1Active}
                    size="md"
                    isActiveSpot={true}
                    activeColor="purple"
                    showNameLabel={true}
                    showInspectButton={true}
                    damage={currentTurn.p1ActiveDamage || 0}
                    energiesCount={currentTurn.p1ActiveEnergies?.length || 0}
                    hasEvolvedInTurn={isP1ActiveEvolved}
                    evolvedFrom={p1ActiveEvolution?.fromCard}
                  />
                ) : currentTurn.p1KnockedOutThisTurn ? (
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <div className="opacity-60 grayscale-[35%] transition-all">
                        <PokemonCard
                          name={currentTurn.p1KnockedOutThisTurn}
                          size="md"
                          isActiveSpot={true}
                          activeColor="purple"
                          showNameLabel={true}
                          showInspectButton={true}
                        />
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="px-3 py-1 bg-red-600/95 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-xl border border-red-300 rotate-[-10deg] animate-pulse">
                          Nocauteado
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-center max-w-[210px]">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/50 text-[10px] font-bold text-purple-200 shadow-sm leading-tight">
                        {currentTurn.isGameOver 
                          ? 'Eliminado • Fim de Partida' 
                          : `Nocauteado neste Turno • Promoção no Turno ${currentTurn.turnNumber + 1}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-34 sm:w-28 sm:h-40 rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-950/30 flex flex-col items-center justify-center p-3 text-center">
                    <ShieldAlert className="w-8 h-8 text-purple-400 mb-1 animate-pulse" />
                    <span className="text-xs font-bold text-purple-300">
                      {currentTurn.isGameOver ? 'Nenhum Pokémon' : currentTurn.turnNumber === 0 ? 'Posicionando Pokémon' : 'Sem Pokémon Ativo'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                      {currentTurn.isGameOver 
                        ? 'Todos os Pokémon em campo eliminados' 
                        : currentTurn.turnNumber === 0
                        ? 'Preparação da mesa'
                        : 'Aguardando promoção do banco'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Player Bench (Up to 5 slots) */}
            <div className="md:col-span-8 bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Seu Banco de Pokémon
                </span>
                <span className="text-[10px] text-slate-500">
                  {currentTurn.p1Bench.length}/5 Pokémon
                </span>
              </div>
              <div className="flex flex-wrap gap-3 min-h-[96px] items-center justify-start">
                {currentTurn.p1Bench.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-6 w-full text-center">
                    {currentTurn.isGameOver ? 'Nenhum Pokémon restante no banco' : 'Nenhum Pokémon no banco'}
                  </div>
                ) : (
                  currentTurn.p1Bench.map((mon, idx) => {
                    const benchEvo = getBenchEvolution(mon, 'player1', idx);
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <PokemonCard
                          name={mon}
                          size="sm"
                          showNameLabel={true}
                          showInspectButton={true}
                          hasEvolvedInTurn={Boolean(benchEvo)}
                          evolvedFrom={benchEvo?.fromCard}
                        />
                      </div>
                    );
                  })
                )}
                {/* Empty Bench Slots placeholders */}
                {Array.from({ length: Math.max(0, 5 - currentTurn.p1Bench.length) }).map((_, i) => (
                  <div 
                    key={`empty-p1-${i}`}
                    className="w-14 h-20 md:w-16 md:h-22 rounded-md border border-dashed border-slate-800 bg-slate-900/30 flex items-center justify-center text-[10px] text-slate-600 font-semibold"
                  >
                    Vazio
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-purple-500/20 pt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{match.player1Name}</span>
                  <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-extrabold rounded-full border border-purple-500/30">
                    {match.playerDeckArchetype}
                  </span>
                  {isPlayer1Winner && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border border-yellow-200 shadow-md shadow-amber-500/30 flex items-center gap-1 animate-pulse">
                      <Trophy className="w-3 h-3 fill-slate-950" /> (Vencedor)
                    </span>
                  )}
                  {isPlayer2Winner && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      (Derrotado)
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">Você</span>
              </div>
            </div>

            {/* Player Prize Cards (Official Pokemon Card Backs) */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-850 shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Prêmios:</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((pNum) => {
                  const isClaimed = pNum > currentTurn.p1PrizesRemaining;
                  return (
                    <div
                      key={pNum}
                      title={isClaimed ? 'Prêmio recolhido' : 'Prêmio em jogo'}
                      className={`transition-all ${isClaimed ? 'opacity-25 grayscale scale-90' : 'hover:scale-110 shadow-sm'}`}
                    >
                      <PokemonCard
                        name="prize"
                        size="xs"
                        isBack={!isClaimed}
                      />
                    </div>
                  );
                })}
              </div>
              <span className="text-xs font-mono font-extrabold text-purple-400 ml-1">
                {currentTurn.p1PrizesRemaining} rest.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* COLUNA DIREITA: HISTÓRICO DE AÇÕES DENTRO DA PARTIDA (NO MOBILE FICA EMBAIXO) */}
    <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-4">
      <ReplayActionHistory
        turns={turns}
        currentTurnIdx={currentTurnIdx}
        onSelectTurn={setCurrentTurnIdx}
        actionFilter={actionFilter}
        setActionFilter={setActionFilter}
        isMatchFinished={isMatchFinished}
        matchWinner={matchWinner}
        winnerName={winnerName}
        match={match}
      />
    </div>
  </div>
</div>
  );
}
