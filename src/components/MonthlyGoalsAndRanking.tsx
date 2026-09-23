import React, { useState, useEffect } from 'react';
import { 
  Member, 
  MatchRecord, 
  Tournament, 
  ChampionshipPointRecord, 
  MonthlyGoals 
} from '../types';
import { 
  db, 
  championshipPointsCol, 
  monthlyGoalsCol, 
  membersCol, 
  addChampionshipPoints, 
  deleteChampionshipPointRecord, 
  saveMonthlyGoals, 
  ensureInitialChampionshipData 
} from '../lib/firebase';
import { getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import PokemonSprite from './PokemonSprite';
import { getRoleBadge } from '../utils';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Award, 
  Calendar, 
  Swords, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Star, 
  Shield, 
  X,
  ExternalLink,
  Crown,
  Medal,
  Zap,
  Layers,
  MapPin,
  AlertCircle
} from 'lucide-react';

interface MonthlyGoalsAndRankingProps {
  currentMember: Member;
  allMatches: MatchRecord[];
  upcomingTournaments: Tournament[];
  onRefreshData?: () => void;
  setActiveTab?: (tab: string) => void;
}

// Presets oficiais de Championship Points do Play! Pokémon
const CP_PRESETS: Record<string, Record<string, number>> = {
  'Copa de Liga': {
    '1º Lugar (Campeão)': 50,
    '2º Lugar (Vice)': 40,
    'Top 4': 32,
    'Top 8': 25,
    'Top 16': 20
  },
  'Desafio de Liga': {
    '1º Lugar (Campeão)': 15,
    '2º Lugar (Vice)': 12,
    'Top 4': 10,
    'Top 8': 8
  },
  'Regional': {
    '1º Lugar (Campeão)': 200,
    '2º Lugar (Vice)': 160,
    'Top 4': 130,
    'Top 8': 100,
    'Top 16': 80,
    'Top 32': 60,
    'Top 64': 40
  },
  'Special Event': {
    '1º Lugar (Campeão)': 200,
    '2º Lugar (Vice)': 160,
    'Top 4': 130,
    'Top 8': 100,
    'Top 16': 80
  },
  'Internacional': {
    '1º Lugar (Campeão)': 500,
    '2º Lugar (Vice)': 400,
    'Top 4': 320,
    'Top 8': 250,
    'Top 16': 200,
    'Top 32': 160
  }
};

