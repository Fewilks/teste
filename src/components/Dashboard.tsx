import React, { useEffect, useState } from 'react';
import { db, membersCol, matchesCol, loansCol, tournamentsCol, seedTournamentsIfEmpty } from '../lib/firebase';
import { getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Member, MatchRecord, LoanRecord, Tournament } from '../types';
import PokemonSprite from './PokemonSprite';
import PokemonLoader from './PokemonLoader';
import RecentPerformanceWidget from './RecentPerformanceWidget';
import MonthlyGoalsAndRanking from './MonthlyGoalsAndRanking';
import { getRoleBadge } from '../utils';
import { getArchetypeSprites } from './Matches';
import { 
  Trophy, 
  Swords, 
  ArrowRight, 
  ArrowLeftRight, 
  CheckCircle2, 
  Flame, 
  Sparkles, 
  Calendar, 
  Layers, 
  FileText, 
  Play, 
  TrendingUp, 
  UserCheck, 
  Award, 
  Zap,
  Store,
  MapPin,
  Ticket,
  Crown
} from 'lucide-react';

interface DashboardProps {
  currentMember: Member;
  setActiveTab: (tab: string) => void;
  onStatsHealed?: () => void;
}

export default function Dashboard({ currentMember, setActiveTab, onStatsHealed }: DashboardProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [allMatches, setAllMatches] = useState<MatchRecord[]>([]);
  const [pendingLoans, setPendingLoans] = useState<LoanRecord[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchViewFilter, setMatchViewFilter] = useState<'all' | 'mine'>('mine');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Members & clean test accounts
      const memSnap = await getDocs(membersCol);
      const memList = memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));

      const testNames = [
        "Guilherme Silva",
        "Thiago Pereira",
        "Lucas Souza",
        "Matheus Santos",
        "Felipe Costa",
        "Rafael Bastazini"
      ];
      const testNicknames = [
        "SpiritsBoss",
        "ThunderBolt",
        "DeckBuilder",
        "DrawPass",
        "FireBlast",
        "Shadow"
      ];

      const cleanMemList: Member[] = [];
      for (const member of memList) {
        const isTest = testNames.includes(member.name) || 
                       (member.nickname && testNicknames.includes(member.nickname));
        if (isTest) {
          try {
            await deleteDoc(doc(db, 'members', member.id));
          } catch (e) {
            console.error(`Failed to auto-delete test member ${member.name}:`, e);
          }
        } else {
          cleanMemList.push(member);
        }
      }

      // 2. Fetch All Matches
      const allMatchesSnap = await getDocs(matchesCol);
      const matchesList = allMatchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as MatchRecord));
      
      // Sort all matches by playedAt descending
      const sortedMatches = [...matchesList].sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
      setAllMatches(sortedMatches);

      // Recalculate member winrates dynamically based on matches
      const computedMembers = cleanMemList.map(member => {
        let wins = 0;
        let losses = 0;
        let draws = 0;

        sortedMatches.forEach(match => {
          if (match.player1Id === member.id) {
            if (match.result === 'win') wins++;
            else if (match.result === 'loss') losses++;
            else if (match.result === 'draw') draws++;
          } else if (match.player2IsMember && match.player2Id === member.id) {
            const p2Result = match.result === 'win' ? 'loss' : match.result === 'loss' ? 'win' : 'draw';
            if (p2Result === 'win') wins++;
            else if (p2Result === 'loss') losses++;
            else if (p2Result === 'draw') draws++;
          }
        });

        return {
          ...member,
          wins,
          losses,
          draws
        };
      });

      computedMembers.sort((a, b) => b.wins - a.wins);
      setMembers(computedMembers);

      // 3. Fetch Loans
      const loanSnap = await getDocs(loansCol);
      const loanList = loanSnap.docs.map(d => ({ id: d.id, ...d.data() } as LoanRecord));
      const relevantLoans = loanList.filter(l => 
        (l.ownerId === currentMember.id || l.borrowerId === currentMember.id) && l.status === 'pending'
      );
      setPendingLoans(relevantLoans);

      // 4. Fetch upcoming tournaments
      try {
        await seedTournamentsIfEmpty();
        const tournsSnap = await getDocs(tournamentsCol);
        const tournsList = tournsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
        tournsList.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setUpcomingTournaments(tournsList);
      } catch (tErr) {
        console.error('Error fetching tournaments in dashboard:', tErr);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMember]);

  const handleApproveLoan = async (loanId: string) => {
    try {
      const loanRef = doc(db, 'loans', loanId);
      await updateDoc(loanRef, {
        status: 'active',
        loanedAt: new Date().toISOString()
      });
      setPendingLoans(prev => prev.filter(l => l.id !== loanId));
    } catch (err) {
      console.error('Error approving loan:', err);
    }
  };

  const handleDeclineLoan = async (loanId: string) => {
    try {
      const loanRef = doc(db, 'loans', loanId);
      await updateDoc(loanRef, {
        status: 'declined'
      });
      setPendingLoans(prev => prev.filter(l => l.id !== loanId));
    } catch (err) {
      console.error('Error declining loan:', err);
    }
  };

  // --- STATS COMPUTATION FOR CURRENT MEMBER ---
  const myMatches = allMatches.filter(m => 
    m.player1Id === currentMember.id || (m.player2IsMember && m.player2Id === currentMember.id)
  );

  let myWins = 0;
  let myLosses = 0;
  let myDraws = 0;
  const myDecksStats: Record<string, { played: number; wins: number; archetype: string }> = {};

  myMatches.forEach(match => {
    const isP1 = match.player1Id === currentMember.id;
    let won = false;
    let lost = false;
    let drew = false;

    if (isP1) {
      if (match.result === 'win') won = true;
      else if (match.result === 'loss') lost = true;
      else drew = true;
    } else {
      if (match.result === 'loss') won = true;
      else if (match.result === 'win') lost = true;
      else drew = true;
    }

    if (won) myWins++;
    else if (lost) myLosses++;
    else myDraws++;

    // Track deck stats
    const deckKey = isP1 ? (match.deckArchetype || match.deckName || 'Deck Pessoal') : (match.opponentDeck || 'Deck Pessoal');
    if (!myDecksStats[deckKey]) {
      myDecksStats[deckKey] = { played: 0, wins: 0, archetype: deckKey };
    }
    myDecksStats[deckKey].played++;
    if (won) myDecksStats[deckKey].wins++;
  });

  const myTotalGames = myWins + myLosses + myDraws;
  const myWinRate = myTotalGames > 0 ? ((myWins / myTotalGames) * 100).toFixed(1) : '0.0';

  // Best Deck
  const bestDeckEntry = Object.values(myDecksStats).sort((a, b) => b.wins - a.wins || b.played - a.played)[0];

  // Recent Form (last 5 games)
  const myRecentGames = myMatches.slice(0, 5);
  const myRecentWins = myRecentGames.filter(m => {
    if (m.player1Id === currentMember.id) return m.result === 'win';
    return m.result === 'loss';
  }).length;

  // Global Team Stats
  const totalTeamWins = members.reduce((sum, m) => sum + m.wins, 0);
  const totalTeamMatches = members.reduce((sum, m) => sum + m.wins + m.losses + m.draws, 0);
  const teamWinRate = totalTeamMatches > 0 ? ((totalTeamWins / totalTeamMatches) * 100).toFixed(1) : '0.0';

  // Matches to display based on filter
  const displayedMatches = matchViewFilter === 'mine' ? myMatches.slice(0, 6) : allMatches.slice(0, 6);

  if (loading) {
    return (
      <PokemonLoader 
        pokemon={currentMember.avatarSprite || 'gengar'} 
        title="Carregando estatísticas da Spirits Arena..." 
        subtitle="Calculando winrate pessoal e sincronizando histórico..." 
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="dashboard-root">
      
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/50 to-purple-950/40 p-6 md:p-8 border border-purple-500/20 shadow-xl shadow-purple-950/20 backdrop-blur-md" id="hero-banner">
        <div className="absolute right-0 top-0 -mr-6 -mt-6 w-56 h-56 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold tracking-wider text-xs uppercase font-mono">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              Painel do Treinador • Spirits TCG
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">{currentMember.nickname || currentMember.name}</span>!
            </h1>
            <p className="text-slate-350 max-w-xl text-xs sm:text-sm leading-relaxed font-sans">
              Acompanhe seu desempenho individual em tempo real, registre partidas competitivas e analise jogadas turno a turno com o TrainerLog.
            </p>
            
            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2 flex-wrap">
              <button
                id="btn-quick-record-match"
                onClick={() => setActiveTab('partidas')}
                className="px-4 py-2 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-950/30 cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Registrar Partida</span>
              </button>
              
              <button
                id="btn-quick-trainerlog"
                onClick={() => setActiveTab('trainerlog')}
                className="px-4 py-2 bg-slate-900/80 hover:bg-slate-850 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-400/50 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Abrir TrainerLog Replay</span>
              </button>

              <button
                id="btn-quick-tournaments"
                onClick={() => setActiveTab('campeonatos')}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-950/30 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>Campeonatos & Vagas ({upcomingTournaments.length})</span>
              </button>

              <button
                id="btn-quick-goals-ranking"
                onClick={() => {
                  const el = document.getElementById('monthly-goals-ranking-root');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-amber-950/30 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-current text-slate-950" />
                <span>Metas & Ranking CP</span>
              </button>
            </div>
          </div>
          
          {/* Active Trainer Card Pill */}
          <div className="flex items-center gap-4 bg-slate-950/70 border border-purple-500/30 p-4.5 rounded-2xl backdrop-blur-md self-start md:self-auto shadow-inner">
            <div className="w-16 h-16 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
              <PokemonSprite name={currentMember.avatarSprite} size="lg" />
            </div>
            <div>
              <div className="mb-1">{getRoleBadge(currentMember.role)}</div>
              <div className="text-white font-black text-sm truncate max-w-[160px]">{currentMember.name}</div>
              <div className="text-xs text-purple-300 font-mono mt-0.5 font-bold">
                {myWins}W - {myLosses}L {myDraws > 0 ? `(${myDraws}D)` : ''}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Winrate: <strong className="text-emerald-400">{myWinRate}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Widget: Campeonatos Chegando nas Cidades Próximas */}
      {upcomingTournaments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-purple-950/40 border border-amber-500/30 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  🚨 Próximo Campeonato Chegando!
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {upcomingTournaments.length} eventos cadastrados
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                {upcomingTournaments[0].name}
              </h4>
              <p className="text-xs text-slate-350 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-amber-400" />
                  {upcomingTournaments[0].storeName} ({upcomingTournaments[0].city})
                </span>
                <span className="text-purple-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  {upcomingTournaments[0].date} às {upcomingTournaments[0].time || '14:00'}
                </span>
                {upcomingTournaments[0].reservationNotes && (
                  <span className="text-amber-200/90">
                    • {upcomingTournaments[0].reservationNotes}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {upcomingTournaments[0].registrationUrl && (
              <a
                href={upcomingTournaments[0].registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Fazer Reserva</span>
              </a>
            )}
            <button
              onClick={() => setActiveTab('campeonatos')}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-950/40 cursor-pointer flex items-center gap-1.5"
            >
              <span>Ver Todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Personal Performance Bento Grid (Foco nos seus dados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="personal-stats-grid">
        
        {/* Card 1: Meu Win Rate */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(147,51,234,0.08)] transition-all duration-300 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Meu Win Rate</span>
            <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center border border-yellow-500/20">
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{myWinRate}%</span>
              <span className="text-xs font-bold text-slate-400 font-mono">({myWins}V / {myTotalGames}J)</span>
            </div>
            {/* Visual Winrate bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden flex border border-slate-800/80">
              <div 
                className="bg-emerald-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, Number(myWinRate)))}%` }} 
                title={`Vitórias: ${myWins}`}
              />
              <div 
                className="bg-rose-500 transition-all duration-500" 
                style={{ width: `${myTotalGames > 0 ? (myLosses / myTotalGames) * 100 : 0}%` }} 
                title={`Derrotas: ${myLosses}`}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono flex justify-between">
              <span>{myWins}W • {myLosses}L • {myDraws}D</span>
              <span className="text-purple-300 font-bold">{myTotalGames} partidas</span>
            </p>
          </div>
        </div>

        {/* Card 2: Melhor Deck do Jogador */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(147,51,234,0.08)] transition-all duration-300 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Deck Principal</span>
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3">
            {bestDeckEntry ? (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center shrink-0">
                  <PokemonSprite name={bestDeckEntry.archetype} size="sm" className="scale-125" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-extrabold text-sm truncate">{bestDeckEntry.archetype}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-bold">
                    {bestDeckEntry.wins} vitórias ({((bestDeckEntry.wins / bestDeckEntry.played) * 100).toFixed(0)}% WR)
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{bestDeckEntry.played} partidas jogadas</div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-xs text-slate-500 font-mono">
                Nenhum deck registrado ainda. Registre sua primeira partida!
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Recent Performance Summary Widget */}
        <RecentPerformanceWidget
          currentMember={currentMember}
          matches={allMatches}
          onOpenMatches={() => setActiveTab('partidas')}
        />

        {/* Card 4: Desempenho do Time Spirits */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(147,51,234,0.08)] transition-all duration-300 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Spirits Team WR</span>
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
              <Award className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white tracking-tight">{teamWinRate}%</div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              {totalTeamWins} vitórias de {totalTeamMatches} jogos • {members.length} mestres
            </p>
          </div>
        </div>

      </div>

      {/* 3. Metas Mensais & Ranking de Pontos Oficiais de Campeonatos (CP) */}
      <MonthlyGoalsAndRanking
        currentMember={currentMember}
        allMatches={allMatches}
        upcomingTournaments={upcomingTournaments}
        onRefreshData={fetchData}
        setActiveTab={setActiveTab}
      />

      {/* 4. Pending Loans Alert (se houver) */}
      {pendingLoans.length > 0 && (
        <div className="bg-slate-900/50 border border-amber-500/30 rounded-2xl p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></span>
              <ArrowLeftRight className="w-4 h-4" />
              <h2>Aprovação de Empréstimos Pendentes ({pendingLoans.length})</h2>
            </div>
            <button
              onClick={() => setActiveTab('emprestimos')}
              className="text-xs text-amber-300 hover:text-amber-200 font-mono flex items-center gap-1 cursor-pointer"
            >
              Ver Central de Empréstimos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="divide-y divide-slate-800/60">
            {pendingLoans.map(loan => {
              const isOwner = loan.ownerId === currentMember.id;
              return (
                <div key={loan.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={loan.cardImageUrl} alt={loan.cardName} className="w-10 h-14 object-contain rounded border border-slate-800" />
                    <div>
                      <div className="text-white font-extrabold text-sm">{loan.cardName} <span className="text-purple-400 font-mono text-xs">(x{loan.quantity})</span></div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {isOwner ? (
                          <span>Solicitado por: <strong className="text-purple-300 font-semibold">{loan.borrowerName}</strong></span>
                        ) : (
                          <span>Você solicitou de: <strong className="text-purple-300 font-semibold">{loan.ownerName}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isOwner ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        id={`approve-btn-${loan.id}`}
                        onClick={() => handleApproveLoan(loan.id)}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md shadow-purple-950/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button 
                        id={`decline-btn-${loan.id}`}
                        onClick={() => handleDeclineLoan(loan.id)}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-colors border border-slate-700/50"
                      >
                        Recusar
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] bg-slate-950/80 text-amber-400 px-2.5 py-1 rounded border border-amber-500/20 font-mono font-bold uppercase tracking-wider">
                      Aguardando Aprovação
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TRAINERLOG & REPLAY SPOTLIGHT (Substitui o metagame com dados reais de logs e replay) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-indigo-950/30 border border-purple-500/30 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-lg">
              <PokemonSprite name="mew" size="md" className="scale-110" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-purple-400 uppercase bg-purple-950/50 px-2 py-0.5 rounded border border-purple-500/20">
                  PTCGL Log Replay Engine
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Macro Ações & Turnos Detalhados
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-black text-white mt-1">
                TrainerLog: Análise e Replay Tático de Batalhas
              </h3>
              <p className="text-xs text-slate-350 max-w-2xl mt-1 leading-relaxed">
                Cole o log exportado diretamente do Pokémon TCG Live para visualizar as macro-ações de cada turno, cartas jogadas com artes oficiais, prêmios tomados e contadores de dano em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              id="dashboard-open-trainerlog"
              onClick={() => setActiveTab('trainerlog')}
              className="w-full lg:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-950/40 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Abrir TrainerLog & Replay</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Registros de Batalha (Distribuição limpa e focada nas partidas) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        
        {/* Section Header with View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-850">
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-extrabold text-white">Histórico Recente de Confrontos</h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Filter Toggle */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs">
              <button
                id="filter-matches-mine"
                onClick={() => setMatchViewFilter('mine')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  matchViewFilter === 'mine'
                    ? 'bg-purple-650 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Minhas Partidas ({myMatches.length})
              </button>
              <button
                id="filter-matches-all"
                onClick={() => setMatchViewFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  matchViewFilter === 'all'
                    ? 'bg-purple-650 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Time Completo ({allMatches.length})
              </button>
            </div>

            <button 
              id="view-all-matches-link"
              onClick={() => setActiveTab('partidas')}
              className="text-purple-400 hover:text-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Matches List */}
        <div className="space-y-3">
          {displayedMatches.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30">
              <PokemonSprite name="substitute" size="md" className="mx-auto mb-2 opacity-60" />
              <p className="text-white font-bold text-sm">Nenhum confronto registrado nesta visualização</p>
              <p className="text-slate-500 text-xs mt-1 font-mono">Registre partidas em torneios ou treinos para acompanhar seu progresso.</p>
              <button
                onClick={() => setActiveTab('partidas')}
                className="mt-4 px-4 py-2 bg-purple-650 hover:bg-purple-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cadastrar Partida Agora
              </button>
            </div>
          ) : (
            displayedMatches.map(match => {
              const isP1 = match.player1Id === currentMember.id;
              const isP2 = match.player2IsMember && match.player2Id === currentMember.id;
              const isMyMatch = isP1 || isP2;
              
              let effectiveResult = match.result;
              if (isP2) {
                effectiveResult = match.result === 'win' ? 'loss' : match.result === 'loss' ? 'win' : 'draw';
              }

              return (
                <div 
                  key={match.id} 
                  className={`bg-slate-950/50 border rounded-xl p-4 transition-all hover:bg-slate-950/80 ${
                    isMyMatch 
                      ? 'border-purple-500/20 hover:border-purple-500/40 shadow-sm' 
                      : 'border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    {/* Players & Decks info */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      
                      {/* P1 Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        <PokemonSprite name={match.player1Sprite || 'pikachu'} size="sm" />
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Player 1 & Deck */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-black text-sm truncate ${match.player1Id === currentMember.id ? 'text-purple-300 font-extrabold' : 'text-white'}`}>
                            {match.player1Name}
                          </span>
                          <span className="text-[10px] text-purple-400 font-mono bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-500/20">
                            {match.deckArchetype}
                          </span>
                          {/* Archetype Sprites */}
                          <div className="flex -space-x-1.5 items-center">
                            {getArchetypeSprites(match.deckArchetype).map((spriteName, idx) => (
                              <div key={idx} className="w-5.5 h-5.5 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shadow">
                                <PokemonSprite name={spriteName} size="sm" className="scale-110" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* VS Opponent */}
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">vs</span>
                          <span className={`font-semibold ${match.player2Id === currentMember.id ? 'text-purple-300' : 'text-slate-200'}`}>
                            {match.player2Name}
                          </span>
                          <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded font-mono text-slate-400 border border-slate-850">
                            {match.opponentDeck}
                          </span>
                          <div className="flex -space-x-1.5 items-center">
                            {getArchetypeSprites(match.opponentDeck).map((spriteName, idx) => (
                              <div key={idx} className="w-5.5 h-5.5 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shadow">
                                <PokemonSprite name={spriteName} size="sm" className="scale-110" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Result & Score */}
                    <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-slate-850 pt-2 md:pt-0 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider font-mono border ${
                          effectiveResult === 'win' 
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
                            : effectiveResult === 'loss' 
                            ? 'bg-rose-950/60 text-rose-400 border-rose-500/30' 
                            : 'bg-slate-850 text-slate-400 border-slate-800'
                        }`}>
                          {effectiveResult === 'win' ? 'Vitória' : effectiveResult === 'loss' ? 'Derrota' : 'Empate'}
                        </span>
                        <span className="text-white font-mono font-black text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {match.score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850">
                          {match.format || 'MD3'}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(match.playedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                  </div>

                  {match.notes && (
                    <div className="mt-2.5 text-xs text-slate-400 bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg italic">
                      "{match.notes}"
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 6. Atalhos Rápidos da Arena */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button 
          id="shortcut-matches"
          onClick={() => setActiveTab('partidas')}
          className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl text-left transition-all cursor-pointer group hover:shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform">
            <Swords className="w-4.5 h-4.5" />
          </div>
          <div className="text-xs font-black text-white">Partidas & Winrate</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Histórico completo e registro oficial</div>
        </button>

        <button 
          id="shortcut-trainerlog"
          onClick={() => setActiveTab('trainerlog')}
          className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl text-left transition-all cursor-pointer group hover:shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div className="text-xs font-black text-white">TrainerLog Replay</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Importe logs do PTCGL e veja turnos</div>
        </button>

        <button 
          id="shortcut-collection"
          onClick={() => setActiveTab('colecao')}
          className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl text-left transition-all cursor-pointer group hover:shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div className="text-xs font-black text-white">Minha Coleção</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Gerencie cartas físicas e empréstimos</div>
        </button>

        <button 
          id="shortcut-team"
          onClick={() => setActiveTab('time')}
          className="p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl text-left transition-all cursor-pointer group hover:shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
            <UserCheck className="w-4.5 h-4.5" />
          </div>
          <div className="text-xs font-black text-white">Time Spirits</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ranking interno e mestres cadastrados</div>
        </button>
      </div>

    </div>
  );
}
