import React, { useState, useEffect } from 'react';
import { db, championshipPointsCol, addChampionshipPoints, deleteChampionshipPointRecord, purgeTestDataKeepCore } from '../lib/firebase';
import { doc, updateDoc, getDocs } from 'firebase/firestore';
import { Member, ChampionshipPointRecord } from '../types';
import { getRoleBadge } from '../utils';
import { 
  User, 
  Tag, 
  Flame, 
  Award, 
  ShieldAlert, 
  CheckCircle, 
  Save, 
  TrendingUp, 
  Trash2, 
  CheckCircle2, 
  AlertOctagon,
  Trophy,
  Target,
  Plus,
  Calendar,
  MapPin,
  X,
  Medal,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import PokemonSprite from './PokemonSprite';
import { POPULAR_POKEMON_AVATARS } from '../utils/pokemonSprites';
import ModalPortal from './ModalPortal';

interface MyProfileProps {
  currentMember: Member;
  setCurrentMember: (member: Member) => void;
  onMemberUpdated: () => void;
}

// Presets oficiais de Championship Points do Play! Pokémon
const CP_TIER_PRESETS: Record<string, Record<string, number>> = {
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

export default function MyProfile({ currentMember, setCurrentMember, onMemberUpdated }: MyProfileProps) {
  const [name, setName] = useState(currentMember.name || '');
  const [nickname, setNickname] = useState(currentMember.nickname || '');
  const [avatarSprite, setAvatarSprite] = useState(currentMember.avatarSprite || 'pikachu');
  const [role, setRole] = useState<'pokeball' | 'greatball' | 'ultraball' | 'masterball' | 'Premium ball'>(currentMember.role as any || 'pokeball');
  
  // CP & Score Goals
  const [officialPoints, setOfficialPoints] = useState<number>(currentMember.officialPoints || 0);
  const [cpTarget, setCpTarget] = useState<number>(currentMember.cpTarget || 100);
  const [cpRecords, setCpRecords] = useState<ChampionshipPointRecord[]>([]);
  const [loadingCp, setLoadingCp] = useState<boolean>(false);
  
  // Modal states
  const [showAddCpModal, setShowAddCpModal] = useState<boolean>(false);
  const [savingCp, setSavingCp] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // CP Form states
  const [formCpTournament, setFormCpTournament] = useState('');
  const [formCpTier, setFormCpTier] = useState('Copa de Liga');
  const [formCpPlacement, setFormCpPlacement] = useState('1º Lugar (Campeão)');
  const [formCpPoints, setFormCpPoints] = useState<number>(50);
  const [formCpDate, setFormCpDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCpLocation, setFormCpLocation] = useState('');
  const [formCpNotes, setFormCpNotes] = useState('');

  // Maintenance purge state
  const [purging, setPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load user's CP records from Firestore
  const loadMyCpRecords = async () => {
    try {
      setLoadingCp(true);
      const snap = await getDocs(championshipPointsCol);
      const userRecords: ChampionshipPointRecord[] = [];
      snap.forEach(d => {
        const item = { id: d.id, ...d.data() } as ChampionshipPointRecord;
        if (item.memberId === currentMember.id) {
          userRecords.push(item);
        }
      });
      userRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCpRecords(userRecords);
    } catch (e) {
      console.warn('Could not load CP records:', e);
    } finally {
      setLoadingCp(false);
    }
  };

  useEffect(() => {
    setName(currentMember.name || '');
    setNickname(currentMember.nickname || '');
    setAvatarSprite(currentMember.avatarSprite || 'pikachu');
    setRole(currentMember.role as any || 'pokeball');
    setOfficialPoints(currentMember.officialPoints || 0);
    setCpTarget(currentMember.cpTarget || 100);

    loadMyCpRecords();
  }, [currentMember.id]);

  // Update points when placement or tier changes in add CP modal
  const handleTierChange = (tier: string) => {
    setFormCpTier(tier);
    const presets = CP_TIER_PRESETS[tier];
    if (presets) {
      const firstPlace = Object.keys(presets)[0];
      setFormCpPlacement(firstPlace);
      setFormCpPoints(presets[firstPlace] || 0);
    }
  };

  const handlePlacementChange = (placement: string) => {
    setFormCpPlacement(placement);
    const presets = CP_TIER_PRESETS[formCpTier];
    if (presets && presets[placement] !== undefined) {
      setFormCpPoints(presets[placement]);
    }
  };

  const handleSaveCpRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCpTournament.trim()) {
      alert('Por favor, informe o nome do campeonato.');
      return;
    }

    try {
      setSavingCp(true);
      await addChampionshipPoints({
        memberId: currentMember.id,
        memberName: currentMember.name,
        avatarSprite: currentMember.avatarSprite,
        tournamentName: formCpTournament.trim(),
        tournamentTier: formCpTier,
        placement: formCpPlacement,
        points: Number(formCpPoints),
        date: formCpDate,
        location: formCpLocation.trim(),
        notes: formCpNotes.trim()
      });

      // Update local state
      const updatedPts = (officialPoints || 0) + Number(formCpPoints);
      setOfficialPoints(updatedPts);
      setCurrentMember({
        ...currentMember,
        officialPoints: updatedPts
      });

      setShowAddCpModal(false);
      setFormCpTournament('');
      setFormCpNotes('');
      await loadMyCpRecords();
      onMemberUpdated();
    } catch (err) {
      console.error('Error saving CP record:', err);
      alert('Erro ao salvar os pontos de campeonato.');
    } finally {
      setSavingCp(false);
    }
  };

  const handleDeleteCpRecord = async (record: ChampionshipPointRecord) => {
    if (!confirm(`Deseja remover este registro de ${record.points} CP (${record.tournamentName})?`)) return;

    try {
      await deleteChampionshipPointRecord(record.id, currentMember.id, record.points);
      const updatedPts = Math.max(0, (officialPoints || 0) - record.points);
      setOfficialPoints(updatedPts);
      setCurrentMember({
        ...currentMember,
        officialPoints: updatedPts
      });
      await loadMyCpRecords();
      onMemberUpdated();
    } catch (err) {
      console.error('Error deleting CP record:', err);
      alert('Erro ao excluir registro de CP.');
    }
  };

  const handleExecutePurge = async () => {
    try {
      setPurging(true);
      setShowConfirmModal(false);
      const res = await purgeTestDataKeepCore();
      setPurgeSuccess(`Limpeza concluída! ${res.deletedMatches} partidas, ${res.deletedTournaments} campeonatos, ${res.deletedLoans} empréstimos e ${res.deletedLogs} logs limpos.`);
      onMemberUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setPurging(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      if (!name.trim()) throw new Error('O nome não pode ficar vazio.');
      if (!nickname.trim()) throw new Error('O apelido (nickname) não pode ficar vazio.');

      const memberRef = doc(db, 'members', currentMember.id);
      const updatedFields = {
        name: name.trim(),
        nickname: nickname.trim().replace(/\s+/g, ''),
        avatarSprite: avatarSprite.trim().toLowerCase() || 'pikachu',
        role: role,
        officialPoints: Number(officialPoints) || 0,
        cpTarget: Number(cpTarget) || 100
      };

      await updateDoc(memberRef, updatedFields);

      // Sync local context in App state
      const updatedMember = { ...currentMember, ...updatedFields };
      setCurrentMember(updatedMember);
      onMemberUpdated();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Erro ao salvar alterações do perfil.');
    } finally {
      setSaving(false);
    }
  };

  const currentCp = officialPoints || 0;
  const targetCp = Math.max(1, cpTarget || 100);
  const cpProgressPercent = Math.min(100, Math.round((currentCp / targetCp) * 100));

  return (
    <div className="space-y-8" id="profile-management-view">
      {/* Page Header */}
      <div className="border-b border-slate-850 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span> Meu Perfil & Pontuação Oficial
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie seus dados pessoais, avatar Pokémon animado e acompanhe sua <strong>meta de pontuação em Championship Points (CP)</strong>.
          </p>
        </div>

        {/* Quick CP Badge */}
        <div className="bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-slate-900 border border-amber-500/40 px-4 py-2.5 rounded-2xl flex items-center gap-3 shrink-0 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider">Pontuação CP Acumulada</div>
            <div className="text-xl font-black text-white font-mono flex items-baseline gap-1">
              <span>{currentCp}</span>
              <span className="text-xs text-amber-400 font-bold">CP</span>
              <span className="text-slate-500 text-xs font-normal">/ {targetCp} meta</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: CP & SCORE GOAL MODULE (EXPLICIT USER REQUEST) */}
      <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6" id="my-profile-cp-module">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Minha Meta de Pontuação (Championship Points - CP)</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pontos Play! Pokémon
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Não é uma meta de qualidade subjetiva — é a sua meta numérica de pontos oficiais acumulados em torneios e copas.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-open-add-cp-modal"
            onClick={() => setShowAddCpModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Lançar Pontos de Torneio (CP)</span>
          </button>
        </div>

        {/* Progress Bar & Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Saldo de Pontos */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 space-y-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Pontos Atuais</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono flex items-baseline gap-1">
              <span>{currentCp}</span>
              <span className="text-xs text-amber-300/80 font-bold">CP Oficiais</span>
            </div>
            <p className="text-[11px] text-slate-500">Acumulados em Copas, Desafios e Regionais</p>
          </div>

          {/* Card 2: Meta de Pontuação */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 space-y-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Meta Pessoal de Pontos</span>
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
              <span>{targetCp}</span>
              <span className="text-xs text-purple-300 font-bold">CP Objetivo</span>
            </div>
            <p className="text-[11px] text-slate-500">Defina o seu objetivo para a temporada</p>
          </div>

          {/* Card 3: Progresso e Vaga */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 space-y-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Progresso da Meta</span>
              <Medal className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {cpProgressPercent}%
            </div>
            <p className="text-[11px] text-slate-500">
              {currentCp >= targetCp ? '🎉 Meta alcançada com sucesso!' : `Faltam ${Math.max(0, targetCp - currentCp)} CP para bater a meta`}
            </p>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Barra de Evolução da Pontuação CP
            </span>
            <span className="text-amber-400 font-mono font-bold">{currentCp} / {targetCp} CP ({cpProgressPercent}%)</span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${cpProgressPercent}%` }}
            />
          </div>
        </div>

        {/* History of CP Records for this user */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Medal className="w-4 h-4 text-amber-400" />
              Histórico dos Meus Pontos Conquistados ({cpRecords.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Sincronizado no perfil</span>
          </div>

          {loadingCp ? (
            <div className="p-6 text-center text-xs text-slate-500">Carregando histórico de pontos...</div>
          ) : cpRecords.length === 0 ? (
            <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-2">
              <p className="text-xs text-slate-400">Você ainda não possui pontos CP lançados individualmente.</p>
              <button
                type="button"
                onClick={() => setShowAddCpModal(true)}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                Clique aqui para registrar sua primeira colocação em torneio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {cpRecords.map((rec) => (
                <div 
                  key={rec.id}
                  className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 p-3.5 rounded-xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                        {rec.tournamentTier}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{rec.tournamentName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>🏆 {rec.placement}</span>
                      <span>•</span>
                      <span>📅 {rec.date}</span>
                      {rec.location && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[100px]">📍 {rec.location}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 rounded-lg text-amber-400 font-black text-xs font-mono">
                      +{rec.points} CP
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCpRecord(rec)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Excluir este lançamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PROFILE INFORMATION & AVATAR EDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form & Avatar Update */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6" id="profile-form">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-3">
              <User className="w-4 h-4 text-purple-400" />
              Informações Gerais do Treinador
            </h3>

            {error && (
              <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl flex items-start gap-3 text-xs animate-shake" id="profile-save-error">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-start gap-3 text-xs" id="profile-save-success">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5 animate-bounce" />
                <span>Alterações salvas com sucesso no Firestore! Perfil sincronizado.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    id="profile-edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-slate-950/60 border border-slate-850 focus:border-purple-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Nickname */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Apelido (Nick Competitivo)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    id="profile-edit-nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.replace(/\s+/g, ''))}
                    placeholder="Ex: SpiritsBoss"
                    className="w-full bg-slate-950/60 border border-slate-850 focus:border-purple-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Score & Points Configuration in Profile Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-850 pt-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Pontos Oficiais Atuais (CP)
                </label>
                <input 
                  type="number" 
                  min="0"
                  id="profile-edit-official-points"
                  value={officialPoints}
                  onChange={(e) => setOfficialPoints(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-950/60 border border-slate-850 focus:border-purple-500/50 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-amber-400 focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-slate-500 font-mono">Ajuste manual do total de Championship Points do Play! Pokémon.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  Meta Pessoal de Pontuação (CP)
                </label>
                <input 
                  type="number" 
                  min="1"
                  id="profile-edit-cp-target"
                  value={cpTarget}
                  onChange={(e) => setCpTarget(Number(e.target.value) || 100)}
                  placeholder="100"
                  className="w-full bg-slate-950/60 border border-slate-850 focus:border-purple-500/50 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-purple-300 focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-slate-500 font-mono">Defina quantos pontos CP deseja alcançar nesta temporada.</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-850 pt-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-purple-400" />
                    Escolha seu Avatar Pokémon
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Selecione um dos favoritos da equipe ou digite o nome de qualquer Pokémon em inglês.
                  </p>
                </div>
                <div className="w-full sm:w-auto">
                  <input 
                    type="text" 
                    id="profile-edit-avatar"
                    value={avatarSprite}
                    onChange={(e) => setAvatarSprite(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="Outro: ex. eevee, mew, dialga..."
                    className="w-full sm:w-56 bg-slate-950/80 border border-slate-800 focus:border-purple-500 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Avatar Preset Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-950/50 rounded-xl border border-slate-850/80">
                {POPULAR_POKEMON_AVATARS.map(pkmn => {
                  const isSelected = avatarSprite.toLowerCase() === pkmn.id;
                  return (
                    <button
                      key={pkmn.id}
                      type="button"
                      id={`avatar-option-${pkmn.id}`}
                      onClick={() => setAvatarSprite(pkmn.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer border ${
                        isSelected 
                          ? 'bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/50 scale-105' 
                          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                      title={pkmn.name}
                    >
                      <PokemonSprite name={pkmn.id} size="sm" className="w-9 h-9" />
                      <span className={`text-[9px] mt-1 truncate max-w-full font-medium ${isSelected ? 'text-purple-300 font-bold' : 'text-slate-400'}`}>
                        {pkmn.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Rank Selector */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meu Cargo / Nível na Spirits</label>
                <select 
                  id="profile-edit-role"
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-850 focus:border-purple-500/50 rounded-xl py-2.5 px-3 text-xs font-medium text-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="pokeball">🔴 Level Pokéball (Iniciante)</option>
                  <option value="greatball">🔵 Level Greatball (Regular)</option>
                  <option value="ultraball">⚫ Level Ultraball (Avançado)</option>
                  <option value="masterball">🟣 Level Masterball (Elite)</option>
                  <option value="Premium ball">✨ Level Premium (Staff / Lenda)</option>
                </select>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 shrink-0 shadow-lg">
                <PokemonSprite name={avatarSprite || 'pikachu'} size="lg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1">{getRoleBadge(role)}</div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Visualização do Avatar Ativo</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Sprite animado para <strong className="text-purple-400">@{nickname || 'treinador'}</strong> com <strong className="text-amber-400">{officialPoints} CP</strong>.
                </p>
              </div>
            </div>

            <button
              type="submit"
              id="profile-save-btn"
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-600 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/30 border border-purple-500/20"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar e Atualizar Meu Perfil
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Roles & Maintenance Card */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6" id="scoring-rules-guide">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-3 mb-4">
              <Award className="w-4.5 h-4.5 text-amber-400" />
              Tabela Oficial Play! Pokémon (CP)
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Os pontos abaixo são creditados para classificação oficial e convite ao Mundial (Worlds):
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>🏆 Copa de Liga (Cup)</span>
                  <span className="font-mono">Até 50 CP</span>
                </div>
                <div className="text-[10px] text-slate-400">1º: 50 CP • 2º: 40 CP • Top 4: 32 CP • Top 8: 25 CP</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs space-y-1">
                <div className="font-bold text-purple-400 flex items-center justify-between">
                  <span>🥊 Desafio de Liga (Challenge)</span>
                  <span className="font-mono">Até 15 CP</span>
                </div>
                <div className="text-[10px] text-slate-400">1º: 15 CP • 2º: 12 CP • Top 4: 10 CP • Top 8: 8 CP</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs space-y-1">
                <div className="font-bold text-emerald-400 flex items-center justify-between">
                  <span>🌎 Campeonato Regional</span>
                  <span className="font-mono">Até 200 CP</span>
                </div>
                <div className="text-[10px] text-slate-400">1º: 200 CP • 2º: 160 CP • Top 4: 130 CP • Top 8: 100 CP</div>
              </div>
            </div>
          </div>

          {/* Zona de Manutenção / Modo Produção Real */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-3 mb-4">
              <Trash2 className="w-4.5 h-4.5 text-rose-400" />
              Limpeza Geral de Testes
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Zera dados de testes mantendo todos os <strong>Baralhos (Decks)</strong> cadastrados intactos.
            </p>

            {purgeSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{purgeSuccess}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={purging}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>{purging ? 'Limpando dados de teste...' : '🧹 Limpar Dados de Teste (Manter Decks)'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL 1: LANÇAR PONTOS CP (USANDO MODALPORTAL PARA RESPONSIVIDADE PERFEITA EM QUALQUER APARELHO) */}
      <ModalPortal isOpen={showAddCpModal} onClose={() => setShowAddCpModal(false)}>
        <div className="bg-slate-900 border border-amber-500/40 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden my-auto animate-fade-in">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Lançar Pontos Oficiais de Torneio (CP)</h3>
                <p className="text-xs text-slate-400">Registrar no seu perfil de {currentMember.name}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddCpModal(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body with auto-scroll */}
          <form onSubmit={handleSaveCpRecord} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              
              {/* Tournament Tier */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Tipo de Torneio Oficial:</label>
                <select
                  value={formCpTier}
                  onChange={(e) => handleTierChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-xs outline-none font-semibold cursor-pointer"
                >
                  <option value="Copa de Liga">🏆 Copa de Liga (Até 50 CP)</option>
                  <option value="Desafio de Liga">🥊 Desafio de Liga (Até 15 CP)</option>
                  <option value="Regional">🌎 Campeonato Regional (Até 200 CP)</option>
                  <option value="Special Event">✨ Special Event (Até 200 CP)</option>
                  <option value="Internacional">🌐 Campeonato Internacional (Até 500 CP)</option>
                </select>
              </div>

              {/* Placement */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Sua Colocação no Torneio:</label>
                <select
                  value={formCpPlacement}
                  onChange={(e) => handlePlacementChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-xs outline-none font-semibold cursor-pointer"
                >
                  {CP_TIER_PRESETS[formCpTier] && Object.keys(CP_TIER_PRESETS[formCpTier]).map((place) => (
                    <option key={place} value={place}>
                      {place} — (+{CP_TIER_PRESETS[formCpTier][place]} CP)
                    </option>
                  ))}
                  <option value="Outra Colocação">Outra Colocação Personalizada</option>
                </select>
              </div>

              {/* Points Value */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-amber-400">Pontos CP Conquistados:</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formCpPoints}
                  onChange={(e) => setFormCpPoints(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-amber-400 font-mono font-bold text-sm outline-none"
                />
              </div>

              {/* Tournament Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Nome do Torneio:</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Copa de Liga Caverna do Dragão"
                  value={formCpTournament}
                  onChange={(e) => setFormCpTournament(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-xs outline-none"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Data:</label>
                  <input
                    type="date"
                    required
                    value={formCpDate}
                    onChange={(e) => setFormCpDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-xs outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Loja / Cidade:</label>
                  <input
                    type="text"
                    placeholder="ex: Bauru - SP"
                    value={formCpLocation}
                    onChange={(e) => setFormCpLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Anotações / Deck Usado (Opcional):</label>
                <input
                  type="text"
                  placeholder="ex: Joguei de Dragapult ex, 4 vitórias e 1 empate no suíço"
                  value={formCpNotes}
                  onChange={(e) => setFormCpNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-xs outline-none"
                />
              </div>

            </div>

            {/* Pinned Sticky Footer */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddCpModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCp}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-350 transition-all shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
              >
                {savingCp ? 'Salvando...' : 'Salvar e Creditar Pontos'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* MODAL 2: CONFIRMAÇÃO DA LIMPEZA DE TESTES */}
      <ModalPortal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <div className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 my-auto animate-fade-in">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertOctagon className="w-6 h-6 shrink-0" />
            <h4 className="text-base font-bold text-white">Confirmar Limpeza de Testes</h4>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Esta ação apagará permanentemente todos os registros de <strong>partidas</strong>, <strong>campeonatos</strong> e <strong>empréstimos de teste</strong>, zerando as estatísticas para começar do zero.
          </p>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="text-emerald-400 font-bold">✅ O que será MANTIDO:</div>
            <div>• Todos os Baralhos cadastrados (100% preservados)</div>
            <div>• Todos os Membros do Time & Seu Perfil</div>
            <div>• Toda a Coleção de Cartas</div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecutePurge}
              disabled={purging}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/30 cursor-pointer disabled:opacity-50"
            >
              {purging ? 'Limpando...' : 'Confirmar e Limpar'}
            </button>
          </div>
        </div>
      </ModalPortal>

    </div>
  );
}
