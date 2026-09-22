import React from 'react';
import { TrainerLogMatch } from '../../types';
import PokemonSprite from '../PokemonSprite';
import { 
  Trophy, 
  TrendingUp, 
  Swords, 
  Flame, 
  Sparkles, 
  Layers, 
  Calendar,
  Percent,
  Compass
} from 'lucide-react';

interface TrainerLogStatsProps {
  logs: TrainerLogMatch[];
}

export default function TrainerLogStats({ logs }: TrainerLogStatsProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <Swords className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Nenhum log importado para análise</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Importe seus registros de batalha do Pokémon TCG Live para visualizar estatísticas de winrate, matchups e desempenho indo em 1º ou 2º!
        </p>
      </div>
    );
  }

  // Calculate high-level stats
  const totalGames = logs.length;
  const wins = logs.filter(l => l.result === 'win').length;
  const losses = logs.filter(l => l.result === 'loss').length;
  const draws = logs.filter(l => l.result === 'draw').length;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100) : 0;

  // Going 1st vs Going 2nd stats
  const games1st = logs.filter(l => l.wentFirst);
  const wins1st = games1st.filter(l => l.result === 'win').length;
  const wr1st = games1st.length > 0 ? ((wins1st / games1st.length) * 100) : 0;

  const games2nd = logs.filter(l => !l.wentFirst);
  const wins2nd = games2nd.filter(l => l.result === 'win').length;
  const wr2nd = games2nd.length > 0 ? ((wins2nd / games2nd.length) * 100) : 0;

  // Average turns
  const totalTurnsAll = logs.reduce((acc, l) => acc + (l.totalTurns || 0), 0);
  const avgTurns = totalGames > 0 ? (totalTurnsAll / totalGames).toFixed(1) : '0';

  // Average prizes
  const totalP1Prizes = logs.reduce((acc, l) => acc + (l.p1PrizesTaken || 0), 0);
  const avgPrizes = totalGames > 0 ? (totalP1Prizes / totalGames).toFixed(1) : '0';

  // Matchup stats by opponent archetype
  const matchupMap = new Map<string, { total: number; wins: number; losses: number; draws: number }>();

  logs.forEach(l => {
    const oppArch = l.opponentDeckArchetype || 'Outro';
    const current = matchupMap.get(oppArch) || { total: 0, wins: 0, losses: 0, draws: 0 };
    current.total += 1;
    if (l.result === 'win') current.wins += 1;
    else if (l.result === 'loss') current.losses += 1;
    else current.draws += 1;
    matchupMap.set(oppArch, current);
  });

  const matchups = Array.from(matchupMap.entries()).map(([archetype, stats]) => ({
    archetype,
    total: stats.total,
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
  })).sort((a, b) => b.total - a.total);

  // Player decks tested
  const deckMap = new Map<string, { total: number; wins: number; losses: number }>();
  logs.forEach(l => {
    const deck = l.playerDeckArchetype || 'Personalizado';
    const current = deckMap.get(deck) || { total: 0, wins: 0, losses: 0 };
    current.total += 1;
    if (l.result === 'win') current.wins += 1;
    else current.losses += 1;
    deckMap.set(deck, current);
  });

  const playerDecks = Array.from(deckMap.entries()).map(([deck, stats]) => ({
    deck,
    total: stats.total,
    wins: stats.wins,
    losses: stats.losses,
    winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Win Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Win Rate Geral</span>
            <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {winRate.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">
              ({wins}V - {losses}D{draws > 0 ? ` - ${draws}E` : ''})
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${winRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
              style={{ width: `${Math.min(100, Math.max(5, winRate))}%` }} 
            />
          </div>
        </div>

        {/* Total Battles Analyzed */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Partidas Registradas</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Swords className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">
              {totalGames}
            </span>
            <span className="text-xs text-slate-400">partidas PTCGL</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {games1st.length} indo em 1º • {games2nd.length} indo em 2º
          </div>
        </div>

        {/* Average Turns */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Média de Turnos</span>
            <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-amber-400">
              {avgTurns}
            </span>
            <span className="text-xs text-slate-400">turnos/jogo</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Duração média das batalhas
          </div>
        </div>

        {/* Average Prizes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Média de Prêmios</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400">
              {avgPrizes} / 6
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Média de cartas de prêmio pegas
          </div>
        </div>
      </div>

      {/* Going 1st vs Going 2nd Analysis (Crucial competitive metric) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Compass className="w-5 h-5 text-purple-400" />
          Análise de Iniciativa (Indo em 1º vs Indo em 2º)
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Identifique se seu baralho e seu estilo de jogo têm vantagem ao começar a partida ou ao comprar primeiro.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Going 1st Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs uppercase font-bold text-purple-400 tracking-wider">Iniciativa: 1º a Jogar</span>
                <div className="text-2xl font-extrabold font-mono text-white mt-1">
                  {wr1st.toFixed(1)}% <span className="text-xs text-slate-400 font-sans font-normal">Winrate</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-300">{wins1st} Vitórias</span>
                <div className="text-[11px] text-slate-500">{games1st.length - wins1st} Derrotas ({games1st.length} jogos)</div>
              </div>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, wr1st))}%` }}
              />
            </div>
          </div>

          {/* Going 2nd Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">Iniciativa: 2º a Jogar</span>
                <div className="text-2xl font-extrabold font-mono text-white mt-1">
                  {wr2nd.toFixed(1)}% <span className="text-xs text-slate-400 font-sans font-normal">Winrate</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-300">{wins2nd} Vitórias</span>
                <div className="text-[11px] text-slate-500">{games2nd.length - wins2nd} Derrotas ({games2nd.length} jogos)</div>
              </div>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-teal-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, wr2nd))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Matchup Matrix Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Swords className="w-5 h-5 text-purple-400" />
              Matriz de Matchups (Desempenho por Arquétipo Enfrentado)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Desempenho detalhado contra cada baralho do metagame.
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            {matchups.length} arquétipos enfrentados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3 pl-2">Arquétipo Rival</th>
                <th className="pb-3 text-center">Partidas</th>
                <th className="pb-3 text-center">V - D - E</th>
                <th className="pb-3 text-right pr-4">Taxa de Vitória</th>
                <th className="pb-3 w-36">Tendência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {matchups.map((m, idx) => {
                const isPositive = m.winRate >= 50;
                return (
                  <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2.5">
                        <PokemonSprite name={m.archetype} size="sm" className="w-8 h-8" />
                        <div>
                          <span className="font-bold text-white text-sm block">{m.archetype}</span>
                          <span className="text-[10px] text-slate-500">Metagame PTCGL</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-slate-300">
                      {m.total}
                    </td>
                    <td className="py-3 text-center font-mono font-medium text-slate-400">
                      <span className="text-emerald-400 font-bold">{m.wins}</span> - <span className="text-rose-400 font-bold">{m.losses}</span> - <span>{m.draws}</span>
                    </td>
                    <td className="py-3 text-right pr-4 font-mono font-extrabold text-sm">
                      <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {m.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, Math.max(5, m.winRate))}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decks Tested by Player */}
      {playerDecks.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-purple-400" />
            Seus Baralhos Utilizados nos Logs
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playerDecks.map((d, idx) => (
              <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PokemonSprite name={d.deck} size="sm" className="w-10 h-10" />
                  <div>
                    <div className="font-bold text-white text-sm">{d.deck}</div>
                    <div className="text-[11px] text-slate-400">
                      {d.total} {d.total === 1 ? 'partida' : 'partidas'} ({d.wins}V - {d.losses}D)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono font-extrabold text-sm ${d.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {d.winRate.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Winrate</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClockIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
