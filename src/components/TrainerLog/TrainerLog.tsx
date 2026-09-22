import React, { useState, useEffect } from 'react';
import { db, trainerLogsCol, matchesCol, membersCol } from '../../lib/firebase';
import { getDocs, query, orderBy, doc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { TrainerLogMatch, Member, MatchRecord } from '../../types';
import BoardReplay from './BoardReplay';
import TrainerLogStats from './TrainerLogStats';
import LogImporterModal from './LogImporterModal';
import PokemonSprite from '../PokemonSprite';
import PokemonCard from '../PokemonCard';
import { parsePTCGLLog, SAMPLE_PT_LOG } from '../../utils/ptcglParser';
import { 
  FileText, 
  Plus, 
  Swords, 
  Trophy, 
  BarChart3, 
  Play, 
  Calendar, 
  Trash2, 
  Share2, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw,
  Clock,
  ArrowRight,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Settings,
  ClipboardCopy,
  Check
} from 'lucide-react';

interface TrainerLogProps {
  currentMember: Member;
  onSyncMatch?: () => void;
}

export default function TrainerLog({ currentMember, onSyncMatch }: TrainerLogProps) {
  const [logs, setLogs] = useState<TrainerLogMatch[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'replay' | 'stats' | 'history'>('replay');
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(true);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load logs on mount
  useEffect(() => {
    loadLogs();
  }, [currentMember.id]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      let loadedLogs: TrainerLogMatch[] = [];

      try {
        const snap = await getDocs(trainerLogsCol);
        loadedLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as TrainerLogMatch));
      } catch (e) {
        console.warn('Could not load from Firestore, using local cache:', e);
      }

      // Check localStorage if Firestore returned empty
      if (loadedLogs.length === 0) {
        const cached = localStorage.getItem(`trainer_logs_${currentMember.id}`);
        if (cached) {
          try {
            loadedLogs = JSON.parse(cached);
          } catch (e) {
            console.error('Error parsing cached logs:', e);
          }
        }
      }

      // If still empty, provide the default sample log so user immediately experiences the replay
      if (loadedLogs.length === 0) {
        const defaultSample = parsePTCGLLog(SAMPLE_PT_LOG, currentMember.name || currentMember.nickname);
        defaultSample.userId = currentMember.id;
        defaultSample.id = 'sample-charizard-dragapult';
        loadedLogs = [defaultSample];
        localStorage.setItem(`trainer_logs_${currentMember.id}`, JSON.stringify(loadedLogs));
      }

      // Re-hydrate turns with the latest parser logic if rawLog is present
      loadedLogs = loadedLogs.map(m => {
        const needsRefresh = m.rawLog && (
          m.id === 'sample-charizard-dragapult' || 
          !m.turns || 
          m.turns.length === 0 || 
          m.turns[0].evolutions === undefined ||
          (m.turns[0].turnNumber === 0 && (!m.turns[0].p1Active || !m.turns[0].p2Active))
        );
        if (needsRefresh && m.rawLog) {
          const rawToParse = m.id === 'sample-charizard-dragapult' ? SAMPLE_PT_LOG : m.rawLog;
          const refreshed = parsePTCGLLog(rawToParse, currentMember.name || currentMember.nickname);
          return { ...m, ...refreshed, rawLog: rawToParse, id: m.id, userId: m.userId };
        }
        return m;
      });

      // Sort by date descending
      loadedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setLogs(loadedLogs);
      if (loadedLogs.length > 0 && !selectedLogId) {
        setSelectedLogId(loadedLogs[0].id);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportLog = async (parsedMatch: TrainerLogMatch, alsoSyncToTeam: boolean) => {
    parsedMatch.userId = currentMember.id;
    
    // Save to Firestore
    try {
      await setDoc(doc(db, 'trainer_logs', parsedMatch.id), parsedMatch);
    } catch (err) {
      console.warn('Firestore setDoc failed, saving to local cache:', err);
    }

    // Also sync to Team Matches if requested
    if (alsoSyncToTeam) {
      try {
        const newMatchRecord: Omit<MatchRecord, 'id'> = {
          player1Id: currentMember.id,
          player1Name: currentMember.name,
          player1Sprite: currentMember.avatarSprite || 'charizard',
          player2Name: parsedMatch.player2Name,
          player2IsMember: false,
          deckName: parsedMatch.playerDeckArchetype,
          deckArchetype: parsedMatch.playerDeckArchetype,
          opponentDeck: parsedMatch.opponentDeckArchetype,
          format: 'MD1',
          result: parsedMatch.result,
          score: parsedMatch.finalScore || '1-0',
          playedAt: parsedMatch.date,
          notes: `Importado via TrainerLog (PTCGL Replay - ${parsedMatch.totalTurns} turnos)`
        };

        await addDoc(matchesCol, newMatchRecord);

        // Update member record in Firestore
        const updatedWins = parsedMatch.result === 'win' ? currentMember.wins + 1 : currentMember.wins;
        const updatedLosses = parsedMatch.result === 'loss' ? currentMember.losses + 1 : currentMember.losses;
        const updatedDraws = parsedMatch.result === 'draw' ? currentMember.draws + 1 : currentMember.draws;

        await updateDoc(doc(db, 'members', currentMember.id), {
          wins: updatedWins,
          losses: updatedLosses,
          draws: updatedDraws
        });

        parsedMatch.syncedToMatches = true;
        if (onSyncMatch) onSyncMatch();
      } catch (err) {
        console.error('Failed to sync with matches collection:', err);
      }
    }

    // Update state & cache
    const updated = [parsedMatch, ...logs.filter(l => l.id !== parsedMatch.id)];
    setLogs(updated);
    setSelectedLogId(parsedMatch.id);
    localStorage.setItem(`trainer_logs_${currentMember.id}`, JSON.stringify(updated));

    setStatusMessage({
      type: 'success',
      text: `Registro de batalha importado com sucesso! (${parsedMatch.playerDeckArchetype} vs ${parsedMatch.opponentDeckArchetype})`
    });

    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleDeleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover este registro de batalha do seu TrainerLog?')) return;

    try {
      await deleteDoc(doc(db, 'trainer_logs', id));
    } catch (err) {
      console.warn('Firestore delete failed:', err);
    }

    const updated = logs.filter(l => l.id !== id);
    setLogs(updated);
    localStorage.setItem(`trainer_logs_${currentMember.id}`, JSON.stringify(updated));

    if (selectedLogId === id && updated.length > 0) {
      setSelectedLogId(updated[0].id);
    }
  };

  const selectedMatch = logs.find(l => l.id === selectedLogId) || logs[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">TrainerLog</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> PTCGL Replay Engine
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-300">
                  Transforme registros do Pokémon TCG Live em replays interativos turno a turno, mapas de prêmios e análises competitivas.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const sample = parsePTCGLLog(SAMPLE_PT_LOG, currentMember.name || currentMember.nickname);
                handleImportLog(sample, false);
              }}
              className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Exemplo Rápido
            </button>
            <button
              onClick={() => setIsImporterOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Importar Log do PTCGL
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' 
              : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Visual Step-by-Step Guide Banner */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-black text-white tracking-tight flex items-center gap-2">
                Guia Rápido: Como Importar Partidas do Pokémon TCG Live
                <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Fácil & Rápido
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Siga estes 3 passos simples para transformar qualquer partida em um replay interativo completo
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowImportGuide(!showImportGuide)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {showImportGuide ? (
              <><span>Recolher</span> <ChevronUp className="w-4 h-4" /></>
            ) : (
              <><span>Ver Passos</span> <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {showImportGuide && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2 relative group hover:border-purple-500/40 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-xs">
                    1
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-purple-400" />
                    Ajuste no PTCGL
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  No Pokémon TCG Live, abra as <strong>Configurações</strong> e desative a opção <em className="text-purple-300">"Ocultar IDs de cartas ao exportar"</em>. Isso garante que todas as cartas sejam mapeadas com precisão.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2 relative group hover:border-purple-500/40 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-xs">
                    2
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ClipboardCopy className="w-3.5 h-3.5 text-purple-400" />
                    Copiar Registro
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ao terminar a partida (tela de Vitória/Derrota ou menu de pausa), clique no botão <strong>"Copiar Registro de Batalha"</strong> (ou <em>Copy Battle Log</em>). O histórico completo irá para sua área de transferência.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2 relative group hover:border-purple-500/40 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-xs">
                    3
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Colar & Visualizar
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Clique no botão roxo <strong>"Importar Log do PTCGL"</strong> abaixo, cole o registro copiado e clique em Salvar. O replay interativo será criado automaticamente!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-slate-950/40 p-3 rounded-2xl border border-slate-850">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Quer experimentar agora sem abrir o jogo? Carregue uma partida gravada:</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const sample = parsePTCGLLog(SAMPLE_PT_LOG, currentMember.name || currentMember.nickname);
                    handleImportLog(sample, false);
                  }}
                  className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Carregar Partida de Demonstração
                </button>
                <button
                  onClick={() => setIsImporterOpen(true)}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Abrir Importador
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('replay')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeSubTab === 'replay'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Play className="w-4 h-4" />
            Replay Interativo do Tabuleiro
          </button>
          <button
            onClick={() => setActiveSubTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeSubTab === 'stats'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Estatísticas & Matchups
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeSubTab === 'history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Histórico ({logs.length})
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono hidden md:inline-block">
          {logs.length} partida(s) sincronizada(s)
        </span>
      </div>

      {/* Match Selector Strip (When viewing Replay) */}
      {activeSubTab === 'replay' && logs.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>Selecionar Partida para o Replay:</span>
            <span className="text-purple-400">Total: {logs.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {logs.map((match) => {
              const isSelected = match.id === selectedLogId;
              const isWin = match.result === 'win';
              return (
                <div
                  key={match.id}
                  onClick={() => setSelectedLogId(match.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all relative ${
                    isSelected
                      ? 'bg-slate-900 border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      isWin 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {isWin ? 'Vitória' : 'Derrota'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {match.wentFirst ? '1º' : '2º'} • {match.totalTurns} turnos
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PokemonCard name={match.playerDeckArchetype} size="xs" />
                      <div>
                        <div className="text-xs font-bold text-white truncate max-w-[85px]">{match.playerDeckArchetype}</div>
                        <div className="text-[10px] text-purple-400 truncate max-w-[85px]">{match.player1Name}</div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-500 font-mono">VS</span>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <div className="text-xs font-bold text-white truncate max-w-[85px]">{match.opponentDeckArchetype}</div>
                        <div className="text-[10px] text-rose-400 truncate max-w-[85px]">{match.player2Name}</div>
                      </div>
                      <PokemonCard name={match.opponentDeckArchetype} size="xs" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Areas based on selected sub-tab */}
      {activeSubTab === 'replay' && (
        selectedMatch ? (
          <BoardReplay match={selectedMatch} />
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
            Nenhuma partida selecionada.
          </div>
        )
      )}

      {activeSubTab === 'stats' && (
        <TrainerLogStats logs={logs} />
      )}

      {activeSubTab === 'history' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Histórico de Batalhas do TrainerLog</h3>
              <p className="text-xs text-slate-400">Todos os registros importados do Pokémon TCG Live</p>
            </div>
            <button
              onClick={() => setIsImporterOpen(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Importar Novo Log
            </button>
          </div>

          <div className="divide-y divide-slate-850">
            {logs.map((log) => {
              const isWin = log.result === 'win';
              return (
                <div
                  key={log.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-850/40 p-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3 items-center shrink-0">
                      <PokemonCard name={log.playerDeckArchetype} size="xs" />
                      <PokemonCard name={log.opponentDeckArchetype} size="xs" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          isWin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {isWin ? 'Vitória' : 'Derrota'}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {log.playerDeckArchetype} vs {log.opponentDeckArchetype}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {log.player1Name} vs {log.player2Name} • {log.wentFirst ? 'Iniciativa: 1º a Jogar' : 'Iniciativa: 2º a Jogar'} • {log.totalTurns} turnos
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <button
                      onClick={() => {
                        setSelectedLogId(log.id);
                        setActiveSubTab('replay');
                      }}
                      className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Ver Replay
                    </button>
                    <button
                      onClick={(e) => handleDeleteLog(log.id, e)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
                      title="Excluir log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log Importer Modal */}
      <LogImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImport={handleImportLog}
        currentMember={currentMember}
      />
    </div>
  );
}
