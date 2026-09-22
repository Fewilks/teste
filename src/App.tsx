import React, { useState, useEffect } from 'react';
import { Member } from './types';
import { db, seedDatabaseIfEmpty, membersCol, collectionCol, auth } from './lib/firebase';
import { getDocs, getDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { registerCollectionCards } from './utils/cardImages';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Collection from './components/Collection';
import Loans from './components/Loans';
import Matches from './components/Matches';
import Decks from './components/Decks';
import TeamMembers from './components/TeamMembers';
import MyProfile from './components/MyProfile';
import RoleLock from './components/RoleLock';
import { 
  Trophy, 
  Swords, 
  ArrowLeftRight, 
  Layers, 
  Users, 
  Sparkles,
  ChevronDown,
  LayoutDashboard,
  HelpCircle,
  User,
  Lock,
  FileText
} from 'lucide-react';
import PokemonSprite from './components/PokemonSprite';
import PokemonLoader from './components/PokemonLoader';
import { getRoleBadge } from './utils';
import { fetchLiveMetaDecks, getStoredMetaDecks, saveStoredMetaDecks } from './services/limitlessApi';

export function getRoleRankValue(role: string): number {
  const normalized = (role || '').toLowerCase().replace(/\s+/g, '');
  if (normalized === 'pokeball') return 1;
  if (normalized === 'greatball') return 2;
  if (normalized === 'ultraball') return 3;
  if (normalized === 'masterball') return 4;
  if (normalized === 'premiumball') return 5;
  return 1;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Bootstrap Firebase Firestore and retrieve members list on load
  const loadPortalData = async (userUid?: string) => {
    try {
      // Seed Firestore with rich demo data if empty
      await seedDatabaseIfEmpty();

      // Retrieve Spirits roster
      const snap = await getDocs(membersCol);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
      setMembers(list);

      // Match the logged in user's ID
      if (userUid) {
        const currentUserEmail = auth.currentUser?.email?.toLowerCase() || '';
        let matched = list.find(m => m.id === userUid);

        // If no direct UID match, try matching by demo emails to merge accounts
        if (!matched) {
          if (currentUserEmail.includes('felipe') || currentUserEmail.includes('wilks')) {
            matched = list.find(m => m.id === 'member-felipe' || m.nickname === 'felipewilks' || m.name.toLowerCase().includes('felipe'));
          } else {
            // General match by name/email handle
            const localPart = currentUserEmail.split('@')[0];
            matched = list.find(m => m.name.toLowerCase().includes(localPart) || m.nickname?.toLowerCase() === localPart);
          }
        }

        if (matched) {
          // If we mapped to a default seeded member (e.g. 'member-1'), migrate their document ID in Firestore
          if (matched.id !== userUid) {
            console.log(`Migrating/mapping seeded member ${matched.name} (${matched.id}) to auth UID ${userUid}`);
            const migratedMember = { ...matched, id: userUid };
            await setDoc(doc(db, 'members', userUid), migratedMember);
            
            // If the old document was the seed ID, delete the old document
            if (matched.id.startsWith('member-')) {
              try {
                await deleteDoc(doc(db, 'members', matched.id));
              } catch (e) {
                console.error('Error cleaning up old seed member doc:', e);
              }
            }
            
            matched = migratedMember;

            // Refresh the roster list
            const freshSnap = await getDocs(membersCol);
            const freshList = freshSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
            setMembers(freshList);
          }
          setCurrentMember(matched);
        } else {
          // Fallback: If no matched record yet, read individual doc or create one on the fly
          const docRef = doc(db, 'members', userUid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const extraMember = { id: docSnap.id, ...docSnap.data() } as Member;
            setCurrentMember(extraMember);
            setMembers(prev => {
              if (!prev.find(m => m.id === userUid)) {
                return [...prev, extraMember];
              }
              return prev;
            });
          } else {
            // Create a dynamic member document for this registered/authenticated user
            const email = auth.currentUser?.email || '';
            const defaultName = auth.currentUser?.displayName || email.split('@')[0] || 'Novo Treinador';
            const newMember: Member = {
              id: userUid,
              name: defaultName,
              role: 'pokeball',
              nickname: defaultName.toLowerCase().replace(/\s+/g, ''),
              avatarSprite: 'pikachu',
              wins: 0,
              losses: 0,
              draws: 0,
              joinDate: new Date().toISOString().split('T')[0]
            };
            await setDoc(docRef, newMember);
            setCurrentMember(newMember);
            setMembers(prev => {
              if (!prev.find(m => m.id === userUid)) {
                return [...prev, newMember];
              }
              return prev;
            });
          }
        }
      } else {
        const defaultUser = list.find(m => m.id === 'member-felipe') || list[0] || null;
        setCurrentMember(defaultUser);
      }

      // Sincroniza acervo de cartas do time com o TrainerLog e renderizador de partidas
      try {
        const collSnap = await getDocs(collectionCol);
        if (!collSnap.empty) {
          const collCards = collSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          registerCollectionCards(collCards);
        }
      } catch (collErr) {
        console.warn('Could not auto-register collection cards into TrainerLog image resolver:', collErr);
      }

      // Estratégia de cache em localStorage para o Metagame oficial (Limitless TCG)
      try {
        console.info('[Spirits Portal] Sincronizando dados competitivos do metagame...');
        const metaResult = await fetchLiveMetaDecks(true);
        if (metaResult && Array.isArray(metaResult.decks) && metaResult.decks.length > 0 && metaResult.source !== 'offline-fallback') {
          saveStoredMetaDecks(metaResult);
          console.info(`[Spirits Portal] Metagame salvo em localStorage com sucesso: "${metaResult.tournamentName}" (${metaResult.decks.length} baralhos).`);
        } else {
          // Se a chamada externa retornou fallback offline, recupera o último estado válido salvo no localStorage
          const lastSaved = getStoredMetaDecks();
          if (lastSaved && lastSaved.decks.length > 0) {
            console.info(`[Spirits Portal] Chamada externa sem novos dados. Utilizando último estado salvo no localStorage: "${lastSaved.tournamentName}" (${lastSaved.decks.length} baralhos).`);
          } else if (metaResult) {
            saveStoredMetaDecks(metaResult);
          }
        }
      } catch (metaErr) {
        console.warn('[Spirits Portal] Falha na chamada externa do metagame em loadPortalData. Recuperando último estado no localStorage:', metaErr);
        try {
          const fallbackCached = getStoredMetaDecks();
          if (fallbackCached && fallbackCached.decks.length > 0) {
            console.info(`[Spirits Portal] Recuperado com sucesso do cache local (localStorage): "${fallbackCached.tournamentName}" (${fallbackCached.decks.length} baralhos).`);
          } else {
            console.warn('[Spirits Portal] Nenhum metagame anterior encontrado no localStorage. O sistema utilizará os decks padrão de contingência.');
          }
        } catch (storageErr) {
          console.error('[Spirits Portal] Erro ao acessar localStorage para metagame:', storageErr);
        }
      }
    } catch (err) {
      console.error('Error bootstrapping Spirits portal:', err);
    }
  };

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (user) {
          setCurrentUser(user);
          await loadPortalData(user.uid);
        } else {
          setCurrentUser(null);
          setCurrentMember(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSwitchProfile = (memberId: string) => {
    const selected = members.find(m => m.id === memberId);
    if (selected) {
      setCurrentMember(selected);
      setShowProfileSwitcher(false);
      // Trigger short reload of dashboard/collection to match selected member
      const active = activeTab;
      setActiveTab('dashboard');
      setTimeout(() => setActiveTab(active), 10);
    }
  };

  if (loading) {
    return (
      <PokemonLoader 
        pokemon="gengar" 
        fullScreen 
        title="Canalizando Spirits Portal..." 
        subtitle="Sincronizando estatísticas, winrate e TrainerLog..." 
      />
    );
  }

  // If no authenticated user, render the Login / Signup screen
  if (!currentUser) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, minRank: 1 },
    { id: 'partidas', label: 'Partidas & Winrate', icon: Swords, minRank: 1 },
    { id: 'trainerlog', label: 'TrainerLog Replay', icon: FileText, minRank: 1 },
    { id: 'colecao', label: 'Minha Coleção', icon: Layers, minRank: 1 },
    { id: 'emprestimos', label: 'Empréstimos', icon: ArrowLeftRight, minRank: 1 },
    { id: 'decks', label: 'Meus Decks', icon: Trophy, minRank: 1 },
    { id: 'perfil', label: 'Meu Perfil', icon: User, minRank: 1 },
    { id: 'time', label: 'Time Spirits', icon: Users, minRank: 1 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row" id="app-shell">
      
      {/* 1. LEFT SIDEBAR PANEL */}
      <aside className="w-full md:w-64 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-850/80 shrink-0 flex flex-col justify-between p-5 relative z-40 backdrop-blur-md">
        
        <div className="space-y-6">
          {/* Spirits Team Branding Brand Header */}
          <div className="flex items-center gap-3 border-b border-slate-850/60 pb-5">
            <div className="w-10 h-10 bg-gradient-to-tr from-purple-650 to-indigo-650 rounded-xl flex items-center justify-center shadow-lg shadow-purple-950/50 border border-purple-400/20 shrink-0 overflow-hidden relative">
              {!logoFailed ? (
                <img 
                  src={`${import.meta.env.BASE_URL}logo-spirits.png`} 
                  alt="Spirits Logo" 
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <span className="text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">👻</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                SPIRITS <span className="text-purple-400 text-xs font-mono">TCG</span>
              </h1>
              <p className="text-[10px] text-purple-350 font-extrabold uppercase tracking-widest">Competitive Team</p>
            </div>
          </div>

          {/* Active Player Context profile indicator */}
          {currentMember && (
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 bg-slate-900/80 rounded-lg border border-slate-800 shrink-0 flex items-center justify-center overflow-hidden">
                  <PokemonSprite name={currentMember.avatarSprite} size="sm" />
                </div>
                <div className="min-w-0">
                  <div className="mb-0.5">{getRoleBadge(currentMember.role)}</div>
                  <div className="text-white font-black text-xs truncate">{currentMember.nickname || currentMember.name}</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1" id="nav-menu">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isLocked = false;

              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-950/40 to-indigo-950/10 text-purple-350 border-l-4 border-purple-500 font-extrabold shadow-md shadow-purple-950/20' 
                      : 'text-slate-400 hover:bg-slate-850/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-purple-400' : 'text-slate-550'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout Button and Footer info brand */}
        <div className="space-y-4 mt-auto pt-4 border-t border-slate-850/60">
          <button
            id="sidebar-logout-btn"
            onClick={() => signOut(auth)}
            className="w-full px-4 py-2 bg-slate-950/40 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-850 hover:border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md group"
          >
            <span>Sair do Portal</span>
          </button>

          <div className="text-center text-[10px] text-slate-500 font-mono space-y-1">
            <div>Spirits competitive v1.2</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-emerald-400 font-bold">Firestore Sincronizado</span>
            </div>
          </div>
        </div>

      </aside>

      {/* 2. MAIN CORE STAGE SHEET */}
      <main className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto max-h-screen" id="main-stage">
        {currentMember ? (
          <div>
            {activeTab === 'dashboard' && (
              <Dashboard 
                currentMember={currentMember} 
                setActiveTab={setActiveTab} 
                onStatsHealed={() => loadPortalData(currentUser?.uid)} 
              />
            )}
            
            {activeTab === 'colecao' && <Collection currentMember={currentMember} />}
            
            {activeTab === 'emprestimos' && <Loans currentMember={currentMember} />}
            
            {(activeTab === 'partidas' || activeTab === 'trainerlog') && (
              <Matches 
                currentMember={currentMember} 
                setActiveTab={setActiveTab} 
                initialSubTab={activeTab === 'trainerlog' ? 'replay' : 'history'}
                onSyncMatch={() => loadPortalData(currentUser?.uid)} 
              />
            )}
            
            {activeTab === 'decks' && <Decks currentMember={currentMember} />}
            
            {activeTab === 'perfil' && (
              <MyProfile 
                currentMember={currentMember} 
                setCurrentMember={setCurrentMember} 
                onMemberUpdated={loadPortalData} 
              />
            )}
            
            {activeTab === 'time' && (
              <TeamMembers 
                currentMember={currentMember} 
                setCurrentMember={setCurrentMember} 
                onMemberUpdated={loadPortalData} 
                currentUserEmail={currentUser?.email || ''} 
              />
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="text-center space-y-3 mb-10">
              <div className="inline-flex bg-purple-950/40 p-3 rounded-2xl border border-purple-500/20 animate-pulse mb-2">
                <PokemonSprite name="substitute" size="lg" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">👻 Escolha seu Perfil de Jogador</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Selecione o seu perfil ou simule qualquer outro mestre do elenco da Spirits para liberar todas as funções interativas do portal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="fallback-member-grid">
              {members.map((mem) => (
                <button
                  key={mem.id}
                  id={`select-fallback-${mem.id}`}
                  onClick={() => setCurrentMember(mem)}
                  className="bg-slate-900/60 hover:bg-slate-900 border border-slate-850/80 hover:border-purple-500/40 p-4.5 rounded-2xl flex items-center gap-3.5 text-left transition-all cursor-pointer group hover:shadow-lg hover:shadow-purple-950/10"
                >
                  <div className="w-12 h-12 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                    <PokemonSprite name={mem.avatarSprite} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-extrabold text-sm truncate">{mem.nickname || mem.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{mem.name}</div>
                    <div className="mt-1">{getRoleBadge(mem.role)}</div>
                  </div>
                </button>
              ))}

              <button
                id="select-fallback-create-new"
                onClick={() => {
                  // Fallback create action
                  const email = auth.currentUser?.email || '';
                  const defaultName = auth.currentUser?.displayName || email.split('@')[0] || 'Novo Treinador';
                  const placeholderMember: Member = {
                    id: auth.currentUser?.uid || `member-${Date.now()}`,
                    name: defaultName,
                    role: 'pokeball',
                    nickname: defaultName.toLowerCase().replace(/\s+/g, ''),
                    avatarSprite: 'pikachu',
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    joinDate: new Date().toISOString().split('T')[0]
                  };
                  setCurrentMember(placeholderMember);
                  setActiveTab('time');
                }}
                className="bg-gradient-to-br from-purple-950/20 to-slate-900 hover:from-purple-900/30 hover:to-slate-900 border border-dashed border-purple-500/30 hover:border-purple-500/60 p-4.5 rounded-2xl flex flex-col justify-center items-center gap-2 text-center transition-all cursor-pointer group min-h-[96px]"
              >
                <div className="w-8 h-8 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  +
                </div>
                <div className="text-white font-bold text-xs">Criar Perfil de Treinador</div>
              </button>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
