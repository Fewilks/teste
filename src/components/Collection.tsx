import React, { useState, useEffect } from 'react';
import { db, collectionCol, purgeAllDataExceptDecks } from '../lib/firebase';
import { getDocs, query, where, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Member, CardItem } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Globe, 
  Grid, 
  Users, 
  Sparkles, 
  Heart,
  PlusCircle,
  X,
  Info,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import PokemonSprite from './PokemonSprite';
import PokemonLoader from './PokemonLoader';
import ModalPortal from './ModalPortal';
import { getAuthenticCardImageUrl, getCardScanHierarchy, POKEMON_CARD_BACK, registerCollectionCards } from '../utils/cardImages';
import { 
  normalizePokemonCard, 
  normalizeCollectionCards, 
  retroactiveNormalizeCardItem, 
  getPTCGLId, 
  getNormalizedCardId 
} from '../services/cardNormalizationService';
import { COMPREHENSIVE_SETS, MODERN_CARDS_CATALOG, searchCardsLocally } from '../data/pokemonCatalog';

interface CollectionProps {
  currentMember: Member;
}

export default function Collection({ currentMember }: CollectionProps) {
  const [collectionCards, setCollectionCards] = useState<CardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>(() => normalizeCollectionCards(MODERN_CARDS_CATALOG.slice(0, 16)));
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Sets & set selection state - default to comprehensive master catalog
  const [sets, setSets] = useState<any[]>(COMPREHENSIVE_SETS);
  const [selectedSet, setSelectedSet] = useState('');
  
  // Modals / forms state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLendable, setIsLendable] = useState(true);

  // Load available sets from the TCG API proxy, gracefully falling back to COMPREHENSIVE_SETS
  useEffect(() => {
    async function fetchSets() {
      try {
        const res = await fetch('/api/pokemon/sets');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSets(data);
          }
        }
      } catch (err) {
        console.info('Usando catálogo local de coleções.');
      }
    }
    fetchSets();
  }, []);

  // Collection tab state: 'my' (Minha Coleção), 'team' (Acervo do Time), or 'explorer' (Explorador Oficial de Coleções)
  const [collectionTab, setCollectionTab] = useState<'my' | 'team' | 'explorer'>('my');
  const [explorerSet, setExplorerSet] = useState<string>('DRI');
  const [explorerCards, setExplorerCards] = useState<any[]>([]);
  const [loadingExplorer, setLoadingExplorer] = useState(false);
  const [showPurgeCollectionModal, setShowPurgeCollectionModal] = useState(false);
  const [purgingCollection, setPurgingCollection] = useState(false);

  // Load complete set cards for the official explorer
  useEffect(() => {
    async function loadExplorerSet() {
      if (collectionTab !== 'explorer' && !explorerSet) return;
      try {
        setLoadingExplorer(true);
        const res = await fetch(`/api/pokemon/search?set=${encodeURIComponent(explorerSet)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setExplorerCards(normalizeCollectionCards(data));
          }
        }
      } catch (err) {
        console.error('Error loading explorer set:', err);
      } finally {
        setLoadingExplorer(false);
      }
    }
    loadExplorerSet();
  }, [explorerSet, collectionTab]);

  const handlePurgeAllCollection = async () => {
    try {
      setPurgingCollection(true);
      await purgeAllDataExceptDecks();
      setCollectionCards([]);
      setShowPurgeCollectionModal(false);
    } catch (err) {
      console.error('Error purging collection:', err);
    } finally {
      setPurgingCollection(false);
    }
  };

  // Load user collection or whole team collection
  useEffect(() => {
    async function fetchCollection() {
      if (collectionTab === 'explorer') return;
      try {
        setLoading(true);
        const q = collectionTab === 'my'
          ? query(collectionCol, where('ownerId', '==', currentMember.id))
          : collectionCol;
        const snap = await getDocs(q);
        const rawCards = snap.docs.map(d => ({ id: d.id, ...d.data() } as CardItem));
        
        // Mapeamento retroativo: normaliza cartas da coleção para priorizar o ID do PTCGL
        const normalizedCards = normalizeCollectionCards(rawCards);
        registerCollectionCards(normalizedCards as any);
        setCollectionCards(normalizedCards as any);
      } catch (err) {
        console.error('Error fetching collection:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCollection();
  }, [currentMember, collectionTab]);

  // Handle live database search via backend API proxy with instant local catalog fallback
  const handleDatabaseSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // If both empty, show top modern cards
    if (!searchQuery.trim() && !selectedSet) {
      setSearchResults(normalizeCollectionCards(MODERN_CARDS_CATALOG.slice(0, 16)));
      return;
    }

    try {
      setSearching(true);
      let found: any[] = [];
      try {
        const res = await fetch(`/api/pokemon/search?q=${encodeURIComponent(searchQuery)}&set=${encodeURIComponent(selectedSet)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            found = data;
          }
        }
      } catch (netErr) {
        // Fallback silently if offline or on static host
      }

      // If backend was 404, unavailable, or empty, search local 2025+ modern catalog
      if (found.length === 0) {
        found = searchCardsLocally(searchQuery, selectedSet);
      }

      // Normaliza todos os resultados com prioridade ao ID do PTCGL
      setSearchResults(normalizeCollectionCards(found));
    } catch (err) {
      setSearchResults(normalizeCollectionCards(searchCardsLocally(searchQuery, selectedSet)));
    } finally {
      setSearching(false);
    }
  };

  // Auto-search when selected set changes (allows fast browsing of entire sets!)
  useEffect(() => {
    if (selectedSet || searchQuery) {
      handleDatabaseSearch();
    }
  }, [selectedSet]);

  const handleOpenAdd = (card: any) => {
    const normalized = normalizePokemonCard(card);
    setSelectedCard(normalized);
    setQuantity(1);
    setIsLendable(true);
    setShowAddModal(true);
  };

  const handleAddCardToDb = async () => {
    if (!selectedCard) return;

    try {
      // Normaliza dados da carta priorizando a nomenclatura oficial do PTCGL
      const normalized = normalizePokemonCard(selectedCard);
      const userCardId = `${currentMember.id}_${normalized.normalizedCardId}`;
      const cardRef = doc(db, 'collection', userCardId);
      
      // Look up if user already has this card (checking PTCGL ID and legacy IDs)
      const existingCard = collectionCards.find(c => 
        c.id === userCardId ||
        c.id === `${currentMember.id}_${selectedCard.id}` ||
        (getPTCGLId(c) === normalized.ptcglId && c.ownerId === currentMember.id)
      );
      
      if (existingCard) {
        // Increment quantity on existing record
        const newQty = existingCard.quantity + quantity;
        await updateDoc(doc(db, 'collection', existingCard.id), { quantity: newQty });
        
        setCollectionCards(prev => prev.map(c => 
          c.id === existingCard.id ? { ...c, quantity: newQty } : c
        ));
      } else {
        // Save using canonical PTCGL metadata and authentic scans
        const newCard: CardItem = {
          id: userCardId,
          name: normalized.name,
          imageUrl: normalized.imageUrl,
          setCode: normalized.setCode,
          setName: normalized.setName,
          setNumber: normalized.setNumber,
          quantity: quantity,
          ownerId: currentMember.id,
          ownerName: currentMember.name,
          isLendable: isLendable,
          createdAt: new Date().toISOString()
        };
        
        await setDoc(cardRef, newCard);
        setCollectionCards(prev => [...prev, normalizePokemonCard(newCard) as any]);
      }

      setShowAddModal(false);
      setSelectedCard(null);
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      console.error('Error adding card:', err);
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    if (!confirm('Deseja mesmo remover esta carta da sua coleção?')) return;

    try {
      await deleteDoc(doc(db, 'collection', cardId));
      setCollectionCards(prev => prev.filter(c => c.id !== cardId));
    } catch (err) {
      console.error('Error removing card:', err);
    }
  };

  const handleToggleLendable = async (cardId: string, currentStatus: boolean) => {
    try {
      const cardRef = doc(db, 'collection', cardId);
      await updateDoc(cardRef, { isLendable: !currentStatus });
      setCollectionCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, isLendable: !currentStatus } : c
      ));
    } catch (err) {
      console.error('Error toggling lendable status:', err);
    }
  };

  const handleUpdateQty = async (cardId: string, change: number) => {
    const card = collectionCards.find(c => c.id === cardId);
    if (!card) return;

    const newQty = card.quantity + change;
    if (newQty <= 0) {
      handleRemoveCard(cardId);
      return;
    }

    try {
      const cardRef = doc(db, 'collection', cardId);
      await updateDoc(cardRef, { quantity: newQty });
      setCollectionCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, quantity: newQty } : c
      ));
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  return (
    <div className="space-y-8" id="collection-view">
      
      {/* 1. View Header with Search Portal Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-850 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎁</span> Acervo de Cartas Spirits
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            Mantenha seu acervo de cartas Pokémon TCG atualizado e colabore com empréstimos de cartas para fortalecer o time!
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {collectionCards.length > 0 && (
            <button
              id="btn-purge-collection-direct"
              onClick={() => setShowPurgeCollectionModal(true)}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 hover:border-rose-500/50 text-rose-300 hover:text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              title="Zerar acervo de coleção mantendo os decks intactos"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Zerar Coleção (Manter Decks)</span>
            </button>
          )}

          <button
            id="btn-add-card-to-collection"
            onClick={() => {
              setSelectedCard(null);
              setSearchQuery('');
              setSelectedSet('');
              setSearchResults(MODERN_CARDS_CATALOG.slice(0, 16));
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-950/40 cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 shrink-0"
          >
            <PlusCircle className="w-5 h-5" /> Adicionar Nova Carta
          </button>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 max-w-xl">
        <button
          id="collection-tab-my"
          onClick={() => setCollectionTab('my')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            collectionTab === 'my'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          👤 Minha Coleção ({collectionTab === 'my' ? collectionCards.length : '...'})
        </button>
        <button
          id="collection-tab-team"
          onClick={() => setCollectionTab('team')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            collectionTab === 'team'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          👥 Acervo do Time
        </button>
        <button
          id="collection-tab-explorer"
          onClick={() => setCollectionTab('explorer')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            collectionTab === 'explorer'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Explorador de Coleções</span>
        </button>
      </div>

      {/* 2. Main Tab Contents */}
      {collectionTab === 'explorer' ? (
        /* Explorador de Coleções Completas (Rivais Predestinados, Amigos de Jornada, Fogo Branco, etc.) */
        <div className="space-y-6" id="explorer-view">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <span>Explorador de Coleções Oficiais Pokémon TCG</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Navegue por todas as cartas das coleções mais recentes com scans oficiais e traduções em português.
                </p>
              </div>

              {/* Set selector */}
              <div className="w-full sm:w-72 shrink-0">
                <select
                  id="explorer-set-select"
                  value={explorerSet}
                  onChange={(e) => setExplorerSet(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-500/40 rounded-xl text-white text-sm font-bold outline-none cursor-pointer focus:border-purple-400"
                >
                  {sets.map((s: any, idx: number) => (
                    <option key={`exp-set-${s.id || idx}`} value={s.id}>
                      {s.name} ({s.id ? String(s.id).toUpperCase() : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Set Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-850">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Acesso Rápido:</span>
              {[
                { label: 'Rivais Predestinados (DRI)', code: 'DRI' },
                { label: 'Amigos de Jornada (JTG)', code: 'JTG' },
                { label: 'Fogo Branco (WHT)', code: 'WHT' },
                { label: 'Raio Preto (BLK)', code: 'BLK' },
                { label: 'Evoluções Prismáticas (PRE)', code: 'PRE' },
                { label: 'Celebrações 30 Anos (30TH)', code: '30TH' }
              ].map((pill) => (
                <button
                  key={pill.code}
                  type="button"
                  onClick={() => setExplorerSet(pill.code)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    explorerSet.toUpperCase() === pill.code
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-950/40'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Card Counter summary banner */}
            <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-850">
              <span className="font-medium">
                Exibindo <strong className="text-white font-mono">{explorerCards.length} cartas</strong> da expansão selecionada
              </span>
              <span className="text-[11px] text-purple-400 font-mono font-bold">
                Status: 100% Completa
              </span>
            </div>
          </div>

          {/* Explorer Cards Grid */}
          {loadingExplorer ? (
            <PokemonLoader 
              pokemon="mew" 
              title="Carregando cartas da coleção..." 
              subtitle="Buscando todos os scans e informações em português..." 
            />
          ) : explorerCards.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 p-8">
              <p className="text-slate-400 text-sm">Nenhuma carta encontrada para esta coleção.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" id="explorer-grid">
              {explorerCards.map((card, idx) => (
                <div
                  key={`explorer-card-${card.id || idx}`}
                  className="bg-slate-900/50 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-3 flex flex-col justify-between group transition-all duration-300 hover:shadow-lg"
                >
                  <div className="aspect-[3/4] flex items-center justify-center relative mb-2 bg-slate-950/40 rounded-xl overflow-hidden p-1">
                    <img 
                      src={getAuthenticCardImageUrl(card)} 
                      alt={card.name} 
                      className="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        const hierarchy = getCardScanHierarchy(card);
                        if (e.currentTarget.src !== hierarchy.secondary && hierarchy.secondary !== POKEMON_CARD_BACK) {
                          e.currentTarget.src = hierarchy.secondary;
                        } else {
                          e.currentTarget.src = POKEMON_CARD_BACK;
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/30">
                        {card.tpciCode || `${card.setCode || ''} ${card.setNumber || ''}`}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate" title={card.name}>
                      {card.name}
                    </h4>

                    <button
                      type="button"
                      onClick={() => handleOpenAdd(card)}
                      className="w-full py-1.5 px-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <PokemonLoader 
          pokemon="charizard" 
          title="Carregando acervo de cartas..." 
          subtitle="Sincronizando inventário e cartas físicas do time..." 
        />
      ) : collectionCards.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 p-8 flex flex-col items-center justify-center backdrop-blur-md" id="empty-collection-state">
          <div className="text-5xl mb-4">🎴</div>
          <h3 className="text-lg font-bold text-white">
            {collectionTab === 'my' ? 'Sua coleção está vazia!' : 'Nenhuma carta registrada no time!'}
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm font-sans leading-relaxed">
            {collectionTab === 'my' 
              ? 'Cadastre suas cartas ex, VSTAR e treinadores mais raros para que seus companheiros de time possam vê-los!'
              : 'Nenhum integrante cadastrou cartas para compartilhar ainda.'}
          </p>
          {collectionTab === 'my' && (
            <button
              id="empty-state-add"
              onClick={() => setShowAddModal(true)}
              className="mt-6 px-5 py-2.5 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm cursor-pointer shadow-lg shadow-purple-950/30 transition-all duration-300"
            >
              Adicionar Minha Primeira Carta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6" id="collection-grid">
          {collectionCards.map((card, idx) => (
            <div 
              key={`collection-item-${card.id || 'card'}-${card.ownerId || 'anon'}-${idx}`} 
              className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(147,51,234,0.05)] transition-all duration-300 group flex flex-col justify-between backdrop-blur-md"
              id={`collection-card-${card.id || idx}`}
            >
              {/* Card visual wrapper */}
              <div className="p-3 relative aspect-[3/4] flex items-center justify-center bg-slate-950/20">
                <img 
                  src={getAuthenticCardImageUrl(card)} 
                  alt={card.name} 
                  className="max-h-full max-w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform duration-300" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    const hierarchy = getCardScanHierarchy(card);
                    if (e.currentTarget.src !== hierarchy.secondary && hierarchy.secondary !== POKEMON_CARD_BACK) {
                      e.currentTarget.src = hierarchy.secondary;
                    } else {
                      e.currentTarget.src = POKEMON_CARD_BACK;
                    }
                  }}
                />
                
                {/* Quantity Badge */}
                <div className="absolute top-2.5 right-2.5 bg-purple-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-lg border border-purple-400/20 font-mono">
                  x{card.quantity}
                </div>

                {/* Lendable Banner status overlay */}
                <div className={`absolute bottom-2.5 left-2.5 right-2.5 text-[9px] font-bold text-center py-1 rounded-lg border backdrop-blur-md ${
                  card.isLendable 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/20' 
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/20'
                }`}>
                  {card.isLendable ? '🟢 DISPONÍVEL' : '🔴 RESERVADO'}
                </div>
              </div>

              {/* Text & Action controls info */}
              <div className="p-4 bg-slate-950/40 border-t border-slate-850/60 space-y-3">
                <div>
                  <h3 className="text-white font-extrabold text-xs truncate" title={card.name}>{card.name}</h3>
                  <div className="card-data-field text-[10px] text-slate-400 flex items-center justify-between mt-1">
                    <span className="truncate max-w-[110px]">{card.setName}</span>
                    <span className="font-mono text-purple-300 font-bold bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-500/20 shrink-0">
                      {getPTCGLId(card)}
                    </span>
                  </div>
                </div>

                {/* Interactive Controls */}
                {card.ownerId === currentMember.id ? (
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-850/60">
                    {/* Qty increment button */}
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-850">
                      <button 
                        id={`qty-dec-${card.id}`}
                        onClick={() => handleUpdateQty(card.id, -1)}
                        className="text-slate-400 hover:text-white font-black text-xs cursor-pointer px-1"
                      >
                        -
                      </button>
                      <span className="text-white text-xs font-bold font-mono">{card.quantity}</span>
                      <button 
                        id={`qty-inc-${card.id}`}
                        onClick={() => handleUpdateQty(card.id, 1)}
                        className="text-slate-400 hover:text-white font-black text-xs cursor-pointer px-1"
                      >
                        +
                      </button>
                    </div>

                    {/* Settings toggle */}
                    <div className="flex gap-1.5">
                      <button
                        key={`toggle-lend-${card.id}`}
                        id={`toggle-lend-${card.id}`}
                        onClick={() => handleToggleLendable(card.id, card.isLendable)}
                        title={card.isLendable ? 'Marcar como privado' : 'Tornar disponível para empréstimo'}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                          card.isLendable 
                            ? 'bg-emerald-950/50 hover:bg-emerald-900 border-emerald-500/20 text-emerald-400' 
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>

                      <button
                        key={`delete-card-${card.id}`}
                        id={`delete-card-${card.id}`}
                        onClick={() => handleRemoveCard(card.id)}
                        title="Deletar carta"
                        className="p-1.5 bg-rose-955 hover:bg-rose-900 border border-rose-500/10 text-rose-400 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-850/60 text-xs">
                    <div className="text-slate-400 truncate max-w-[100px] font-sans font-medium flex items-center gap-1" title={card.ownerName}>
                      👤 {card.ownerName}
                    </div>
                    
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      card.isLendable
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                    }`}>
                      {card.isLendable ? 'Disponível' : 'Reservado'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Add Card Overlay Modal */}
      <ModalPortal isOpen={showAddModal} onClose={() => {
        setShowAddModal(false);
        setSelectedCard(null);
        setSearchResults([]);
        setSearchQuery('');
      }} id="add-card-modal">
        <div className="bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col my-auto animate-fade-in">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🃏</span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Adicionar Carta ao seu Acervo</h3>
                  <p className="text-xs text-slate-400">Pesquise por nome oficial ou selecione uma expansão completa</p>
                </div>
              </div>
              <button 
                id="close-modal-x"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedCard(null);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search form & Quick Tags */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 shrink-0 space-y-3">
              <form onSubmit={handleDatabaseSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="modal-card-search-input"
                    type="text"
                    placeholder="Busque cartas em inglês ou português (ex: Charizard, Iono, Arven...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium"
                  />
                </div>
                
                {/* Collection Filter */}
                <div className="w-full sm:w-60 shrink-0">
                  <select
                    id="modal-set-filter"
                    value={selectedSet}
                    onChange={(e) => setSelectedSet(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium cursor-pointer"
                  >
                    <option value="">Todas as Coleções</option>
                    {sets.map((s: any, idx: number) => (
                      <option key={`set-opt-${s.id || 'set'}-${idx}`} value={s.id}>
                        {s.name} ({s.id ? String(s.id).toUpperCase() : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  id="modal-search-submit"
                  type="submit"
                  disabled={searching}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-md"
                >
                  {searching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <span>Pesquisar</span>
                  )}
                </button>
              </form>

              {/* Quick Set Tags */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Coleções Recentes:</span>
                {[
                  { label: 'Rivais Predestinados', code: 'DRI' },
                  { label: 'Amigos de Jornada', code: 'JTG' },
                  { label: 'Fogo Branco', code: 'WHT' },
                  { label: 'Raio Preto', code: 'BLK' },
                  { label: 'Evoluções Prismáticas', code: 'PRE' },
                  { label: '30 Anos', code: '30TH' }
                ].map(tag => (
                  <button
                    key={tag.code}
                    type="button"
                    onClick={() => setSelectedSet(tag.code)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                      selectedSet.toUpperCase() === tag.code
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body: Grid search results or card details form */}
            <div className="p-5 overflow-y-auto flex-1 bg-slate-900/40 overscroll-contain">
              
              {/* If we have selected a card, show options to save */}
              {selectedCard ? (
                <div className="flex flex-col sm:flex-row gap-6 animate-fade-in" id="add-details-form">
                  <div className="w-full sm:w-1/3 flex justify-center shrink-0">
                    <img 
                      src={getAuthenticCardImageUrl(selectedCard)} 
                      alt={selectedCard.name} 
                      className="max-h-72 object-contain rounded-xl drop-shadow-xl border border-slate-800 bg-slate-950/50 p-1" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        const hierarchy = getCardScanHierarchy(selectedCard);
                        if (e.currentTarget.src !== hierarchy.secondary && hierarchy.secondary !== POKEMON_CARD_BACK) {
                          e.currentTarget.src = hierarchy.secondary;
                        } else {
                          e.currentTarget.src = POKEMON_CARD_BACK;
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 space-y-5">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                        {selectedCard.setName || 'Coleção'}
                      </span>
                      <h4 className="text-xl font-bold text-white mt-2">{selectedCard.name}</h4>
                      <div className="card-data-field text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                        <span>Código Oficial PTCGL: <strong className="font-mono text-purple-300 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">{getPTCGLId(selectedCard)}</strong></span>
                      </div>
                    </div>

                    {/* Quantity selection */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">Quantidade de cópias:</label>
                      <div className="flex items-center gap-3">
                        <button 
                          id="btn-qty-dec"
                          type="button"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-extrabold flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          -
                        </button>
                        <span className="text-xl font-bold font-mono text-white w-12 text-center">{quantity}</span>
                        <button 
                          id="btn-qty-inc"
                          type="button"
                          onClick={() => setQuantity(q => q + 1)}
                          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-extrabold flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Share option */}
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          id="checkbox-is-lendable"
                          type="checkbox"
                          checked={isLendable}
                          onChange={(e) => setIsLendable(e.target.checked)}
                          className="mt-0.5 accent-purple-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">Disponibilizar para empréstimo ao time</span>
                          <span className="text-[11px] text-slate-400">Outros membros poderão solicitar esta carta para treinos ou torneios.</span>
                        </div>
                      </label>
                    </div>

                    {/* Submit choices */}
                    <div className="flex gap-3 pt-2">
                      <button
                        id="btn-cancel-add-card"
                        type="button"
                        onClick={() => setSelectedCard(null)}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer border border-slate-700"
                      >
                        Voltar para Busca
                      </button>
                      <button
                        id="btn-submit-add-card"
                        type="button"
                        onClick={handleAddCardToDb}
                        className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-lg"
                      >
                        Salvar na Minha Coleção
                      </button>
                    </div>

                  </div>
                </div>
              ) : (
                /* Show search results grid */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Resultados: <strong className="text-white">{searchResults.length} cartas</strong></span>
                    {selectedSet && <span className="font-mono text-purple-400">Filtro: {selectedSet}</span>}
                  </div>

                  {searching ? (
                    <div className="text-center py-12 flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 text-sm mt-3 font-mono">Carregando cartas oficiais com scans de alta resolução...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm bg-slate-950/40 rounded-2xl border border-slate-850">
                      Nenhuma carta encontrada. Escolha uma das coleções acima ou digite outro nome.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5" id="modal-search-results">
                      {searchResults.map((card, idx) => (
                        <div
                          key={`search-card-${card.id || 'search'}-${idx}`}
                          onClick={() => handleOpenAdd(card)}
                          className="bg-slate-950/60 hover:bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all duration-200 group flex flex-col justify-between hover:shadow-lg"
                          id={`search-result-${card.id || idx}`}
                        >
                          <div className="aspect-[3/4] flex items-center justify-center relative mb-2 bg-slate-900/40 rounded-lg overflow-hidden p-1">
                            <img 
                              src={getAuthenticCardImageUrl(card)} 
                              alt={card.name} 
                              className="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                const hierarchy = getCardScanHierarchy(card);
                                if (e.currentTarget.src !== hierarchy.secondary && hierarchy.secondary !== POKEMON_CARD_BACK) {
                                  e.currentTarget.src = hierarchy.secondary;
                                } else {
                                  e.currentTarget.src = POKEMON_CARD_BACK;
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-white font-bold text-xs truncate group-hover:text-purple-300 transition-colors">{card.name}</div>
                            <div className="card-data-field text-[10px] text-slate-400 flex items-center justify-between">
                              <span className="truncate max-w-[85px]">{card.setName}</span>
                              <span className="font-mono text-purple-300 font-bold bg-purple-950/60 px-1 py-0.2 rounded border border-purple-500/20 shrink-0">
                                {getPTCGLId(card)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-purple-400" />
                <span>Base de dados TCGdex & Limitless integrada</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedCard(null);
                }}
                className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
      </ModalPortal>

      {/* Purge Collection Confirmation Modal */}
      <ModalPortal isOpen={showPurgeCollectionModal} onClose={() => setShowPurgeCollectionModal(false)} id="purge-collection-modal">
        <div className="bg-slate-900 border border-rose-500/40 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 my-auto animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Zerar Acervo de Coleção</h3>
              <p className="text-xs text-rose-300">Mantendo seus baralhos e decks cadastrados</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-850">
            <p>
              Esta ação irá remover todas as cartas cadastradas no acervo do time ({collectionCards.length} cartas).
            </p>
            <p className="text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Todos os seus decks cadastrados permanecerão 100% salvos e protegidos.</span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowPurgeCollectionModal(false)}
              disabled={purgingCollection}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePurgeAllCollection}
              disabled={purgingCollection}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center gap-2"
            >
              {purgingCollection ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Zerando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar e Zerar Coleção</span>
                </>
              )}
            </button>
          </div>
        </div>
      </ModalPortal>

    </div>
  );
}