export default function MonthlyGoalsAndRanking({
  currentMember,
  allMatches,
  upcomingTournaments,
  onRefreshData,
  setActiveTab
}: MonthlyGoalsAndRankingProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [cpRecords, setCpRecords] = useState<ChampionshipPointRecord[]>([]);
  const [goals, setGoals] = useState<MonthlyGoals>({
    id: 'current-goals',
    monthYear: '2026-09',
    targetTournaments: 6,
    targetMatches: 30,
    targetWinRate: 60,
    targetOfficialPoints: 100,
    notes: 'Meta da equipe Spirits: disputar Copas e Desafios de Liga para acumular CP e garantir vagas oficiais nos grandes torneios!'
  });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddCpModal, setShowAddCpModal] = useState(false);
  const [showEditGoalsModal, setShowEditGoalsModal] = useState(false);
  const [selectedMemberForHistory, setSelectedMemberForHistory] = useState<Member | null>(null);

  // Add CP Form state
  const [formMemberId, setFormMemberId] = useState(currentMember.id || '');
  const [formTournamentName, setFormTournamentName] = useState('');
  const [formTournamentTier, setFormTournamentTier] = useState('Copa de Liga');
  const [formPlacement, setFormPlacement] = useState('1º Lugar (Campeão)');
  const [formPoints, setFormPoints] = useState<number>(50);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLocation, setFormLocation] = useState('');
  const [formDeckArchetype, setFormDeckArchetype] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submittingCp, setSubmittingCp] = useState(false);

  // Edit Goals Form state
  const [editTargetTournaments, setEditTargetTournaments] = useState(goals.targetTournaments);
  const [editTargetMatches, setEditTargetMatches] = useState(goals.targetMatches);
  const [editTargetWinRate, setEditTargetWinRate] = useState(goals.targetWinRate);
  const [editTargetOfficialPoints, setEditTargetOfficialPoints] = useState(goals.targetOfficialPoints);
  const [editNotes, setEditNotes] = useState(goals.notes || '');
  const [savingGoals, setSavingGoals] = useState(false);

  // Auto-update default points when tier or placement changes in form
  const handleTierOrPlacementChange = (tier: string, placement: string) => {
    setFormTournamentTier(tier);
    setFormPlacement(placement);
    if (CP_PRESETS[tier] && CP_PRESETS[tier][placement] !== undefined) {
      setFormPoints(CP_PRESETS[tier][placement]);
    }
  };

  // Fetch / Sync data
  useEffect(() => {
    let unsubscribeCp: (() => void) | undefined;

    async function init() {
      try {
        setLoading(true);
        await ensureInitialChampionshipData();

        // 1. Fetch members
        const memSnap = await getDocs(membersCol);
        const memList = memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
        setMembers(memList);

        if (!formMemberId && memList.length > 0) {
          setFormMemberId(currentMember.id || memList[0].id);
        }

        // 2. Fetch monthly goals
        const goalsSnap = await getDocs(monthlyGoalsCol);
        if (!goalsSnap.empty) {
          const loadedGoals = { id: goalsSnap.docs[0].id, ...goalsSnap.docs[0].data() } as MonthlyGoals;
          setGoals(loadedGoals);
          setEditTargetTournaments(loadedGoals.targetTournaments || 6);
          setEditTargetMatches(loadedGoals.targetMatches || 30);
          setEditTargetWinRate(loadedGoals.targetWinRate || 60);
          setEditTargetOfficialPoints(loadedGoals.targetOfficialPoints || 100);
          setEditNotes(loadedGoals.notes || '');
        }

        // 3. Realtime listener for CP records
        unsubscribeCp = onSnapshot(championshipPointsCol, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChampionshipPointRecord));
          // Sort descending by date / createdAt
          list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
          setCpRecords(list);
        });

      } catch (err) {
        console.error('Error initializing Championship & Goals data:', err);
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      if (unsubscribeCp) unsubscribeCp();
    };
  }, [currentMember]);

  // Compute total CP by member
  const membersWithCp = members.map(m => {
    const memberRecords = cpRecords.filter(r => r.memberId === m.id);
    const totalPointsFromRecords = memberRecords.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
    // Use the max of member.officialPoints and computed from records
    const finalOfficialPoints = Math.max(m.officialPoints || 0, totalPointsFromRecords);
    return {
      ...m,
      officialPoints: finalOfficialPoints,
      recordsCount: memberRecords.length,
      lastRecord: memberRecords[0] || null
    };
  });

  // Sort leaderboard by official Championship Points descending, then by wins
  membersWithCp.sort((a, b) => (b.officialPoints || 0) - (a.officialPoints || 0) || b.wins - a.wins);

  // Compute Monthly Realized Metrics (based on current month e.g. 2026-09)
  const currentMonthPrefix = goals.monthYear || '2026-09';
  
  // Matches played this month
  const matchesThisMonth = allMatches.filter(m => (m.playedAt || '').startsWith(currentMonthPrefix));
  const totalMatchesCount = matchesThisMonth.length;
  const winsThisMonth = matchesThisMonth.filter(m => m.result === 'win').length;
  const currentWinRate = totalMatchesCount > 0 ? ((winsThisMonth / totalMatchesCount) * 100).toFixed(1) : '0.0';

  // Tournaments played this month (unique tournamentIds from matches OR cp records in this month)
  const tournamentIdsThisMonth = new Set<string>();
  matchesThisMonth.forEach(m => {
    if (m.tournamentId) tournamentIdsThisMonth.add(m.tournamentId);
    else if (m.tournamentName) tournamentIdsThisMonth.add(m.tournamentName);
  });
  cpRecords.filter(r => (r.date || '').startsWith(currentMonthPrefix)).forEach(r => {
    tournamentIdsThisMonth.add(r.tournamentName);
  });
  const totalTournamentsCount = tournamentIdsThisMonth.size;

  // Total Official Points earned this month
  const monthlyCpRecords = cpRecords.filter(r => (r.date || '').startsWith(currentMonthPrefix));
  const totalOfficialPointsThisMonth = monthlyCpRecords.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

  // Handlers
  const handleSaveCp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTournamentName.trim()) {
      alert('Informe o nome do torneio oficial!');
      return;
    }
    if (formPoints <= 0) {
      alert('Informe uma pontuação válida maior que zero!');
      return;
    }

    try {
      setSubmittingCp(true);
      const selectedMem = members.find(m => m.id === formMemberId) || currentMember;

      await addChampionshipPoints({
        memberId: selectedMem.id,
        memberName: selectedMem.name,
        avatarSprite: selectedMem.avatarSprite,
        tournamentName: formTournamentName.trim(),
        tournamentTier: formTournamentTier,
        placement: formPlacement,
        points: Number(formPoints),
        date: formDate,
        location: formLocation.trim() || undefined,
        deckArchetype: formDeckArchetype.trim() || undefined,
        notes: formNotes.trim() || undefined,
        createdById: currentMember.id
      });

      // Update local members state
      setMembers(prev => prev.map(m => {
        if (m.id === selectedMem.id) {
          return {
            ...m,
            officialPoints: (m.officialPoints || 0) + Number(formPoints)
          };
        }
        return m;
      }));

      // Reset form
      setFormTournamentName('');
      setFormNotes('');
      setFormLocation('');
      setShowAddCpModal(false);

      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error adding championship points:', err);
      alert('Erro ao registrar pontuação oficial.');
    } finally {
      setSubmittingCp(false);
    }
  };

  const handleDeleteCp = async (record: ChampionshipPointRecord) => {
    if (!window.confirm(`Tem certeza que deseja remover os ${record.points} pontos de "${record.tournamentName}" de ${record.memberName}?`)) {
      return;
    }

    try {
      await deleteChampionshipPointRecord(record.id, record.memberId, record.points);
      setMembers(prev => prev.map(m => {
        if (m.id === record.memberId) {
          return {
            ...m,
            officialPoints: Math.max(0, (m.officialPoints || 0) - record.points)
          };
        }
        return m;
      }));
    } catch (err) {
      console.error('Error deleting CP record:', err);
    }
  };

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGoals(true);
      const updatedGoals: MonthlyGoals = {
        ...goals,
        targetTournaments: Number(editTargetTournaments) || 1,
        targetMatches: Number(editTargetMatches) || 1,
        targetWinRate: Number(editTargetWinRate) || 50,
        targetOfficialPoints: Number(editTargetOfficialPoints) || 50,
        notes: editNotes.trim() || undefined
      };

      await saveMonthlyGoals(updatedGoals);
      setGoals(updatedGoals);
      setShowEditGoalsModal(false);
    } catch (err) {
      console.error('Error saving monthly goals:', err);
      alert('Erro ao atualizar metas.');
    } finally {
      setSavingGoals(false);
    }
  };

  // Helper calculation for progress percentage (capped at 100% for bar, but show real ratio)
  const calcProgress = (current: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="space-y-6" id="monthly-goals-ranking-root">
      
      {/* 1. Header with Title and Action Buttons */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/50 border border-purple-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-10 -mt-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold tracking-wider text-xs uppercase font-mono">
              <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
              Circuito Play! Pokémon & Ranking Spirits
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-2.5">
              <span>Metas Mensais & Pontuação Oficial (CP)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-350 max-w-2xl mt-1 leading-relaxed">
              Defina as metas competitivas do time e acompanhe a pontuação oficial de campeonatos (<strong className="text-amber-300">Championship Points</strong>). Cada Copa de Liga, Desafio de Liga ou Regional disputado soma no ranking oficial de qualificação.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setShowEditGoalsModal(true)}
              className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-850 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-400/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-400" />
              <span>Editar Metas</span>
            </button>

            <button
              onClick={() => {
                setFormMemberId(currentMember.id || (members[0]?.id ?? ''));
                handleTierOrPlacementChange('Copa de Liga', '1º Lugar (Campeão)');
                setShowAddCpModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-slate-950 fill-current" />
              <span>+ Lançar Pontos Oficiais (CP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grid de Metas Mensais da Equipe Spirits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Meta 1: Pontos Oficiais no Mês (O PRINCIPAL) */}
        <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-5 shadow-lg backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              CP Oficial no Mês
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
              {calcProgress(totalOfficialPointsThisMonth, goals.targetOfficialPoints)}%
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-300 tracking-tight">
                {totalOfficialPointsThisMonth}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                / {goals.targetOfficialPoints} CP alvo
              </span>
            </div>

            <div className="w-full bg-slate-950 h-2.5 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-500"
                style={{ width: `${calcProgress(totalOfficialPointsThisMonth, goals.targetOfficialPoints)}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-2 font-mono flex justify-between">
              <span>{monthlyCpRecords.length} pódios registrados</span>
              <span className="text-amber-400 font-semibold">
                {totalOfficialPointsThisMonth >= goals.targetOfficialPoints ? '🎉 Meta Superada!' : `${Math.max(0, goals.targetOfficialPoints - totalOfficialPointsThisMonth)} CP restantes`}
              </span>
            </p>
          </div>
        </div>

        {/* Meta 2: Torneios Disputados */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col justify-between hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono flex items-center gap-1.5">
              <Medal className="w-3.5 h-3.5 text-purple-400" />
              Torneios no Mês
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
              {calcProgress(totalTournamentsCount, goals.targetTournaments)}%
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {totalTournamentsCount}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                / {goals.targetTournaments} torneios
              </span>
            </div>

            <div className="w-full bg-slate-950 h-2.5 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-500"
                style={{ width: `${calcProgress(totalTournamentsCount, goals.targetTournaments)}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-2 font-mono flex justify-between">
              <span>Copas e Desafios</span>
              <span className="text-purple-300 font-semibold">
                {totalTournamentsCount >= goals.targetTournaments ? '✅ Meta Atingida!' : `${Math.max(0, goals.targetTournaments - totalTournamentsCount)} para a meta`}
              </span>
            </p>
          </div>
        </div>

        {/* Meta 3: Winrate Alvo % */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Winrate Alvo
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              Number(currentWinRate) >= goals.targetWinRate 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              Alvo: {goals.targetWinRate}%
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                {currentWinRate}%
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                ({winsThisMonth} vitórias)
              </span>
            </div>

            <div className="w-full bg-slate-950 h-2.5 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, Number(currentWinRate))}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-2 font-mono flex justify-between">
              <span>{totalMatchesCount} confrontos no mês</span>
              <span className={Number(currentWinRate) >= goals.targetWinRate ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {Number(currentWinRate) >= goals.targetWinRate ? '🎯 No Alvo!' : 'Treinando forte'}
              </span>
            </p>
          </div>
        </div>

        {/* Meta 4: Partidas Jogadas */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col justify-between hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-indigo-400" />
              Volume de Partidas
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-500/30">
              {calcProgress(totalMatchesCount, goals.targetMatches)}%
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {totalMatchesCount}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                / {goals.targetMatches} partidas
              </span>
            </div>

            <div className="w-full bg-slate-950 h-2.5 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full transition-all duration-500"
                style={{ width: `${calcProgress(totalMatchesCount, goals.targetMatches)}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-2 font-mono flex justify-between">
              <span>{goals.monthYear || 'Mês Atual'}</span>
              <span className="text-indigo-300 font-semibold">
                {totalMatchesCount >= goals.targetMatches ? '🔥 Ritmo Campeão!' : `${Math.max(0, goals.targetMatches - totalMatchesCount)} restantes`}
              </span>
            </p>
          </div>
        </div>

      </div>

      {/* Orientações / Nota da Meta */}
      {goals.notes && (
        <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center gap-2.5 text-xs text-slate-350">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="leading-relaxed">
            <strong className="text-white">Foco Estratégico do Time:</strong> {goals.notes}
          </span>
        </div>
      )}

      {/* 3. O PRINCIPAL: Leaderboard de Pontuação Oficial (Championship Points / CP) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        
        {/* Leaderboard Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow">
              <Crown className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Ranking Oficial de Campeonatos
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Championship Points (CP)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pontuação cumulativa oficial para corte de vagas em campeonatos de grande porte e internacionais.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setFormMemberId(currentMember.id || (members[0]?.id ?? ''));
              handleTierOrPlacementChange('Copa de Liga', '1º Lugar (Campeão)');
              setShowAddCpModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-950" />
            <span>Cadastrar Resultado & CP</span>
          </button>
        </div>

        {/* Leaderboard Players List */}
        <div className="space-y-3">
          {membersWithCp.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800">
              <PokemonSprite name="substitute" size="md" className="mx-auto mb-2 opacity-50" />
              <p className="text-white font-bold text-sm">Nenhum membro pontuado ainda</p>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Lance os pontos conquistados em Copas e Desafios de Liga para inaugurar a tabela!
              </p>
            </div>
          ) : (
            membersWithCp.map((player, index) => {
              const isFirst = index === 0;
              const isTopThree = index < 3;
              const isCurrentUser = player.id === currentMember.id;
              const cp = player.officialPoints || 0;

              return (
                <div
                  key={player.id}
                  className={`border rounded-2xl p-4 sm:p-5 transition-all backdrop-blur-sm relative overflow-hidden ${
                    isFirst
                      ? 'bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-purple-950/20 border-amber-500/40 shadow-lg shadow-amber-950/20'
                      : isCurrentUser
                      ? 'bg-purple-950/20 border-purple-500/30 hover:border-purple-500/50'
                      : 'bg-slate-950/50 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    {/* Rank Badge + Player Identity */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      
                      {/* Rank Position Pill */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm font-mono border ${
                        index === 0 
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20' 
                          : index === 1 
                          ? 'bg-slate-300 text-slate-950 border-white' 
                          : index === 2 
                          ? 'bg-amber-700 text-white border-amber-600' 
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow">
                        <PokemonSprite name={player.avatarSprite || 'pikachu'} size="md" />
                      </div>

                      {/* Name & Title */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-base font-black truncate ${isFirst ? 'text-amber-200' : 'text-white'}`}>
                            {player.name}
                          </span>
                          {player.nickname && (
                            <span className="text-xs text-purple-300 font-mono">
                              ({player.nickname})
                            </span>
                          )}
                          <div>{getRoleBadge(player.role)}</div>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold">
                              Você
                            </span>
                          )}
                        </div>

                        {/* Recent Tournament Badge / Info */}
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap font-sans">
                          {player.lastRecord ? (
                            <span className="text-amber-300/90 font-medium flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-amber-400" />
                              Último: <strong>{player.lastRecord.placement}</strong> em <em>{player.lastRecord.tournamentName}</em> (+{player.lastRecord.points} CP)
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">
                              Aguardando primeiro registro de pontos
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Official Points Pill & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-850 pt-3 md:pt-0 shrink-0">
                      
                      {/* Pontuação Oficial Destaque */}
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                            {cp}
                          </span>
                          <span className="text-xs font-black text-amber-300/80 font-mono uppercase">
                            CP
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {player.recordsCount || 0} torneios pontuados
                        </div>
                      </div>

                      {/* Ver Conquistas Button */}
                      <button
                        onClick={() => setSelectedMemberForHistory(player)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Histórico</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                    </div>

                  </div>

                  {/* Visual Qualification Bar (ex: meta de 250-300 CP para grandes torneios/Worlds) */}
                  <div className="mt-3 pt-3 border-t border-slate-850/60 flex items-center gap-3">
                    <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                      Progresso Corte: <strong className="text-amber-400">{cp}/250 CP</strong>
                    </div>
                    <div className="flex-1 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((cp / 250) * 100))}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono shrink-0">
                      {Math.round((cp / 250) * 100)}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 4. Feed de Conquistas Oficiais Recentes em Torneios */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
          <div className="flex items-center gap-2 text-white font-black text-base">
            <Trophy className="w-4.5 h-4.5 text-amber-400" />
            <h4>Últimos Campeonatos & Pontuações Conquistadas</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {cpRecords.length} lançamentos registrados
          </span>
        </div>

        {cpRecords.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 font-mono">
            Nenhum histórico disponível ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {cpRecords.slice(0, 5).map(record => (
              <div key={record.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Trophy className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-black text-sm">
                        {record.memberName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {record.placement}
                      </span>
                      <span className="text-xs text-purple-300 font-semibold truncate">
                        {record.tournamentName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(record.date).toLocaleDateString('pt-BR')}
                      </span>
                      {record.location && (
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {record.location}
                        </span>
                      )}
                      {record.deckArchetype && (
                        <span className="text-purple-300 font-mono text-[11px]">
                          Deck: {record.deckArchetype}
                        </span>
                      )}
                    </div>
                    {record.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 italic">
                        "{record.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-lg font-black text-amber-400 font-mono">
                      +{record.points} CP
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteCp(record)}
                    title="Remover este registro"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Lançar Pontos Oficiais de Campeonato (CP) */}
      {showAddCpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Trophy className="w-5 h-5 fill-current" />
                <h3 className="text-base font-bold text-white">Lançar Pontuação Oficial (CP)</h3>
              </div>
              <button 
                onClick={() => setShowAddCpModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCp} className="space-y-4">
              
              {/* Membro do Time Spirits */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Membro do Time Spirits
                </label>
                <select
                  value={formMemberId}
                  onChange={(e) => setFormMemberId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.nickname ? `(${m.nickname})` : ''} - Atual: {m.officialPoints || 0} CP
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome do Torneio */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nome do Torneio Oficial
                </label>
                <input
                  type="text"
                  placeholder="Ex: Copa de Liga - Epic Game Store / Desafio de Liga"
                  value={formTournamentName}
                  onChange={(e) => setFormTournamentName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Tier do Torneio e Colocação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Categoria do Torneio
                  </label>
                  <select
                    value={formTournamentTier}
                    onChange={(e) => handleTierOrPlacementChange(e.target.value, formPlacement)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Copa de Liga">Copa de Liga (League Cup - até 50 CP)</option>
                    <option value="Desafio de Liga">Desafio de Liga (League Challenge - até 15 CP)</option>
                    <option value="Regional">Regional Championship (até 200 CP)</option>
                    <option value="Special Event">Special Event (até 200 CP)</option>
                    <option value="Internacional">Campeonato Internacional (até 500 CP)</option>
                    <option value="Torneio Local">Torneio Local / Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Colocação Obtida
                  </label>
                  <select
                    value={formPlacement}
                    onChange={(e) => handleTierOrPlacementChange(formTournamentTier, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="1º Lugar (Campeão)">1º Lugar (Campeão)</option>
                    <option value="2º Lugar (Vice)">2º Lugar (Vice)</option>
                    <option value="Top 4">Top 4 (Semifinais)</option>
                    <option value="Top 8">Top 8 (Quartas)</option>
                    <option value="Top 16">Top 16</option>
                    <option value="Top 32">Top 32</option>
                    <option value="Participação">Participação</option>
                  </select>
                </div>
              </div>

              {/* Pontos Oficiais (CP) e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                    Pontos Oficiais (CP)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formPoints}
                      onChange={(e) => setFormPoints(Number(e.target.value))}
                      required
                      className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <span className="absolute right-3 top-2 text-xs font-mono text-amber-400 font-bold pointer-events-none">
                      CP
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                    Valor sugerido automaticamente pelo Play! Pokémon
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Data do Torneio
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Deck Archetype e Localização */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Deck Utilizado
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Charizard ex, Miraidon ex, Lugia..."
                    value={formDeckArchetype}
                    onChange={(e) => setFormDeckArchetype(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Cidade / Loja
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo - SP / Loja X"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notas Adicionais */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Anotações / Observações da Campanha
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Campeão invicto 5-0 no suíço e 2-0 nas eliminatórias..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCp}
                  className="px-5 py-2 rounded-xl text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow cursor-pointer disabled:opacity-50"
                >
                  {submittingCp ? 'Salvando...' : 'Salvar Pontuação Oficial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Metas Mensais */}
      {showEditGoalsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-purple-500/40 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Target className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Definir Metas Mensais do Time</h3>
              </div>
              <button 
                onClick={() => setShowEditGoalsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoals} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Meta de Pontos Oficiais do Time (CP)
                </label>
                <input
                  type="number"
                  min="10"
                  max="2000"
                  value={editTargetOfficialPoints}
                  onChange={(e) => setEditTargetOfficialPoints(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Total de Championship Points que a equipe visa acumular no mês.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Torneios Disputados
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editTargetTournaments}
                    onChange={(e) => setEditTargetTournaments(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Winrate Alvo (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editTargetWinRate}
                    onChange={(e) => setEditTargetWinRate(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Volume de Partidas da Equipe
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={editTargetMatches}
                  onChange={(e) => setEditTargetMatches(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Mensagem / Foco Estratégico
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Treinar match-up contra Charizard e focar na Copa de Liga de Sábado..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditGoalsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGoals}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-500 transition-all shadow cursor-pointer disabled:opacity-50"
                >
                  {savingGoals ? 'Salvando...' : 'Atualizar Metas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Histórico Individual de Torneios do Jogador */}
      {selectedMemberForHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <PokemonSprite name={selectedMemberForHistory.avatarSprite || 'pikachu'} size="sm" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    {selectedMemberForHistory.name}
                    <span className="text-xs text-amber-400 font-mono font-black">
                      ({selectedMemberForHistory.officialPoints || 0} CP)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Histórico detalhado de torneios oficiais</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMemberForHistory(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {cpRecords.filter(r => r.memberId === selectedMemberForHistory.id).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  Nenhum torneio registrado individualmente para este jogador ainda.
                </div>
              ) : (
                cpRecords
                  .filter(r => r.memberId === selectedMemberForHistory.id)
                  .map(rec => (
                    <div key={rec.id} className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-300">{rec.placement}</span>
                          <span className="text-xs text-white font-medium">• {rec.tournamentName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{new Date(rec.date).toLocaleDateString('pt-BR')}</span>
                          {rec.location && <span>• {rec.location}</span>}
                          {rec.deckArchetype && <span>• Deck: {rec.deckArchetype}</span>}
                        </div>
                        {rec.notes && (
                          <div className="text-[10px] text-slate-400 italic mt-1">"{rec.notes}"</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-amber-400 font-mono">
                          +{rec.points} CP
                        </span>
                        <button
                          onClick={() => handleDeleteCp(rec)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedMemberForHistory(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
