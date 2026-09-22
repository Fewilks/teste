import React, { useState } from 'react';
import { BattleTurnSnapshot, BattleTurnAction, TrainerLogMatch } from '../../types';
import PokemonCard from '../PokemonCard';
import { convertLocalIdToPTCGL } from '../../utils/cardImages';
import { 
  History, 
  Filter, 
  Swords, 
  ShieldAlert, 
  Trophy, 
  Sparkles, 
  Zap, 
  Layers,
  ChevronRight
} from 'lucide-react';

interface ReplayActionHistoryProps {
  turns: BattleTurnSnapshot[];
  currentTurnIdx: number;
  onSelectTurn: (idx: number) => void;
  actionFilter: 'all' | 'attacks' | 'trainers' | 'abilities' | 'prizes';
  setActionFilter: (filter: 'all' | 'attacks' | 'trainers' | 'abilities' | 'prizes') => void;
  isMatchFinished: boolean;
  matchWinner: 'player1' | 'player2';
  winnerName: string;
  match: TrainerLogMatch;
}

export default function ReplayActionHistory({
  turns,
  currentTurnIdx,
  onSelectTurn,
  actionFilter,
  setActionFilter,
  isMatchFinished,
  winnerName,
}: ReplayActionHistoryProps) {
  const [historyScope, setHistoryScope] = useState<'turn' | 'match'>('turn');
  const currentTurn = turns[currentTurnIdx] || turns[0];

  const filterAction = (act: BattleTurnAction) => {
    if (actionFilter === 'all') return true;
    if (actionFilter === 'attacks') return act.type === 'attack' || act.type === 'knockout';
    if (actionFilter === 'trainers') return act.type === 'play' || act.type === 'supporter' || act.type === 'item';
    if (actionFilter === 'abilities') return act.type === 'ability' || act.type === 'energy';
    if (actionFilter === 'prizes') return act.type === 'prize';
    return true;
  };

  const getActionBadge = (action: BattleTurnAction) => {
    const isEvo = action.description.toLowerCase().includes('evoluiu') || action.description.toLowerCase().includes('evolved');
    if (isEvo) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-amber-500/30 to-yellow-400/20 text-amber-300 border border-amber-400/40 shadow-sm animate-pulse shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" /> Evolução ✨
        </span>
      );
    }

    switch (action.type) {
      case 'attack':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
            <Swords className="w-3 h-3 text-rose-400" /> Ataque {action.damage ? `(${action.damage} DMG)` : ''}
          </span>
        );
      case 'knockout':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
            <ShieldAlert className="w-3 h-3 text-purple-400" /> Nocaute!
          </span>
        );
      case 'prize':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
            <Trophy className="w-3 h-3 text-amber-400" /> +{action.prizesTaken || 1} Prêmio(s)
          </span>
        );
      case 'ability':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Habilidade
          </span>
        );
      case 'energy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shrink-0">
            <Zap className="w-3 h-3 text-yellow-400" /> Energia
          </span>
        );
      case 'draw':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
            <Layers className="w-3 h-3 text-slate-400" /> Compra
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
            Ação
          </span>
        );
    }
  };

  const currentTurnFilteredActions = (currentTurn?.actions || []).filter(filterAction);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-sm flex flex-col">
      {/* Header with Title and Mode Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">Histórico de Ações</span>
              {isMatchFinished && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border border-yellow-200 flex items-center gap-1 shadow-sm">
                  <Trophy className="w-3 h-3 fill-slate-950" /> (Vencedor)
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {historyScope === 'turn' 
                ? `Turno ${currentTurn?.turnNumber === 0 ? 'Setup' : currentTurn?.turnNumber} (${currentTurnFilteredActions.length} ações)`
                : `Partida Inteira (${turns.length} turnos)`}
            </span>
          </div>
        </div>

        {/* Scope Selector: Turn vs Full Match */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
          <button
            onClick={() => setHistoryScope('turn')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              historyScope === 'turn'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Ver ações do turno atual"
          >
            Turno {currentTurn?.turnNumber === 0 ? 'Setup' : `T${currentTurn?.turnNumber}`}
          </button>
          <button
            onClick={() => setHistoryScope('match')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              historyScope === 'match'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Ver histórico de toda a partida"
          >
            Toda Partida
          </button>
        </div>
      </div>

      {/* Filter Category Tabs */}
      <div className="py-3 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'attacks', label: 'Ataques/KOs' },
          { id: 'trainers', label: 'Treinadores' },
          { id: 'abilities', label: 'Habilidades' },
          { id: 'prizes', label: 'Prêmios' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActionFilter(tab.id as any)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
              actionFilter === tab.id
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Action Content Area */}
      <div className="space-y-2.5 max-h-[460px] sm:max-h-[520px] lg:max-h-[640px] xl:max-h-[720px] overflow-y-auto pr-1 scrollbar-thin">
        {historyScope === 'turn' ? (
          /* TURN ACTIONS VIEW */
          currentTurnFilteredActions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 italic">
              Nenhuma ação desta categoria registrada neste turno.
            </div>
          ) : (
            currentTurnFilteredActions.map((action, idx) => {
              const cardNameForPreview = action.cardName || action.description;
              return (
                <div
                  key={action.id || idx}
                  className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-950/70 border border-slate-850 hover:border-slate-700 transition-colors"
                >
                  <div className="shrink-0">
                    <PokemonCard
                      name={cardNameForPreview}
                      size="xs"
                      showInspectButton={true}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getActionBadge(action)}
                      <span className="text-[10px] text-slate-500 font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 break-words font-medium leading-relaxed">
                      {action.description}
                    </div>
                    {action.cardName && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300 truncate max-w-[140px]">{action.cardName}</span>
                        <span className="font-mono text-purple-300 font-bold bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-500/30 text-[9px] shrink-0">
                          {convertLocalIdToPTCGL(action.cardName).canonicalCode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* FULL MATCH ACTIONS VIEW (GROUPED BY TURN) */
          turns.map((turn, tIdx) => {
            const turnActions = (turn.actions || []).filter(filterAction);
            if (turnActions.length === 0 && actionFilter !== 'all') return null;
            const isSelectedTurn = tIdx === currentTurnIdx;

            return (
              <div
                key={tIdx}
                className={`rounded-2xl border transition-all ${
                  isSelectedTurn 
                    ? 'bg-purple-950/20 border-purple-500/60 shadow-lg shadow-purple-950/30' 
                    : 'bg-slate-950/40 border-slate-850 hover:border-slate-750'
                }`}
              >
                {/* Turn Header Button */}
                <button
                  onClick={() => onSelectTurn(tIdx)}
                  className="w-full flex items-center justify-between p-2.5 text-left border-b border-slate-850/60 hover:bg-slate-900/40 rounded-t-2xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                      isSelectedTurn
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-300 border border-slate-800'
                    }`}>
                      {turn.turnNumber === 0 ? 'Setup' : `Turno ${turn.turnNumber}`}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {turn.playerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelectedTurn && (
                      <span className="text-[10px] font-extrabold text-purple-400 bg-purple-950/70 border border-purple-500/40 px-2 py-0.5 rounded-full uppercase">
                        Em exibição
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      {turnActions.length} ações
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isSelectedTurn ? 'rotate-90 text-purple-400' : ''}`} />
                  </div>
                </button>

                {/* Actions in this turn */}
                <div className="p-2 space-y-1.5">
                  {turnActions.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic py-2 px-3">
                      Sem ações com este filtro.
                    </div>
                  ) : (
                    turnActions.map((action, aIdx) => (
                      <div
                        key={action.id || aIdx}
                        onClick={() => onSelectTurn(tIdx)}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900/90 border border-slate-850/60 cursor-pointer transition-colors"
                      >
                        <div className="shrink-0">
                          <PokemonCard
                            name={action.cardName || action.description}
                            size="xs"
                            showInspectButton={false}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {getActionBadge(action)}
                          </div>
                          <div className="text-[11px] text-slate-300 font-medium truncate">
                            {action.description}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Turn Summary Footer */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 truncate">
          <span className={`w-2 h-2 rounded-full shrink-0 ${currentTurn?.player === 'player1' ? 'bg-purple-400' : 'bg-rose-400'}`} />
          <span className="truncate">
            Vez de: <strong className={currentTurn?.player === 'player1' ? 'text-purple-300' : 'text-rose-300'}>{currentTurn?.playerName}</strong>
          </span>
        </span>
        {isMatchFinished ? (
          <span className="text-amber-300 font-extrabold flex items-center gap-1 shrink-0 ml-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>{winnerName} (Vencedor)</span>
          </span>
        ) : (
          <span className="text-slate-500 font-mono shrink-0 ml-2">
            T{currentTurn?.turnNumber} de {turns.length - 1}
          </span>
        )}
      </div>
    </div>
  );
}
