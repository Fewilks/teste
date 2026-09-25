import React, { useState, useEffect } from 'react';
import { db, matchesCol, membersCol, decksCol, tournamentsCol, purgeAllDataExceptDecks } from '../lib/firebase';
import { getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Member, MatchRecord, DeckRecord, Tournament } from '../types';
import { 
  Swords, 
  Calendar, 
  PlusCircle, 
  X, 
  Filter, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  FileText,
  Play,
  RotateCcw,
  Trophy,
  Trash2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import PokemonSprite from './PokemonSprite';
import PokemonLoader from './PokemonLoader';
import TrainerLog from './TrainerLog/TrainerLog';
import ModalPortal from './ModalPortal';

interface MatchesProps {
  currentMember: Member;
  setActiveTab?: (tab: string) => void;
  initialSubTab?: 'history' | 'replay';
  onSyncMatch?: () => void;
}

export function getArchetypeSprites(archetype: string): string[] {
  if (!archetype) return ['substitute'];
  
  // Remove parenthesized text (like set names: "(Heróis Excelsos)", "(Fogo Fantasmagórico)")
  const cleaned = archetype.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  // Split by '/', '+', '&', '|', ' and ', ' with ', ' e ' (NOT by single hyphen '-' to protect names like Chien-Pao, Mega-Lucario)
  const parts = cleaned.split(/\s*[\/\+\&\|]\s*|\s+(?:and|with|e)\s+/i);
  const pokemonNames = parts
    .map(p => {
      let name = p.trim();
      // Remove typical suffixes while keeping mega / x / y qualifiers
      name = name.replace(/\b(ex|vstar|vmax|v|gmax|tera|prime|baby|deck)\b/gi, '');
      return name.trim();
    })
    .filter(name => name.length > 0);
  
  // Return at most 2, fallback to substitute if none
  if (pokemonNames.length === 0) return ['substitute'];
  return pokemonNames.slice(0, 2);
}

export default function Matches({ currentMember, setActiveTab, initialSubTab = 'history', onSyncMatch }: MatchesProps) {
  const [activeSection, setActiveSection] = useState<'history' | 'replay'>(initialSubTab);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allDecks, setAllDecks] = useState<DeckRecord[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [showOnlyMine, setShowOnlyMine] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showDirectPurgeModal, setShowDirectPurgeModal] = useState<boolean>(false);
  const [purgingDirect, setPurgingDirect] = useState<boolean>(false);

  // Filter conditions
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterTournament, setFilterTournament] = useState<string>('all');

  // Register Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [player1Id, setPlayer1Id] = useState(currentMember.id);
  const [player2Name, setPlayer2Name] = useState('');
  const [player2IsMember, setPlayer2IsMember] = useState(false);
  const [player2Id, setPlayer2Id] = useState('');
  const [deckName, setDeckName] = useState('');
  const [deckArchetype, setDeckArchetype] = useState('Charizard ex');
  const [deckPokemon1, setDeckPokemon1] = useState('charizard');
  const [deckPokemon2, setDeckPokemon2] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [opponentDeck, setOpponentDeck] = useState('');
  const [format, setFormat] = useState<'MD1' | 'MD3' | 'MD5'>('MD3');
  const [result, setResult] = useState<'win' | 'loss' | 'draw'>('win');
  const [score, setScore] = useState('2-0');
  const [notes, setNotes] = useState('');
  const [registering, setRegistering] = useState(false);

  // Tournament selector state for the form
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [customTournamentName, setCustomTournamentName] = useState<string>('');

  // MD3 Game by Game state (Rodada 1, Rodada 2, Rodada 3)
  const [round1, setRound1] = useState<'win' | 'loss' | 'draw'>('win');
  const [round2, setRound2] = useState<'win' | 'loss' | 'draw'>('win');
  const [round3, setRound3] = useState<'win' | 'loss' | 'draw' | 'not_played'>('not_played');

  const archetypes = [
    'Charizard ex',
    'Regidrago VSTAR',
    'Raging Bolt ex',
    'Gardevoir ex',
    'Lugia VSTAR',
    'Roaring Moon ex',
    'Miraidon ex',
    'Dragapult ex',
    'Chien-Pao ex',
    'Snorlax Block',
    'Gholdengo ex',
    'Iron Valiant ex',
    'Terapagos ex',
    'Garchomp ex',
    'Outro'
  ];

  async function loadMatches() {
    try {
      setLoading(true);
      
      // Load matches sorted by playedAt desc
      const matchSnap = await getDocs(query(matchesCol, orderBy('playedAt', 'desc')));
      const matchList = matchSnap.docs.map(d => ({ id: d.id, ...d.data() } as MatchRecord));
      setMatches(matchList);

      // Load members list for selector
      const memSnap = await getDocs(membersCol);
      const memList = memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
      setMembers(memList);

      // Load all registered decks
      const deckSnap = await getDocs(decksCol);
      const deckList = deckSnap.docs.map(d => ({ id: d.id, ...d.data() } as DeckRecord));
      setAllDecks(deckList);

      // Load all registered tournaments for match linking and filtering
      const tournsSnap = await getDocs(tournamentsCol);
      const tournsList = tournsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
      tournsList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setTournaments(tournsList);
    } catch (err) {
      console.error('Error loading matches:', err);
    } finally {
      setLoading(false);
    }
  }

  // Recalcula o placar e o resultado da MD3 automaticamente com base nas 3 rodadas
  const applyMD3State = (
    r1: 'win' | 'loss' | 'draw',
    r2: 'win' | 'loss' | 'draw',
    r3: 'win' | 'loss' | 'draw' | 'not_played'
  ) => {
    let w = 0;
    let l = 0;
    let d = 0;

    if (r1 === 'win') w++; else if (r1 === 'loss') l++; else d++;
    if (r2 === 'win') w++; else if (r2 === 'loss') l++; else d++;
    if (r3 !== 'not_played') {
      if (r3 === 'win') w++; else if (r3 === 'loss') l++; else d++;
    }

    const calculatedScore = `${w}-${l}${d > 0 ? ` (${d}E)` : ''}`;
    let calculatedRes: 'win' | 'loss' | 'draw' = 'draw';
    if (w > l) calculatedRes = 'win';
    else if (l > w) calculatedRes = 'loss';
    else calculatedRes = 'draw';

    setScore(calculatedScore);
    setResult(calculatedRes);
  };

  const handleSetRound1 = (val: 'win' | 'loss' | 'draw') => {
    setRound1(val);
    let nextR3 = round3;
    if (val === 'win' && round2 === 'win') {
      nextR3 = 'not_played';
    } else if (val === 'loss' && round2 === 'loss') {
      nextR3 = 'not_played';
    } else if (nextR3 === 'not_played') {
      nextR3 = 'win';
    }
    setRound3(nextR3);
    applyMD3State(val, round2, nextR3);
  };

  const handleSetRound2 = (val: 'win' | 'loss' | 'draw') => {
    setRound2(val);
    let nextR3 = round3;
    if (round1 === 'win' && val === 'win') {
      nextR3 = 'not_played';
    } else if (round1 === 'loss' && val === 'loss') {
      nextR3 = 'not_played';
    } else if (nextR3 === 'not_played') {
      nextR3 = 'win';
    }
    setRound3(nextR3);
    applyMD3State(round1, val, nextR3);
  };

  const handleSetRound3 = (val: 'win' | 'loss' | 'draw' | 'not_played') => {
    setRound3(val);
    applyMD3State(round1, round2, val);
  };

  useEffect(() => {
    loadMatches();
  }, [currentMember]);

  const handleToggleSelectMatch = (matchId: string) => {
    setSelectedMatches(prev => 
      prev.includes(matchId) 
        ? prev.filter(id => id !== matchId) 
        : [...prev, matchId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredMatches.map(m => m.id);
    const areAllSelected = allFilteredIds.every(id => selectedMatches.includes(id));
    if (areAllSelected) {
      setSelectedMatches(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedMatches(prev => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMatches.length === 0) return;
    
    try {
      setLoading(true);
      setShowDeleteModal(false);
      
      const memSnap = await getDocs(membersCol);
      const latestMembers = memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
      
      const memberStatsAdjustments: { [memberId: string]: { wins: number; losses: number; draws: number } } = {};
      
      for (const matchId of selectedMatches) {
        const match = matches.find(m => m.id === matchId);
        if (!match) continue;
        
        await deleteDoc(doc(db, 'matches', matchId));
        
        // P1 adjustment (subtract stats)
        const p1Id = match.player1Id;
        if (!memberStatsAdjustments[p1Id]) {
          memberStatsAdjustments[p1Id] = { wins: 0, losses: 0, draws: 0 };
        }
        memberStatsAdjustments[p1Id].wins -= (match.result === 'win' ? 1 : 0);
        memberStatsAdjustments[p1Id].losses -= (match.result === 'loss' ? 1 : 0);
        memberStatsAdjustments[p1Id].draws -= (match.result === 'draw' ? 1 : 0);
        
        // P2 adjustment (subtract stats)
        if (match.player2IsMember && match.player2Id) {
          const p2Id = match.player2Id;
          if (!memberStatsAdjustments[p2Id]) {
            memberStatsAdjustments[p2Id] = { wins: 0, losses: 0, draws: 0 };
          }
          const p2Result = match.result === 'win' ? 'loss' : match.result === 'loss' ? 'win' : 'draw';
          memberStatsAdjustments[p2Id].wins -= (p2Result === 'win' ? 1 : 0);
          memberStatsAdjustments[p2Id].losses -= (p2Result === 'loss' ? 1 : 0);
          memberStatsAdjustments[p2Id].draws -= (p2Result === 'draw' ? 1 : 0);
        }
      }
      
      for (const [memberId, adjustment] of Object.entries(memberStatsAdjustments)) {
        const existingMember = latestMembers.find(m => m.id === memberId);
        if (existingMember) {
          const updatedWins = Math.max(0, existingMember.wins + adjustment.wins);
          const updatedLosses = Math.max(0, existingMember.losses + adjustment.losses);
          const updatedDraws = Math.max(0, existingMember.draws + adjustment.draws);
          
          await updateDoc(doc(db, 'members', memberId), {
            wins: updatedWins,
            losses: updatedLosses,
            draws: updatedDraws
          });
        }
      }
      
      setMatches(prev => prev.filter(m => !selectedMatches.includes(m.id)));
      setSelectedMatches([]);
      
      alert('Partidas apagadas e placares de líderes recalculados com sucesso!');
      window.location.reload();
    } catch (err) {
      console.error('Error deleting selected matches:', err);
      alert('Ocorreu um erro ao apagar as partidas selecionadas.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeAllMatches = async () => {
    try {
      setPurgingDirect(true);
      await purgeAllDataExceptDecks();
      setMatches([]);
      setSelectedMatches([]);
      setShowDirectPurgeModal(false);
      if (onSyncMatch) onSyncMatch();
      await loadMatches();
    } catch (err) {
      console.error('Error purging matches:', err);
      alert('Erro ao zerar dados. Tente novamente.');
    } finally {
      setPurgingDirect(false);
    }
  };

  const handleRegisterMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (player2IsMember && !player2Id) {
      alert('Por favor, selecione o membro oponente!');
      return;
    }
    if (!player2IsMember && !player2Name.trim()) {
      alert('Por favor, insira o nome do oponente!');
      return;
    }
    if (!deckName.trim()) {
      alert('Por favor, insira o nome do seu deck!');
      return;
    }
    if ((selectedDeckId === 'custom' || selectedDeckId === '') && !deckPokemon1.trim()) {
      alert('Por favor, insira pelo menos o primeiro Pokémon em destaque!');
      return;
    }
    if (!opponentDeck.trim()) {
      alert('Por favor, insira o deck do oponente!');
      return;
    }

    try {
      setRegistering(true);

      const p1Member = members.find(m => m.id === player1Id) || currentMember;
      const computedArchetype = (selectedDeckId !== 'custom' && selectedDeckId !== '')
        ? deckArchetype
        : (deckPokemon2.trim() ? `${deckPokemon1.trim()} + ${deckPokemon2.trim()}` : deckPokemon1.trim() || 'Desconhecido');

      // Vínculo opcional com torneio cadastrado ou digitado
      let matchTournamentId: string | undefined = undefined;
      let matchTournamentName: string | undefined = undefined;

      if (selectedTournamentId === 'custom') {
        if (customTournamentName.trim()) {
          matchTournamentName = customTournamentName.trim();
        }
      } else if (selectedTournamentId) {
        const foundTourn = tournaments.find(t => t.id === selectedTournamentId);
        if (foundTourn) {
          matchTournamentId = foundTourn.id;
          matchTournamentName = foundTourn.name;
        }
      }

      const newMatchData: Record<string, any> = {
        player1Id: player1Id,
        player1Name: p1Member.name || 'Treinador Spirits',
        player1Sprite: p1Member.avatarSprite || 'charizard',
        player2Name: player2IsMember ? (members.find(m => m.id === player2Id)?.name || player2Name) : player2Name,
        player2IsMember: !!player2IsMember,
        player2Id: (player2IsMember && player2Id) ? player2Id : '',
        deckName: deckName.trim(),
        deckArchetype: computedArchetype,
        opponentDeck: opponentDeck.trim(),
        format: format,
        result: result,
        score: score.trim(),
        playedAt: new Date().toISOString(),
        notes: notes.trim(),
        round1: round1 || 'win',
        round2: round2 || 'win',
        round3: round3 || 'not_played'
      };

      if (matchTournamentId) {
        newMatchData.tournamentId = matchTournamentId;
      }
      if (matchTournamentName) {
        newMatchData.tournamentName = matchTournamentName;
      }

      // Remove any keys that are undefined (Firestore addDoc throws if any field value is undefined)
      Object.keys(newMatchData).forEach(key => {
        if (newMatchData[key] === undefined) {
          delete newMatchData[key];
        }
      });

      // 1. Add to Matches collection
      const docRef = await addDoc(matchesCol, newMatchData as Omit<MatchRecord, 'id'>);

      // 2. Increment wins/losses/draws for player 1
      const p1Ref = doc(db, 'members', player1Id);
      const updatedWins = p1Member.wins + (result === 'win' ? 1 : 0);
      const updatedLosses = p1Member.losses + (result === 'loss' ? 1 : 0);
      const updatedDraws = p1Member.draws + (result === 'draw' ? 1 : 0);

      await updateDoc(p1Ref, {
        wins: updatedWins,
        losses: updatedLosses,
        draws: updatedDraws
      });

      // 3. Increment for player 2 if player 2 is also a Spirits member!
      if (player2IsMember && player2Id) {
        const p2Member = members.find(m => m.id === player2Id);
        if (p2Member) {
          const p2Ref = doc(db, 'members', player2Id);
          // Opposite results for player 2
          const p2Result = result === 'win' ? 'loss' : result === 'loss' ? 'win' : 'draw';
          const updatedP2Wins = p2Member.wins + (p2Result === 'win' ? 1 : 0);
          const updatedP2Losses = p2Member.losses + (p2Result === 'loss' ? 1 : 0);
          const updatedP2Draws = p2Member.draws + (p2Result === 'draw' ? 1 : 0);

          await updateDoc(p2Ref, {
            wins: updatedP2Wins,
            losses: updatedP2Losses,
            draws: updatedP2Draws
          });
        }
      }

      // Add to local state
      setMatches(prev => [{ id: docRef.id, ...newMatchData } as MatchRecord, ...prev]);

      // Reset form & Close modal
      setShowFormModal(false);
      setPlayer2Name('');
      setPlayer2IsMember(false);
      setPlayer2Id('');
      setDeckName('');
      setSelectedDeckId('');
      setDeckPokemon1('charizard');
      setDeckPokemon2('');
      setOpponentDeck('');
      setNotes('');
      setSelectedTournamentId('');
      setCustomTournamentName('');
      setRound1('win');
      setRound2('win');
      setRound3('not_played');
      setScore('2-0');
      setResult('win');
      alert('Partida registrada com sucesso! O ranking do time foi atualizado.');
    } catch (err) {
      console.error('Error registering match:', err);
    } finally {
      setRegistering(false);
    }
  };

  const filteredMatches = matches.filter(match => {
    const matchesResult = filterResult === 'all' || match.result === filterResult;
    const matchesFormat = filterFormat === 'all' || match.format === filterFormat;
    const matchesMine = !showOnlyMine || (
      match.player1Id === currentMember.id || 
      (match.player2IsMember && match.player2Id === currentMember.id)
    );
    let matchesTourn = true;
    if (filterTournament === 'all') {
      matchesTourn = true;
    } else if (filterTournament === 'none') {
      matchesTourn = !match.tournamentId && !match.tournamentName;
    } else {
      matchesTourn = match.tournamentId === filterTournament || match.tournamentName === filterTournament;
    }
    return matchesResult && matchesFormat && matchesMine && matchesTourn;
  });

  // Torneios únicos presentes nas partidas cadastradas além dos cadastrados
  const matchTournamentNames = Array.from(
    new Set(
      matches
        .map(m => m.tournamentName)
        .filter((name): name is string => Boolean(name && !tournaments.some(t => t.name === name)))
    )
  );

  const isTournamentFiltered = filterTournament !== 'all' && filterTournament !== 'none';
  const currentFilteredTournamentName = tournaments.find(t => t.id === filterTournament)?.name || filterTournament;
  const filteredWins = filteredMatches.filter(m => m.result === 'win').length;
  const filteredLosses = filteredMatches.filter(m => m.result === 'loss').length;
  const filteredDraws = filteredMatches.filter(m => m.result === 'draw').length;
  const filteredWinrate = filteredMatches.length > 0
    ? Math.round((filteredWins / filteredMatches.length) * 100)
    : 0;

  return (
    <div className="space-y-6" id="matches-view">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-850 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⚔️</span> Arena de Partidas Spirits
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registro de treinos internos, confrontos de torneios competitivos e leitor interativo de logs do Pokémon TCG Live.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {matches.length > 0 && (
            <button
              id="btn-purge-matches-direct"
              onClick={() => setShowDirectPurgeModal(true)}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 hover:border-rose-500/50 text-rose-300 hover:text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              title="Zerar partidas mantendo os decks cadastrados intactos"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Zerar Partidas (Manter Decks)</span>
            </button>
          )}

          {activeSection === 'history' && selectedMatches.length > 0 && (
            <button
              id="btn-delete-selected"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-lg font-bold text-sm flex items-center gap-2 cursor-pointer transition-all duration-300 shadow-lg shadow-rose-950/40"
            >
              🗑️ Apagar Selecionadas ({selectedMatches.length})
            </button>
          )}
          
          <button
            id="btn-open-register-match"
            onClick={() => setShowFormModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-950/40 cursor-pointer transition-all duration-300"
          >
            <PlusCircle className="w-5 h-5" /> Registrar Nova Partida
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation (Histórico de Partidas vs Leitor & Replay PTCGL) */}
      <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 w-fit">
        <button
          id="subtab-matches-history"
          onClick={() => setActiveSection('history')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSection === 'history'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>Histórico de Partidas</span>
          <span className="text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded font-mono">
            {matches.length}
          </span>
        </button>

        <button
          id="subtab-matches-replay"
          onClick={() => setActiveSection('replay')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSection === 'replay'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Leitor & Replay PTCGL</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded uppercase font-mono font-bold">
            Interativo
          </span>
        </button>
      </div>

      {/* CONDITIONAL CONTENT: REPLAY PTCGL OR MATCH HISTORY */}
      {activeSection === 'replay' ? (
        <div id="ptcgl-replay-container" className="animate-fade-in">
          <TrainerLog 
            currentMember={currentMember} 
            onSyncMatch={() => {
              loadMatches();
              if (onSyncMatch) onSyncMatch();
            }} 
          />
        </div>
      ) : (
        <div id="match-history-container" className="space-y-6 animate-fade-in">

          {/* Filter panel */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Filter className="w-4 h-4 text-purple-400" />
              <span>Filtros Rápidos:</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* Tournament Filter */}
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-400">Campeonato:</span>
                <select
                  id="filter-tournament-select"
                  value={filterTournament}
                  onChange={(e) => setFilterTournament(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white text-xs px-2.5 py-1 rounded-md outline-none max-w-[240px] truncate"
                >
                  <option value="all">🏆 Todos os Torneios & Treinos</option>
                  <option value="none">🥊 Apenas Treinos Livres</option>
                  {tournaments.length > 0 && (
                    <optgroup label="Campeonatos Cadastrados">
                      {tournaments.map(t => (
                        <option key={t.id} value={t.id}>
                          🏆 {t.name} ({t.city})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {matchTournamentNames.length > 0 && (
                    <optgroup label="Outros Torneios">
                      {matchTournamentNames.map((name, idx) => (
                        <option key={idx} value={name}>
                          🏆 {name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Result Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Resultado:</span>
                <select
                  id="filter-result-select"
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white text-xs px-2.5 py-1 rounded-md outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="win">Vitórias</option>
                  <option value="loss">Derrotas</option>
                  <option value="draw">Empates</option>
                </select>
              </div>

              {/* Format Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Formato:</span>
                <select
                  id="filter-format-select"
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white text-xs px-2.5 py-1 rounded-md outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="MD1">Melhor de 1 (MD1)</option>
                  <option value="MD3">Melhor de 3 (MD3)</option>
                  <option value="MD5">Melhor de 5 (MD5)</option>
                </select>
              </div>

              {/* My Results Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none border border-slate-800 bg-slate-950/40 px-3 py-1 rounded-md hover:border-purple-500/30 transition-all text-xs text-slate-300">
                <input
                  type="checkbox"
                  id="filter-only-mine"
                  checked={showOnlyMine}
                  onChange={(e) => setShowOnlyMine(e.target.checked)}
                  className="accent-purple-500 rounded cursor-pointer w-3.5 h-3.5"
                />
                <span>Apenas minhas partidas</span>
              </label>

              {filteredMatches.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-md text-xs text-slate-300 transition-all hover:text-white font-bold cursor-pointer"
                >
                  {filteredMatches.every(m => selectedMatches.includes(m.id)) ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </button>
              )}
            </div>
          </div>

          {/* Tournament Summary Banner if Filtered by Tournament */}
          {isTournamentFiltered && (
            <div className="bg-gradient-to-r from-amber-500/10 via-purple-600/10 to-slate-900 border border-amber-500/30 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Filtro de Campeonato Ativo</div>
                  <h3 className="text-base font-black text-white">{currentFilteredTournamentName}</h3>
                  <p className="text-xs text-slate-400">
                    Visualizando todas as partidas disputadas pelos membros da Spirits neste campeonato.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300 font-mono">
                  Total: <strong className="text-white">{filteredMatches.length}</strong> partidas
                </div>
                <div className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg font-mono">
                  <span className="text-emerald-400 font-bold">{filteredWins}V</span> - <span className="text-rose-400 font-bold">{filteredLosses}D</span> - <span className="text-slate-400">{filteredDraws}E</span>
                </div>
                <div className="px-3 py-1.5 bg-purple-950/40 border border-purple-500/30 rounded-lg text-purple-300 font-bold font-mono">
                  Winrate: {filteredWinrate}%
                </div>
                <button
                  type="button"
                  onClick={() => setFilterTournament('all')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  title="Limpar filtro de campeonato"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Main List */}
          {loading ? (
            <PokemonLoader 
              pokemon="scizor" 
              title="Consultando registro de combates..." 
              subtitle="Sincronizando partidas, estatísticas e winrates..." 
            />
          ) : filteredMatches.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
              <Swords className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="font-bold">Nenhum combate corresponde aos filtros aplicados.</p>
              <p className="text-xs text-slate-500 mt-1">Experimente mudar as opções de filtros acima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="matches-grid">
              {filteredMatches.map(match => (
                <div 
                  key={match.id} 
                  className="bg-slate-900/60 border border-slate-800 hover:border-purple-500/25 rounded-2xl p-5 transition-all flex flex-col justify-between"
                  id={`match-card-${match.id}`}
                >
                  <div className="space-y-4">
                    {/* Players comparison header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-850 pb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedMatches.includes(match.id)}
                          onChange={() => handleToggleSelectMatch(match.id)}
                          className="accent-purple-500 rounded cursor-pointer w-4 h-4 mr-1 shrink-0"
                        />
                        <div className="flex items-center gap-3">
                          <PokemonSprite name={match.player1Sprite} size="sm" />
                          <div>
                            <h3 className="text-white font-bold text-sm">{match.player1Name}</h3>
                            <span className="text-[10px] text-purple-400 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded font-mono">Spirits Team</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-mono font-bold text-slate-500">VS</div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <h3 className="text-white font-bold text-sm">{match.player2Name}</h3>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            match.player2IsMember ? 'text-purple-400 bg-purple-950/40' : 'text-slate-400 bg-slate-800'
                          }`}>
                            {match.player2IsMember ? 'Spirits Team' : 'Oponente'}
                          </span>
                        </div>
                        <PokemonSprite name={match.player2IsMember ? (members.find(m => m.id === match.player2Id)?.avatarSprite || 'substitute') : 'substitute'} size="sm" />
                      </div>
                    </div>

                    {/* Match deck setups */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Archetype Icons */}
                        <div className="flex -space-x-2 shrink-0">
                          {getArchetypeSprites(match.deckArchetype).map((spriteName, idx) => (
                            <div key={idx} className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center overflow-hidden shadow-md">
                              <PokemonSprite name={spriteName} size="sm" className="w-5.5 h-5.5 scale-110" />
                            </div>
                          ))}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] text-slate-550 uppercase font-bold">Deck do Spirits</div>
                          <div className="text-xs font-bold text-slate-200 truncate" title={match.deckName}>{match.deckName}</div>
                          <div className="text-[10px] text-slate-400 truncate">{match.deckArchetype}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 text-right border-l border-slate-900 pl-4 min-w-0">
                        <div className="min-w-0">
                          <div className="text-[9px] text-slate-550 uppercase font-bold">Deck Oponente</div>
                          <div className="text-xs font-bold text-slate-200 truncate" title={match.opponentDeck}>{match.opponentDeck}</div>
                          <div className="text-[10px] text-slate-400 truncate">{match.opponentDeck}</div>
                        </div>
                        {/* Opponent Archetype Icons */}
                        <div className="flex -space-x-2 shrink-0">
                          {getArchetypeSprites(match.opponentDeck).map((spriteName, idx) => (
                            <div key={idx} className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center overflow-hidden shadow-md">
                              <PokemonSprite name={spriteName} size="sm" className="w-5.5 h-5.5 scale-110" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Match Notes comment */}
                    {match.notes && (
                      <div className="bg-slate-900/30 p-2.5 rounded-lg text-xs text-slate-400 italic flex gap-1.5">
                        <FileText className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                        <span>"{match.notes}"</span>
                      </div>
                    )}
                  </div>

                  {/* Status details footer */}
                  <div className="border-t border-slate-850 pt-3 mt-4 space-y-2">
                    {/* Optional Tournament Badge */}
                    {match.tournamentName && (
                      <div className="flex items-center gap-1.5 pb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span className="truncate">{match.tournamentName}</span>
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                          match.result === 'win' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                          match.result === 'loss' ? 'bg-rose-950 text-rose-400 border border-rose-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {match.result === 'win' ? 'Vitória' : match.result === 'loss' ? 'Derrota' : 'Empate'}
                        </span>
                        <span className="text-white font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850 font-mono text-xs">{match.score}</span>

                        {/* MD3 Breakdown Pills */}
                        {match.round1 && (
                          <div className="flex items-center gap-1 font-mono text-[9px] ml-1">
                            <span className={`px-1.5 py-0.2 rounded font-bold ${
                              match.round1 === 'win' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' :
                              match.round1 === 'loss' ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30' :
                              'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                            }`} title="Rodada 1">
                              R1: {match.round1 === 'win' ? 'V' : match.round1 === 'loss' ? 'D' : 'E'}
                            </span>
                            {match.round2 && (
                              <span className={`px-1.5 py-0.2 rounded font-bold ${
                                match.round2 === 'win' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' :
                                match.round2 === 'loss' ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30' :
                                'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                              }`} title="Rodada 2">
                                R2: {match.round2 === 'win' ? 'V' : match.round2 === 'loss' ? 'D' : 'E'}
                              </span>
                            )}
                            {match.round3 && match.round3 !== 'not_played' && (
                              <span className={`px-1.5 py-0.2 rounded font-bold ${
                                match.round3 === 'win' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' :
                                match.round3 === 'loss' ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30' :
                                'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                              }`} title="Rodada 3">
                                R3: {match.round3 === 'win' ? 'V' : match.round3 === 'loss' ? 'D' : 'E'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-slate-500 flex items-center gap-1 font-mono text-[10px]">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(match.playedAt).toLocaleDateString('pt-BR')} | {match.format}
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Form Overlay Modal */}
          <ModalPortal isOpen={showFormModal} onClose={() => setShowFormModal(false)} id="register-match-modal">
            <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col my-auto animate-fade-in">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-950/60 border border-purple-500/30 rounded-xl text-purple-400">
                      <Swords className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">Registrar Partida Competitiva</h3>
                      <p className="text-xs text-slate-400">Confronto individual ou em torneio oficial</p>
                    </div>
                  </div>
                  <button 
                    id="close-form-x"
                    onClick={() => setShowFormModal(false)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form wrapper */}
                <form onSubmit={handleRegisterMatch} className="flex flex-col flex-1 overflow-hidden min-h-0">
                  <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                  
                  {/* Tournament / Event Selector */}
                  <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Campeonato / Torneio (Opcional):</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">Filtre depois na lista</span>
                    </div>

                    <select
                      id="modal-tournament-select"
                      value={selectedTournamentId}
                      onChange={(e) => setSelectedTournamentId(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-medium"
                    >
                      <option value="">🥊 Sem Torneio (Treino Livre / Partida Amistosa)</option>
                      {tournaments.length > 0 && (
                        <optgroup label="Campeonatos Cadastrados no Spirits">
                          {tournaments.map(t => (
                            <option key={t.id} value={t.id}>
                              🏆 {t.name} - {t.storeName} ({t.city})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="custom">✍️ Outro Campeonato (Digitar Manualmente...)</option>
                    </select>

                    {selectedTournamentId === 'custom' && (
                      <div className="pt-2 animate-fade-in">
                        <input
                          type="text"
                          placeholder="Nome do Campeonato (ex: League Cup Bauru - Spirits x MadCat)"
                          value={customTournamentName}
                          onChange={(e) => setCustomTournamentName(e.target.value)}
                          className="w-full p-2.5 bg-slate-900 border border-amber-500/50 focus:border-amber-400 rounded-lg text-white text-sm outline-none placeholder:text-slate-500"
                          required={selectedTournamentId === 'custom'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Player 1 selection (Spirits member) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">Representando Spirits (Jogador 1):</label>
                    <select
                      id="p1-selector"
                      value={player1Id}
                      onChange={(e) => setPlayer1Id(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none"
                    >
                      {members.map(mem => (
                        <option key={mem.id} value={mem.id}>{mem.name} ({mem.nickname || 'Sem apelido'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Player 2 selection */}
                  <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase">Oponente (Jogador 2):</label>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-purple-400 font-bold">
                        <input
                          id="checkbox-is-p2-member"
                          type="checkbox"
                          checked={player2IsMember}
                          onChange={(e) => {
                            setPlayer2IsMember(e.target.checked);
                            if (e.target.checked && members.length > 0) {
                              setPlayer2Id(members[0].id);
                            } else {
                              setPlayer2Id('');
                            }
                          }}
                          className="accent-purple-600 rounded"
                        />
                        <span>É membro do Spirits?</span>
                      </label>
                    </div>

                    {player2IsMember ? (
                      <select
                        id="p2-member-selector"
                        value={player2Id}
                        onChange={(e) => setPlayer2Id(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none"
                      >
                        {members.filter(m => m.id !== player1Id).map(mem => (
                          <option key={mem.id} value={mem.id}>{mem.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="p2-text-input"
                        type="text"
                        placeholder="Nome do oponente externo (ex: João Santos ou Renato Legião)"
                        value={player2Name}
                        onChange={(e) => setPlayer2Name(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none"
                        required={!player2IsMember}
                      />
                    )}
                  </div>

                  {/* Decks comparison */}
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-4">
                    
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase">Selecione seu Deck Cadastrado:</label>
                      <select
                        id="p1-deck-selector"
                        value={selectedDeckId}
                        onChange={(e) => {
                          const selId = e.target.value;
                          setSelectedDeckId(selId);
                          if (selId === 'custom') {
                            setDeckName('');
                            setDeckPokemon1('charizard');
                            setDeckPokemon2('');
                          } else {
                            const foundDeck = allDecks.find(d => d.id === selId);
                            if (foundDeck) {
                              setDeckName(foundDeck.deckName);
                              setDeckArchetype(foundDeck.archetype);
                              const parts = getArchetypeSprites(foundDeck.archetype);
                              setDeckPokemon1(foundDeck.pokemon1 || parts[0] || 'substitute');
                              setDeckPokemon2(foundDeck.pokemon2 || parts[1] || '');
                            } else {
                              setDeckName('');
                              setDeckPokemon1('charizard');
                              setDeckPokemon2('');
                            }
                          }
                        }}
                        className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-semibold"
                        required
                      >
                        <option value="">-- Selecione seu Deck --</option>
                        {allDecks.filter(d => d.userId === player1Id).map(d => (
                          <option key={d.id} value={d.id}>{d.deckName} ({d.archetype})</option>
                        ))}
                        <option value="custom">✍️ Digitar Manualmente...</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300 uppercase">Pokémon Destaque 1 (Ícone):</label>
                        {selectedDeckId !== 'custom' && selectedDeckId !== '' ? (
                          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm font-semibold capitalize flex items-center gap-2">
                            <PokemonSprite name={deckPokemon1 || 'substitute'} size="sm" className="w-5 h-5" />
                            <span className="truncate">{deckPokemon1}</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Ex: charizard, lugia"
                              value={deckPokemon1}
                              onChange={(e) => setDeckPokemon1(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                              className="w-full p-2.5 pl-9 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-semibold"
                              required
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                              <PokemonSprite name={deckPokemon1 || 'substitute'} size="sm" className="w-5 h-5 scale-125" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300 uppercase">Pokémon Destaque 2 (Opcional):</label>
                        {selectedDeckId !== 'custom' && selectedDeckId !== '' ? (
                          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm font-semibold capitalize flex items-center gap-2">
                            {deckPokemon2 ? (
                              <>
                                <PokemonSprite name={deckPokemon2} size="sm" className="w-5 h-5" />
                                <span className="truncate">{deckPokemon2}</span>
                              </>
                            ) : (
                              <span className="text-slate-500 font-normal">Nenhum</span>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Ex: dragapult, pidgeot"
                              value={deckPokemon2}
                              onChange={(e) => setDeckPokemon2(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                              className="w-full p-2.5 pl-9 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-semibold"
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                              {deckPokemon2 ? (
                                <PokemonSprite name={deckPokemon2} size="sm" className="w-5 h-5 scale-125" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-dashed border-slate-700" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* If custom is selected, let them type the name */}
                    {(selectedDeckId === 'custom' || selectedDeckId === '') && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300 uppercase">Nome Personalizado do seu Deck:</label>
                        <input
                          id="p1-deck-input"
                          type="text"
                          placeholder="ex: Charizard Dragapult"
                          value={deckName}
                          onChange={(e) => setDeckName(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">Deck do Oponente (O que ele jogou?):</label>
                    <input
                      id="p2-deck-input"
                      type="text"
                      placeholder="ex: Raging Bolt ex ou Regidrago"
                      value={opponentDeck}
                      onChange={(e) => setOpponentDeck(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none"
                      required
                    />
                  </div>

                  {/* Melhor de Três (MD3) - Rodada 1, Rodada 2, Rodada 3 */}
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-purple-500/20 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 uppercase tracking-wider">
                          <span>⚔️</span>
                          <span>Confronto MD3 (Melhor de Três Rodadas)</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Informe quem venceu cada rodada da partida. O placar e o resultado são calculados automaticamente.
                        </p>
                      </div>

                      {/* Live Computed Badge */}
                      <div className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black uppercase flex items-center gap-1.5 shadow-md ${
                        result === 'win' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' :
                        result === 'loss' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' :
                        'bg-amber-950 text-amber-300 border border-amber-500/40'
                      }`}>
                        <span>{result === 'win' ? 'Vitória' : result === 'loss' ? 'Derrota' : 'Empate'}</span>
                        <span className="text-white font-black bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                          {score}
                        </span>
                      </div>
                    </div>

                    {/* Os 3 Locais com Rodada 1, Rodada 2, Rodada 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      
                      {/* Rodada 1 */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span>Rodada 1</span>
                          <span className="text-[10px] text-slate-500 font-mono">Game 1</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetRound1('win')}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                              round1 === 'win'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-2 ring-emerald-400'
                                : 'bg-slate-950 text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                            }`}
                          >
                            Venceu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRound1('loss')}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                              round1 === 'loss'
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-2 ring-rose-400'
                                : 'bg-slate-950 text-slate-400 hover:text-rose-300 hover:bg-rose-950/30'
                            }`}
                          >
                            Perdeu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRound1('draw')}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                              round1 === 'draw'
                                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-2 ring-amber-400'
                                : 'bg-slate-950 text-slate-400 hover:text-amber-300 hover:bg-amber-950/30'
                            }`}
                          >
                            Empatou
                          </button>
                        </div>
                      </div>

                      {/* Rodada 2 */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span>Rodada 2</span>
                          <span className="text-[10px] text-slate-500 font-mono">Game 2</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetRound2('win')}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                              round2 === 'win'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-2 ring-emerald-400'
                                : 'bg-slate-950 text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                            }`}
                          >
                            Venceu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRound2('loss')}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                              round2 === 'loss'
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-2 ring-rose-400'
                                : 'bg-slate-950 text-slate-400 hover:text-rose-300 hover:bg-rose-950/30'
                            }`}
                          >
                            Perdeu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRound2('draw')}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                              round2 === 'draw'
                                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-2 ring-amber-400'
                                : 'bg-slate-950 text-slate-400 hover:text-amber-300 hover:bg-amber-950/30'
                            }`}
                          >
                            Empatou
                          </button>
                        </div>
                      </div>

                      {/* Rodada 3 */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span>Rodada 3</span>
                          <span className="text-[10px] text-slate-500 font-mono">Desempate</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetRound3('win')}
                            className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              round3 === 'win'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-2 ring-emerald-400'
                                : 'bg-slate-950 text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                            }`}
                          >
                            Venceu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRound3('loss')}
                            className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              round3 === 'loss'
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-2 ring-rose-400'
                                : 'bg-slate-950 text-slate-400 hover:text-rose-300 hover:bg-rose-950/30'
                            }`}
                          >
                            Perdeu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRound3('draw')}
                            className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              round3 === 'draw'
                                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-2 ring-amber-400'
                                : 'bg-slate-950 text-slate-400 hover:text-amber-300 hover:bg-amber-950/30'
                            }`}
                          >
                            Empatou
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRound3('not_played')}
                            className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                              round3 === 'not_played'
                                ? 'bg-slate-700 text-white shadow-md ring-2 ring-slate-400'
                                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                            title="Não houve necessidade (ex: 2-0 ou 0-2)"
                          >
                            Não Houve
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Match Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">Observações da Partida (Opcional):</label>
                    <textarea
                      id="match-notes-input"
                      rows={2}
                      placeholder="Comente sobre match-up, techs decisivas, premiações ou detalhes da partida..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-xs outline-none"
                    />
                  </div>

                  </div>

                  {/* Fixed Pinned Footer with Action Buttons */}
                  <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowFormModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      id="btn-submit-match"
                      type="submit"
                      disabled={registering}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-all shadow-lg flex items-center gap-2"
                    >
                      {registering ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Registrando...</span>
                        </>
                      ) : (
                        <>
                          <Swords className="w-4 h-4" />
                          <span>Confirmar e Registrar Partida</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>

              </div>
          </ModalPortal>

          {/* Direct Purge Modal from Matches Tab */}
          <ModalPortal isOpen={showDirectPurgeModal} onClose={() => setShowDirectPurgeModal(false)} id="purge-matches-direct-modal">
            <div className="bg-slate-900 border border-rose-500/40 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 my-auto animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Zerar Partidas e Histórico</h3>
                  <p className="text-xs text-rose-300">Preservando todos os seus decks cadastrados</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-850">
                <p>
                  Esta ação irá remover todas as <strong>{matches.length} partidas registradas</strong> e resetar o winrate do time.
                </p>
                <p className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Seus baralhos/decks cadastrados permanecerão 100% salvos e protegidos.</span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDirectPurgeModal(false)}
                  disabled={purgingDirect}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePurgeAllMatches}
                  disabled={purgingDirect}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {purgingDirect ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Zerando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar e Zerar Partidas</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </ModalPortal>

          {/* Custom Delete Confirmation Modal */}
          <ModalPortal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} id="delete-match-modal">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 my-auto animate-fade-in">
              <div className="text-center space-y-2">
                <div className="inline-flex w-12 h-12 bg-rose-950/40 border border-rose-500/30 rounded-full items-center justify-center text-rose-400 mb-2">
                  <span className="text-2xl">🗑️</span>
                </div>
                <h3 className="text-lg font-bold text-white">Apagar Partidas Selecionadas</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Você tem certeza que deseja apagar as <strong className="text-rose-400">{selectedMatches.length}</strong> partidas selecionadas?
                </p>
                <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl text-left">
                  <p className="text-[11px] text-amber-400 font-semibold flex items-start gap-1.5 leading-normal">
                    <span>⚠️</span>
                    <span>Esta ação é irreversível e irá recalcular as estatísticas (vitórias, derrotas, empates) de todos os membros envolvidos.</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-950/30"
                >
                  Sim, apagar
                </button>
              </div>
            </div>
          </ModalPortal>

        </div>
      )}
    </div>
  );
}
