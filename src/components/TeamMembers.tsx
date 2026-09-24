import React, { useState, useEffect } from 'react';
import { db, membersCol, matchesCol } from '../lib/firebase';
import { getDocs, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Member, MatchRecord } from '../types';
import { getRoleBadge } from '../utils';
import { 
  PlusCircle, 
  X, 
  Sparkles, 
  Trophy, 
  Flame, 
  Calendar, 
  UserPlus, 
  ShieldCheck, 
  Heart,
  ChevronRight,
  UserCheck,
  Settings,
  Trash2
} from 'lucide-react';
import PokemonSprite from './PokemonSprite';
import PokemonLoader from './PokemonLoader';

interface TeamMembersProps {
  currentMember: Member;
  setCurrentMember: (member: Member) => void;
  onMemberUpdated: () => void;
  currentUserEmail?: string;
}

export default function TeamMembers({ currentMember, setCurrentMember, onMemberUpdated, currentUserEmail = '' }: TeamMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Permission check
  const hasStaffPermission = currentMember.role === 'Premium ball' || currentUserEmail === 'felipewilks@gmail.com';

  // Form modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Custom Role switcher modal for staff
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<'pokeball' | 'greatball' | 'ultraball' | 'masterball' | 'Premium ball'>('pokeball');

  // Add Teammate form states
  const [name, setName] = useState('');
  const [role, setRole] = useState<'pokeball' | 'greatball' | 'ultraball' | 'masterball' | 'Premium ball'>('pokeball');
  const [nickname, setNickname] = useState('');
  const [avatarSprite, setAvatarSprite] = useState('pikachu');
  const [registering, setRegistering] = useState(false);

  // Edit form states
  const [editNickname, setEditNickname] = useState(currentMember.nickname || '');
  const [editAvatarSprite, setEditAvatarSprite] = useState(currentMember.avatarSprite || 'pikachu');

  // Deletion state variables
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Popular representative avatar suggestions
  const avatarOptions = [
    { name: 'Pikachu', id: 'pikachu' },
    { name: 'Charizard', id: 'charizard' },
    { name: 'Gengar', id: 'gengar' },
    { name: 'Mewtwo', id: 'mewtwo' },
    { name: 'Garchomp', id: 'garchomp' },
    { name: 'Snorlax', id: 'snorlax' },
    { name: 'Gardevoir', id: 'gardevoir' },
    { name: 'Alakazam', id: 'alakazam' },
    { name: 'Scizor', id: 'scizor' },
    { name: 'Lucario', id: 'lucario' },
    { name: 'Miraidon', id: 'miraidon' },
    { name: 'Ogerpon', id: 'teal-mask-ogerpon' },
    { name: 'Roaring Moon', id: 'roaring-moon' }
  ];

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(membersCol);
      const rawList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Member));

      // Automatically clean up testing members specified by user
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

      const cleanList: Member[] = [];
      for (const member of rawList) {
        const isTest = testNames.includes(member.name) || 
                       (member.nickname && testNicknames.includes(member.nickname));
        if (isTest) {
          try {
            await deleteDoc(doc(db, 'members', member.id));
            console.log(`Deleted testing member: ${member.name}`);
          } catch (e) {
            console.error(`Failed to auto-delete test member ${member.name}:`, e);
          }
        } else {
          cleanList.push(member);
        }
      }

      // Fetch all matches to compute stats dynamically
      const matchesSnap = await getDocs(matchesCol);
      const allMatches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as MatchRecord));

      const computedMembers = cleanList.map(member => {
        let wins = 0;
        let losses = 0;
        let draws = 0;

        allMatches.forEach(match => {
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

      // Sort by total wins
      computedMembers.sort((a, b) => b.wins - a.wins);
      setMembers(computedMembers);
    } catch (err) {
      console.error('Error fetching members list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Preencha pelo menos o nome!');
      return;
    }

    try {
      setRegistering(true);
      const newId = `member-${Date.now()}`;
      
      const newMember: Member = {
        id: newId,
        name: name.trim(),
        role: role,
        nickname: nickname.trim() || undefined,
        avatarSprite: avatarSprite.trim().toLowerCase() || 'pikachu',
        wins: 0,
        losses: 0,
        draws: 0,
        favoriteCard: 'Charizard ex',
        favoriteCardImage: 'https://images.pokemontcg.io/sv3/125_hires.png',
        joinDate: new Date().toISOString().split('T')[0]
      };

      await setDoc(doc(db, 'members', newId), newMember);
      setMembers(prev => [...prev, newMember].sort((a, b) => b.wins - a.wins));
      setShowAddModal(false);

      // Reset fields
      setName('');
      setNickname('');
      setAvatarSprite('pikachu');

      alert(`Boas-vindas ao novo Spirits member: ${newMember.name}!`);
    } catch (err) {
      console.error('Error registering member:', err);
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const pRef = doc(db, 'members', currentMember.id);
      const updatedFields = {
        nickname: editNickname.trim() || undefined,
        avatarSprite: editAvatarSprite.trim().toLowerCase() || 'pikachu'
      };

      await updateDoc(pRef, updatedFields);
      
      // Update active user context
      const updatedMember = { ...currentMember, ...updatedFields };
      setCurrentMember(updatedMember);
      setShowEditModal(false);
      
      // Refresh list
      fetchMembers();
      onMemberUpdated();
      alert('Seu perfil de jogador foi atualizado com sucesso!');
    } catch (err) {
      console.error('Error updating player profile:', err);
    }
  };

  const handleUpdateMemberRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const pRef = doc(db, 'members', editingMember.id);
      await updateDoc(pRef, { role: selectedNewRole });

      // If we updated ourselves, sync active user context
      if (editingMember.id === currentMember.id) {
        setCurrentMember({ ...currentMember, role: selectedNewRole });
      }

      setShowRoleModal(false);
      setEditingMember(null);
      fetchMembers();
      onMemberUpdated();
      alert(`Cargo de ${editingMember.name} atualizado para ${selectedNewRole}!`);
    } catch (err) {
      console.error('Error updating member role:', err);
    }
  };

  const handleDeleteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToDelete) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'members', memberToDelete.id));
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
      await fetchMembers();
      alert('Membro excluído com sucesso!');
    } catch (err) {
      console.error('Error deleting member:', err);
      alert('Erro ao excluir membro.');
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = (m: Member): string => {
    const total = m.wins + m.losses + m.draws;
    if (total === 0) return '0.0';
    return ((m.wins / total) * 105).toFixed(1); // Win share % scaling
  };

  return (
    <div className="space-y-8" id="members-roster-view">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-850 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>👥</span> Roster de Jogadores Spirits
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Conheça o elenco competitivo da Spirits. Ajuste seu avatar favorito e acompanhe o desempenho dos principais mestres Pokémon do time.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            id="btn-edit-my-profile"
            onClick={() => {
              setEditNickname(currentMember.nickname || '');
              setEditAvatarSprite(currentMember.avatarSprite || 'pikachu');
              setShowEditModal(true);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-sm flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
          >
            <UserCheck className="w-5 h-5 text-purple-400" /> Editar Meu Perfil
          </button>
          
          <button
            id="btn-register-new-member"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-950/40 cursor-pointer transition-all"
          >
            <UserPlus className="w-5 h-5" /> Adicionar Novo Membro
          </button>
        </div>
      </div>

      {/* Roster list */}
      {loading ? (
        <PokemonLoader 
          pokemon="lucario" 
          title="Convocando conselho dos Spirits..." 
          subtitle="Carregando mestres e classificações do time..." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="roster-grid">
          {members.map((mem, idx) => (
            <div 
              key={mem.id} 
              className={`bg-slate-900/60 border rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                mem.id === currentMember.id 
                  ? 'border-purple-500 shadow-xl shadow-purple-950/10 bg-gradient-to-br from-slate-900/80 via-indigo-950/10 to-purple-950/20' 
                  : 'border-slate-800/80 hover:border-purple-500/30'
              }`}
              id={`roster-card-${mem.id}`}
            >
              {/* Positional ranking flag */}
              <div className="absolute top-3 right-4 font-mono text-slate-700 text-3xl font-extrabold pointer-events-none">
                #{idx + 1}
              </div>

              <div className="space-y-5">
                {/* Avatar and name info */}
                <div className="flex items-center gap-4">
                  <div className="bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                    <PokemonSprite name={mem.avatarSprite} size="md" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-extrabold text-base">{mem.name}</span>
                      {mem.id === currentMember.id && (
                        <span className="text-[9px] bg-purple-600 text-white font-mono font-bold px-1 py-0.5 rounded">Você</span>
                      )}
                    </div>
                    <p className="text-xs text-purple-400 font-semibold mt-0.5">{mem.nickname ? `@${mem.nickname}` : 'Sem apelido'}</p>
                    
                    {/* Role tag & edit */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                      {getRoleBadge(mem.role)}
                      
                      {hasStaffPermission && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMember(mem);
                              setSelectedNewRole(mem.role as any);
                              setShowRoleModal(true);
                            }}
                            className="text-[9px] text-purple-400 hover:text-purple-300 font-bold transition-all flex items-center gap-0.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            <Settings className="w-3 h-3 text-purple-400" /> Level
                          </button>

                          {mem.id !== currentMember.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setMemberToDelete(mem);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-[9px] text-rose-400 hover:text-rose-300 font-bold transition-all flex items-center gap-0.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" /> Excluir
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score breakdown stats with Official CP */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-slate-850/80 text-center">
                  <div>
                    <div className="text-[9px] text-amber-400 uppercase font-bold">Oficial CP</div>
                    <div className="text-xs font-black text-amber-300 font-mono mt-0.5">{mem.officialPoints || 0} pts</div>
                  </div>
                  <div className="border-l border-slate-850">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Vitórias</div>
                    <div className="text-xs font-extrabold text-emerald-400 font-mono mt-0.5">{mem.wins}</div>
                  </div>
                  <div className="border-l border-slate-850">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Derrotas</div>
                    <div className="text-xs font-extrabold text-rose-400 font-mono mt-0.5">{mem.losses}</div>
                  </div>
                  <div className="border-l border-slate-850">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Empates</div>
                    <div className="text-xs font-extrabold text-slate-400 font-mono mt-0.5">{mem.draws}</div>
                  </div>
                </div>

                {/* Favorite Card, if exists */}
                {mem.favoriteCard && (
                  <div className="flex items-center gap-2.5 bg-slate-950/20 p-2.5 rounded-xl border border-slate-850/40 text-xs">
                    <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-slate-400">Favorito: <strong className="text-slate-300">{mem.favoriteCard}</strong></span>
                    {mem.favoriteCardImage && (
                      <img src={mem.favoriteCardImage} alt={mem.favoriteCard} className="w-5 h-7 object-contain ml-auto rounded" />
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-5 border-t border-slate-850 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Membro desde: {mem.joinDate}
                </div>

                <div className="text-slate-400">
                  Win Rate: <strong className="text-white">{getWinRate(mem)}%</strong>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Add Teammate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 animate-fade-in overflow-y-auto" id="add-member-modal">
          <div className="bg-slate-900 border border-slate-700/80 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col my-auto">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-950/60 border border-purple-500/30 rounded-xl text-purple-400">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cadastrar Novo Spirits Member</h3>
                  <p className="text-xs text-slate-400">Insira os dados do treinador para o roster da equipe.</p>
                </div>
              </div>
              <button 
                id="close-add-member-x"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterMember} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">Nome Completo:</label>
                    <input
                      id="member-name-input"
                      type="text"
                      placeholder="ex: Carlos Alberto"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Level / Classificação: {!hasStaffPermission && <span className="text-red-400 font-bold text-[10px]">(Apenas Staff)</span>}
                    </label>
                    <select
                      id="member-role-select"
                      value={role}
                      disabled={!hasStaffPermission}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none disabled:opacity-50 cursor-pointer font-medium"
                    >
                      <option value="pokeball">🔴 Level Pokéball</option>
                      <option value="greatball">🔵 Level Greatball</option>
                      <option value="ultraball">⚫ Level Ultraball</option>
                      <option value="masterball">🟣 Level Masterball</option>
                      <option value="Premium ball">✨ Level Premium (Staff)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Nickname / Apelido em Jogo (Opcional):</label>
                  <input
                    id="member-nickname-input"
                    type="text"
                    placeholder="ex: FireBlast99"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-medium"
                  />
                </div>

                {/* Dynamic Search Sprite Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Pokémon do Avatar (Digite o nome):</label>
                  <input 
                    type="text" 
                    id="member-avatar"
                    placeholder="Ex: pikachu, mew, charizard" 
                    value={avatarSprite}
                    onChange={(e) => setAvatarSprite(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none placeholder-slate-600 font-medium"
                  />
                </div>

                {/* Live Preview Card */}
                <div className="flex items-center gap-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850/80">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 shrink-0">
                    <PokemonSprite name={avatarSprite || 'pikachu'} size="md" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Preview do Avatar Animado</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      O sprite do Pokémon acima se ajustará instantaneamente conforme você digita. Use nomes em inglês.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pinned Footer */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-add-member"
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer shadow-lg transition-all"
                >
                  {registering ? 'Efetuando matrícula Spirits...' : 'Cadastrar Spirits Member'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 animate-fade-in overflow-y-auto" id="edit-profile-modal">
          <div className="bg-slate-900 border border-slate-700/80 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col my-auto">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-950/60 border border-purple-500/30 rounded-xl text-purple-400">
                  <UserCheck className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Meu Perfil Spirits</h3>
                  <p className="text-xs text-slate-400">Atualize seu nickname ou Pokémon companheiro.</p>
                </div>
              </div>
              <button 
                id="close-edit-profile-x"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateProfile} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Nickname / Apelido em Jogo:</label>
                  <input
                    id="edit-nickname-input"
                    type="text"
                    placeholder="Seu nick competitivo"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-medium"
                  />
                </div>

                {/* Dynamic Search Sprite Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Pokémon do Avatar (Digite o nome):</label>
                  <input 
                    type="text" 
                    id="edit-member-avatar"
                    placeholder="Ex: pikachu, mew, charizard" 
                    value={editAvatarSprite}
                    onChange={(e) => setEditAvatarSprite(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none placeholder-slate-600 font-medium"
                  />
                </div>

                {/* Live Preview Card */}
                <div className="flex items-center gap-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850/80">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 shrink-0">
                    <PokemonSprite name={editAvatarSprite || 'pikachu'} size="md" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Preview do Avatar Animado</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      O sprite do Pokémon acima se ajustará instantaneamente conforme você digita. Use nomes de Pokémon em inglês.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pinned Footer */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-edit-profile"
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer shadow-lg transition-all"
                >
                  Salvar Alterações no Meu Perfil
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Staff Role Switcher Modal */}
      {showRoleModal && editingMember && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="change-role-modal">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-900/40 to-slate-900">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400 animate-spin-slow" />
                <h3 className="text-base font-bold text-white">Alterar Level / Classificação</h3>
              </div>
              <button 
                id="close-role-modal-x"
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingMember(null);
                }}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateMemberRole} className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                <PokemonSprite name={editingMember.avatarSprite} size="sm" />
                <div>
                  <h4 className="text-sm font-bold text-white">{editingMember.name}</h4>
                  <p className="text-[10px] text-slate-400">Level Atual: {editingMember.role}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase">Selecione o Novo Level:</label>
                <select
                  id="staff-role-select"
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-sm outline-none cursor-pointer"
                >
                  <option value="pokeball">🔴 Level Pokéball</option>
                  <option value="greatball">🔵 Level Greatball</option>
                  <option value="ultraball">⚫ Level Ultraball</option>
                  <option value="masterball">🟣 Level Masterball</option>
                  <option value="Premium ball">✨ Level Premium (Staff)</option>
                </select>
              </div>

              <button
                id="btn-submit-change-role"
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm cursor-pointer shadow-lg"
              >
                Atualizar Level do Membro
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {showDeleteConfirm && memberToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-member-modal">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-red-900/40 to-slate-900">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-white">Excluir Membro Spirits</h3>
              </div>
              <button 
                id="close-delete-modal-x"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setMemberToDelete(null);
                }}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDeleteMember} className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                <PokemonSprite name={memberToDelete.avatarSprite} size="sm" />
                <div>
                  <h4 className="text-sm font-bold text-white">{memberToDelete.name}</h4>
                  <p className="text-xs text-rose-400">{memberToDelete.nickname ? `@${memberToDelete.nickname}` : 'Sem apelido'}</p>
                </div>
              </div>

              <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl text-xs text-rose-300 space-y-1.5 leading-relaxed">
                <p className="font-bold">⚠️ Atenção: Esta ação é irreversível!</p>
                <p>O jogador será desvinculado do roster competitivo dos Spirits. Partidas registradas por ou contra este jogador continuarão no histórico, mas ele não aparecerá mais no Roster e nos Leaderboards.</p>
              </div>

              <div className="flex gap-3">
                <button
                  id="btn-cancel-delete"
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMemberToDelete(null);
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-sm cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-delete"
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-sm cursor-pointer shadow-lg transition-all"
                >
                  Excluir Membro
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
