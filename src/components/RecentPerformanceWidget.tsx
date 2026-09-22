import React, { useState, useMemo } from 'react';
import { MatchRecord, Member } from '../types';
import { TrendingUp, TrendingDown, Flame, Swords, Minus } from 'lucide-react';
import PokemonSprite from './PokemonSprite';

interface RecentPerformanceWidgetProps {
  currentMember: Member;
  matches: MatchRecord[];
  allTeamMatches?: MatchRecord[];
  onOpenMatches?: () => void;
  className?: string;
}

export default function RecentPerformanceWidget({
  currentMember,
  matches,
  onOpenMatches,
  className = ''
}: RecentPerformanceWidgetProps) {
  // Window selection: last 5 or last 10 games
  const [windowSize, setWindowSize] = useState<5 | 10>(5);

  // Compute player's matches ordered chronologically (most recent first)
  const myMatches = useMemo(() => {
    return matches.filter(m => 
      m.player1Id === currentMember.id || (m.player2IsMember && m.player2Id === currentMember.id)
    );
  }, [matches, currentMember.id]);

  // Overall stats for comparison
  const overallStats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    myMatches.forEach(m => {
      const isP1 = m.player1Id === currentMember.id;
      const won = isP1 ? m.result === 'win' : m.result === 'loss';
      const lost = isP1 ? m.result === 'loss' : m.result === 'win';
      if (won) wins++;
      else if (lost) losses++;
      else draws++;
    });
    const total = wins + losses + draws;
    const wr = total > 0 ? (wins / total) * 100 : 0;
    return { wins, losses, draws, total, wr };
  }, [myMatches, currentMember.id]);

  // Recent matches slice based on chosen window
  const recentSlice = useMemo(() => {
    return myMatches.slice(0, windowSize);
  }, [myMatches, windowSize]);

  // Calculations for recent window
  const recentStats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;

    const formattedMatches = recentSlice.map(m => {
      const isP1 = m.player1Id === currentMember.id;
      const won = isP1 ? m.result === 'win' : m.result === 'loss';
      const lost = isP1 ? m.result === 'loss' : m.result === 'win';
      const drew = m.result === 'draw';

      if (won) wins++;
      else if (lost) losses++;
      else draws++;

      const opponentName = isP1 ? m.player2Name : m.player1Name;
      const myDeck = isP1 ? (m.deckArchetype || m.deckName) : (m.opponentDeck);
      const outcome = won ? 'win' : lost ? 'loss' : 'draw';

      return {
        id: m.id,
        outcome,
        opponentName,
        myDeck,
        score: m.score,
        playedAt: m.playedAt
      };
    });

    const total = wins + losses + draws;
    const winrate = total > 0 ? ((wins / total) * 100) : 0;
    const diffFromOverall = total > 0 && overallStats.total > 0 ? (winrate - overallStats.wr) : 0;

    // Current Streak calculation
    let streakCount = 0;
    let streakType: 'win' | 'loss' | 'draw' | null = null;
    for (const m of myMatches) {
      const isP1 = m.player1Id === currentMember.id;
      const outcome = isP1 
        ? (m.result === 'win' ? 'win' : m.result === 'loss' ? 'loss' : 'draw')
        : (m.result === 'loss' ? 'win' : m.result === 'win' ? 'loss' : 'draw');
      
      if (streakType === null) {
        streakType = outcome;
        streakCount = 1;
      } else if (streakType === outcome) {
        streakCount++;
      } else {
        break;
      }
    }

    return {
      wins,
      losses,
      draws,
      total,
      winrate: winrate.toFixed(1),
      winrateNum: winrate,
      diffFromOverall: diffFromOverall.toFixed(1),
      diffFromOverallNum: diffFromOverall,
      streakCount,
      streakType,
      formattedMatches
    };
  }, [recentSlice, myMatches, currentMember.id, overallStats]);

  // Color theme based on recent winrate
  const wrNumber = recentStats.winrateNum;
  const isHighWR = wrNumber >= 60;
  const isMidWR = wrNumber >= 45 && wrNumber < 60;

  return (
    <div 
      id="recent-performance-widget"
      className={`bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 p-5 rounded-2xl transition-all duration-300 backdrop-blur-md flex flex-col justify-between shadow-sm relative overflow-hidden ${className}`}
    >
      {/* Subtle background glow */}
      <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header: Title & Window selector */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Desempenho Recente
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Winrate nas últimas partidas
              </p>
            </div>
          </div>

          {/* Window size buttons */}
          <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-850 flex text-[10px] font-mono">
            <button
              id="btn-window-5"
              type="button"
              onClick={() => setWindowSize(5)}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                windowSize === 5 
                  ? 'bg-purple-650 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              5J
            </button>
            <button
              id="btn-window-10"
              type="button"
              onClick={() => setWindowSize(10)}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                windowSize === 10 
                  ? 'bg-purple-650 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              10J
            </button>
          </div>
        </div>

        {/* Main Winrate Display */}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black tracking-tight ${
                recentStats.total === 0 
                  ? 'text-slate-500' 
                  : isHighWR 
                  ? 'text-emerald-400' 
                  : isMidWR 
                  ? 'text-yellow-400' 
                  : 'text-rose-400'
              }`}>
                {recentStats.total > 0 ? `${recentStats.winrate}%` : '--'}
              </span>
              <span className="text-[11px] font-bold text-slate-400 font-mono">
                {recentStats.total > 0 ? `(${recentStats.wins}V - ${recentStats.losses}D)` : '(0 jogos)'}
              </span>
            </div>

            {/* Difference vs Career Winrate */}
            {recentStats.total > 0 && overallStats.total > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono font-bold">
                {recentStats.diffFromOverallNum > 0 ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +{recentStats.diffFromOverall}% vs carreira
                  </span>
                ) : recentStats.diffFromOverallNum < 0 ? (
                  <span className="text-rose-400 flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" />
                    {recentStats.diffFromOverall}% vs carreira
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-0.5">
                    <Minus className="w-3 h-3" />
                    0.0% na média da carreira
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Current Streak badge */}
          {recentStats.streakType && recentStats.streakCount > 0 && (
            <div className={`px-2 py-1 rounded-lg border text-[10px] font-black font-mono flex items-center gap-1 shrink-0 ${
              recentStats.streakType === 'win'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : recentStats.streakType === 'loss'
                ? 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              {recentStats.streakType === 'win' && <Flame className="w-3 h-3 text-orange-400 animate-pulse" />}
              <span>
                {recentStats.streakCount}{recentStats.streakType === 'win' ? 'V Seguidas' : recentStats.streakType === 'loss' ? 'D Seguidas' : ' Empate'}
              </span>
            </div>
          )}
        </div>

        {/* Visual Progress Bar (Proportion of Wins / Losses) */}
        <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden flex border border-slate-850">
          {recentStats.total > 0 ? (
            <>
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${(recentStats.wins / recentStats.total) * 100}%` }}
                title={`Vitórias: ${recentStats.wins}`}
              />
              <div
                className="bg-slate-600 transition-all duration-500"
                style={{ width: `${(recentStats.draws / recentStats.total) * 100}%` }}
                title={`Empates: ${recentStats.draws}`}
              />
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${(recentStats.losses / recentStats.total) * 100}%` }}
                title={`Derrotas: ${recentStats.losses}`}
              />
            </>
          ) : (
            <div className="w-full bg-slate-850" />
          )}
        </div>
      </div>

      {/* Match Sequence Badges (Visual pills with tooltips) */}
      <div className="mt-4 pt-3 border-t border-slate-850/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">
            Últimos {recentStats.formattedMatches.length} jogos:
          </span>
          {onOpenMatches && (
            <button
              type="button"
              onClick={onOpenMatches}
              className="text-[10px] text-purple-400 hover:text-purple-300 font-mono font-bold cursor-pointer"
            >
              Ver todos →
            </button>
          )}
        </div>

        {recentStats.formattedMatches.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentStats.formattedMatches.map((m, idx) => (
              <div
                key={m.id || idx}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black font-mono border transition-transform hover:scale-110 cursor-help ${
                  m.outcome === 'win'
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
                    : m.outcome === 'loss'
                    ? 'bg-rose-950/70 text-rose-400 border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={`${m.outcome === 'win' ? 'Vitória' : m.outcome === 'loss' ? 'Derrota' : 'Empate'} (${m.score}) vs ${m.opponentName} • Deck: ${m.myDeck}`}
              >
                {m.outcome === 'win' ? 'V' : m.outcome === 'loss' ? 'D' : 'E'}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1 text-slate-500 text-[11px] font-mono">
            <PokemonSprite name="substitute" size="xs" />
            <span>Nenhuma partida registrada ainda</span>
          </div>
        )}
      </div>
    </div>
  );
}
