import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Member } from '../types';
import { getRoleBadge } from '../utils';
import { 
  User, 
  Tag, 
  Flame, 
  Award, 
  ShieldAlert, 
  CheckCircle, 
  Lock, 
  Unlock,
  Save,
  HelpCircle,
  TrendingUp,
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  Swords,
  Trophy
} from 'lucide-react';
import PokemonSprite from './PokemonSprite';
import { POPULAR_POKEMON_AVATARS, PokemonAvatarOption } from '../utils/pokemonSprites';

interface MyProfileProps {
  currentMember: Member;
  setCurrentMember: (member: Member) => void;
  onMemberUpdated: () => void;
}

export default function MyProfile({ currentMember, setCurrentMember, onMemberUpdated }: MyProfileProps) {
  const [name, setName] = useState(currentMember.name || '');
  const [nickname, setNickname] = useState(currentMember.nickname || '');
  const [avatarSprite, setAvatarSprite] = useState(currentMember.avatarSprite || 'pikachu');
  const [role, setRole] = useState<'pokeball' | 'greatball' | 'ultraball' | 'masterball' | 'Premium ball'>(currentMember.role as any || 'pokeball');
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Update form values if currentMember changes (e.g. from switcher)
  useEffect(() => {
    setName(currentMember.name || '');
    setNickname(currentMember.nickname || '');
    setAvatarSprite(currentMember.avatarSprite || 'pikachu');
    setRole(currentMember.role as any || 'pokeball');
  }, [currentMember]);

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
        role: role
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

  // Access control mapping for presentation
  const getRoleRankValue = (r: string): number => {
    const norm = r.toLowerCase().replace(/\s+/g, '');
    if (norm === 'pokeball') return 1;
    if (norm === 'greatball') return 2;
    if (norm === 'ultraball') return 3;
    if (norm === 'masterball') return 4;
    if (norm === 'premiumball') return 5;
    return 1;
  };

  const currentRankVal = getRoleRankValue(role);

  const levelsList = [
    { id: 'pokeball', label: 'Level Pokéball', points: '0 - 29 pts', desc: 'Iniciante competitivo. Classificação inicial de pontuação ao entrar no Spirits.', color: 'border-red-500/20 text-red-450 bg-red-950/10' },
    { id: 'greatball', label: 'Level Greatball', points: '30 - 59 pts', desc: 'Membro regular. Participação ativa em torneios internos e treinos.', color: 'border-blue-500/20 text-blue-400 bg-blue-950/10' },
    { id: 'ultraball', label: 'Level Ultraball', points: '60 - 99 pts', desc: 'Competitivo core. Alto engajamento, conquistas de vitórias consistentes.', color: 'border-yellow-500/30 text-yellow-400 bg-slate-900' },
    { id: 'masterball', label: 'Level Masterball', points: '100 - 149 pts', desc: 'Elite Pro. Jogador de alto nível técnico com alto saldo de vitórias.', color: 'border-purple-500/30 text-purple-400 bg-purple-950/10' },
    { id: 'premiumball', label: 'Level Premium ball', points: '150+ pts', desc: 'Staff / Lenda. Administradores e líderes do portal competitivo.', color: 'border-amber-500/50 text-amber-300 bg-slate-900' },
  ];

  return (
    <div className="space-y-8" id="profile-management-view">
      {/* Page Header */}
      <div className="border-b border-slate-850 pb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>⚙️</span> Configurações do Meu Perfil
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie suas informações de jogador, selecione seu Pokémon de estimação como avatar animado e acompanhe sua evolução de pontuação interna.
        </p>
      </div>

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

              {/* Simulation Rank Selector */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meu Level / Evolução Competitiva</label>
                <select 
                  id="profile-edit-role"
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-850 focus:border-purple-500/50 rounded-xl py-2.5 px-3 text-xs font-medium text-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="pokeball">🔴 Level Pokéball (0 - 29 pts)</option>
                  <option value="greatball">🔵 Level Greatball (30 - 59 pts)</option>
                  <option value="ultraball">⚫ Level Ultraball (60 - 99 pts)</option>
                  <option value="masterball">🟣 Level Masterball (100 - 149 pts)</option>
                  <option value="Premium ball">✨ Level Premium (150+ pts ou Staff)</option>
                </select>
                <p className="text-[10px] text-slate-550 font-mono mt-1">Sinaliza seu progresso acumulado em partidas oficiais e eventos internos do time.</p>
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
                  Sprite animado para <strong className="text-purple-400">@{nickname || 'treinador'}</strong>. Caso digite um nome inválido, o sistema utilizará um Pokémon Substituto como padrão temporário.
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

        {/* Right Column: Roles Access & Perks Card */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6" id="access-level-guide">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-3 mb-4">
              <Award className="w-4.5 h-4.5 text-purple-400" />
              Evolução & Classificação Interna
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Os níveis de Pokébola indicam a pontuação competitiva e o engajamento acumulado de cada mestre no Spirits TCG. Eles **não limitam o uso de recursos do portal**, servindo puramente para classificação de progresso:
            </p>

            <div className="space-y-4">
              {levelsList.map((lvl) => {
                const isActive = role === lvl.id;
                return (
                  <div 
                    key={lvl.id}
                    className={`p-3.5 rounded-xl border flex flex-col gap-1 transition-all ${
                      isActive 
                        ? 'bg-purple-950/20 border-purple-500/40 text-slate-100 ring-1 ring-purple-500/20' 
                        : 'bg-slate-950/20 border-slate-850/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold leading-none">{lvl.label}</span>
                      <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded-full">{lvl.points}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {lvl.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-850 text-[10px] text-slate-455 leading-relaxed flex gap-2.5">
              <TrendingUp className="w-5 h-5 text-purple-400 shrink-0" />
              <span>
                <strong>Como pontuar:</strong> Cada vitória em partidas do time ou torneios oficiais soma **3 pontos**, empates somam **1 ponto**, e derrotas somam **0 pontos**.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
