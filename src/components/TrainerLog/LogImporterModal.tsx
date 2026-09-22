import React, { useState, useEffect } from 'react';
import { parsePTCGLLog, SAMPLE_PT_LOG, SAMPLE_EN_LOG } from '../../utils/ptcglParser';
import { TrainerLogMatch, Member } from '../../types';
import PokemonCard from '../PokemonCard';
import { 
  X, 
  Upload, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  AlertCircle,
  Swords,
  Trophy,
  ArrowRight,
  Clipboard,
  Info,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface LogImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsedMatch: TrainerLogMatch, alsoSyncToTeamMatches: boolean) => Promise<void>;
  currentMember?: Member;
}

export default function LogImporterModal({
  isOpen,
  onClose,
  onImport,
  currentMember
}: LogImporterModalProps) {
  const [rawText, setRawText] = useState('');
  const [showHelp, setShowHelp] = useState(true); // Open by default to guide user
  const [previewMatch, setPreviewMatch] = useState<TrainerLogMatch | null>(null);
  const [syncToTeam, setSyncToTeam] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Auto-parse on text change
  useEffect(() => {
    if (!rawText.trim()) {
      setPreviewMatch(null);
      setErrorMsg('');
      return;
    }

    try {
      const parsed = parsePTCGLLog(rawText, currentMember?.name || currentMember?.nickname);
      setPreviewMatch(parsed);
      setErrorMsg('');
    } catch (err) {
      console.error('Error parsing PTCGL log:', err);
      setErrorMsg('Não foi possível interpretar este log. Verifique se copiou o registro de batalha completo do Pokémon TCG Live.');
    }
  }, [rawText, currentMember]);

  if (!isOpen) return null;

  const handleLoadSample = (type: 'pt' | 'en') => {
    if (type === 'pt') {
      setRawText(SAMPLE_PT_LOG);
    } else {
      setRawText(SAMPLE_EN_LOG);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRawText(text);
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 3000);
        }
      } else {
        alert('Seu navegador não suporta colar automático. Use o atalho Ctrl+V dentro do campo de texto.');
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      alert('Permissão de colar negada. Por favor, clique na caixa de texto e pressione Ctrl+V.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewMatch) return;

    try {
      setIsSubmitting(true);
      await onImport(previewMatch, syncToTeam);
      onClose();
    } catch (err) {
      console.error('Failed to import log:', err);
      setErrorMsg('Erro ao salvar o log. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-purple-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Importar Registro do PTCGL
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  TrainerLog
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Gere o replay interativo completo, com imagens de cartas e estatísticas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Step-by-Step Instructions Banner */}
          <div className="bg-slate-950/70 border border-purple-500/30 rounded-2xl p-4 space-y-3">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowHelp(!showHelp)}
            >
              <div className="flex items-center gap-2 text-xs font-black text-purple-300 uppercase tracking-wider">
                <Info className="w-4 h-4 text-purple-400" />
                <span>Como Exportar do Pokémon TCG Live em 3 Passos</span>
              </div>
              <button 
                type="button" 
                className="text-slate-400 hover:text-white transition-colors"
              >
                {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showHelp && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-400">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center text-[10px]">1</span>
                    Ajuste no Jogo
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Nas <strong>Configurações</strong> do PTCGL, desmarque <em>"Ocultar IDs de cartas ao exportar"</em>.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-400">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center text-[10px]">2</span>
                    Copiar Registro
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Na tela final da partida, clique no botão <strong>"Copiar Registro de Batalha"</strong>.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-400">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center text-[10px]">3</span>
                    Colar e Salvar
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Clique em <strong>"Colar da Área de Transferência"</strong> abaixo e salve!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Textarea for Raw Log with Action Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Registro de Batalha (Battle Log):</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Colar texto copiado"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Colar da Área de Transferência</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadSample('pt')}
                  className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" /> Testar Exemplo
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Cole aqui o registro copiado do Pokémon TCG Live...\nExemplo:\nSetup\nFelipe Wilks jogou Cara ou Coroa...\nTurno # 1 - Turno de Felipe Wilks...`}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-2xl p-4 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none resize-y"
              />
              {copiedNotification && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1">
                  <Check className="w-3 h-3" /> Log Colado!
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-500/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Parsed Preview with Authentic Pokemon Cards */}
          {previewMatch && (
            <div className="bg-slate-950/80 border border-purple-500/40 rounded-2xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Batalha Reconhecida com Sucesso
                </span>
                <span className={`text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider ${
                  previewMatch.result === 'win' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {previewMatch.result === 'win' ? 'VITÓRIA' : 'DERROTA'}
                </span>
              </div>

              {/* Matchup with Cards Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Player 1 card view */}
                <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-purple-500/30">
                  <PokemonCard
                    name={previewMatch.playerDeckArchetype}
                    size="sm"
                    showInspectButton={true}
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Você</span>
                    <div className="text-sm font-black text-white truncate">{previewMatch.player1Name}</div>
                    <div className="text-xs font-bold text-purple-300 truncate">{previewMatch.playerDeckArchetype}</div>
                  </div>
                </div>

                {/* Player 2 card view */}
                <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-rose-500/30">
                  <PokemonCard
                    name={previewMatch.opponentDeckArchetype}
                    size="sm"
                    showInspectButton={true}
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Oponente</span>
                    <div className="text-sm font-black text-white truncate">{previewMatch.player2Name}</div>
                    <div className="text-xs font-bold text-rose-300 truncate">{previewMatch.opponentDeckArchetype}</div>
                  </div>
                </div>
              </div>

              {/* Match Stats summary */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-850">
                <span>Iniciativa: <strong className="text-white">{previewMatch.wentFirst ? '1º a Jogar' : '2º a Jogar'}</strong></span>
                <span>Duração: <strong className="text-white">{previewMatch.totalTurns} Turnos</strong></span>
                <span>Prêmios Recolhidos: <strong className="text-emerald-400 font-mono">{previewMatch.p1PrizesTaken}</strong> - <strong className="text-rose-400 font-mono">{previewMatch.p2PrizesTaken}</strong></span>
              </div>
            </div>
          )}

          {/* Sync to Team Matches option */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-400" />
                Registrar no Histórico Oficial de Partidas do Time
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Atualiza vitórias/derrotas na equipe e sincroniza esta partida com a aba Partidas.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={syncToTeam}
                onChange={(e) => setSyncToTeam(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!previewMatch || isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <span>Salvar no TrainerLog</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
