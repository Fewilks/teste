import React, { useState, useEffect } from 'react';
import { db, collectionCol } from '../lib/firebase';
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
  Info
} from 'lucide-react';
import PokemonSprite from './PokemonSprite';
import PokemonLoader from './PokemonLoader';
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

  // Collection tab state: 'my' (Minha Coleção) or 'team' (Acervo do Time)
  const [collectionTab, setCollectionTab] = useState<'my' | 'team'>('my');

  // Load user collection or whole team collection
  useEffect(() => {
    async function fetchCollection() {
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

      {/* Tab Selectors */}
      <div className="flex gap-2 bg-slate-900/40 p-1.5 rounded-xl border border-slate-800/65 max-w-sm">
        <button
          id="collection-tab-my"
          onClick={() => setCollectionTab('my')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            collectionTab === 'my'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          👤 Minha Coleção
        </button>
        <button
          id="collection-tab-team"
          onClick={() => setCollectionTab('team')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            collectionTab === 'team'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          👥 Acervo do Time
        </button>
      </div>

      {/* 2. Collection Content Grid */}
      {loading ? (
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
          {collectionCards.map(card => (
            <div 
              key={card.id} 
              className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(147,51,234,0.05)] transition-all duration-300 group flex flex-col justify-between backdrop-blur-md"
              id={`collection-card-${card.id}`}
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
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="add-card-modal">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-900/40 to-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-lg">🃏</span>
                <h3 className="text-base font-bold text-white">Adicionar Carta ao seu Acervo</h3>
              </div>
              <button 
                id="close-modal-x"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedCard(null);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search form */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/50">
              <form onSubmit={handleDatabaseSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                  <input
                    id="modal-card-search-input"
                    type="text"
                    placeholder="Busque cartas em inglês ou português (ex: Charizard ex, Iono, Arven...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-sans"
                  />
                </div>
                
                {/* Collection Filter */}
                <div className="w-full sm:w-56 shrink-0">
                  <select
                    id="modal-set-filter"
                    value={selectedSet}
                    onChange={(e) => setSelectedSet(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg text-white text-sm outline-none font-sans cursor-pointer"
                  >
                    <option value="">Todas as Coleções</option>
                    {sets.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  id="modal-search-submit"
                  type="submit"
                  disabled={searching}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {searching ? 'Buscando...' : 'Pesquisar'}
                </button>
              </form>
              <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3 text-purple-400 shrink-0" />
                <span>As cartas adicionadas são sincronizadas com a base de dados global do Pokémon TCG.</span>
              </div>
            </div>

            {/* Modal Body: Grid search results or card details form */}
            <div className="p-5 overflow-y-auto flex-1 bg-slate-900/50">
              
              {/* If we have selected a card, show options to save */}
              {selectedCard ? (
                <div className="flex flex-col sm:flex-row gap-6 animate-fade-in" id="add-details-form">
                  <div className="w-full sm:w-1/3 flex justify-center">
                    <img 
                      src={getAuthenticCardImageUrl(selectedCard)} 
                      alt={selectedCard.name} 
                      className="max-h-64 object-contain rounded-lg drop-shadow-lg" 
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
                  
                  <div className="flex-1 space-y-6">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-purple-400">{selectedCard.setName || 'Coleção'}</span>
                      <h4 className="text-xl font-bold text-white mt-1">{selectedCard.name}</h4>
                      <div className="card-data-field text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>Coleção: <strong className="text-slate-200">{selectedCard.setName}</strong></span>
                        <span>•</span>
                        <span>Código Oficial PTCGL: <strong className="font-mono text-purple-300 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">{getPTCGLId(selectedCard)}</strong></span>
                      </div>
                    </div>

                    {/* Quantity selection */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase">Quantidade de cópias:</label>
                      <div className="flex items-center gap-3">
                        <button 
                          id="btn-qty-dec"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-extrabold flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xl font-bold font-mono text-white w-12 text-center">{quantity}</span>
                        <button 
                          id="btn-qty-inc"
                          onClick={() => setQuantity(q => q + 1)}
                          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-extrabold flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Share option */}
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850 space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          id="checkbox-is-lendable"
                          type="checkbox"
                          checked={isLendable}
                          onChange={(e) => setIsLendable(e.target.checked)}
                          className="mt-1 accent-purple-600 rounded"
                        />
                        <div>
                          <span className="text-sm font-bold text-white block">Compartilhar com o time Spirits</span>
                          <span className="text-xs text-slate-400">Permitir que outros membros solicitem empréstimo desta carta. Ninguém perde cartas, o portal rastreia o histórico!</span>
                        </div>
                      </label>
                    </div>

                    {/* Submit choices */}
                    <div className="flex gap-3 pt-4">
                      <button
                        id="btn-submit-add-card"
                        onClick={handleAddCardToDb}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl cursor-pointer"
                      >
                        Salvar na Minha Coleção
                      </button>
                      <button
                        id="btn-cancel-add-card"
                        onClick={() => setSelectedCard(null)}
                        className="px-5 py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl cursor-pointer"
                      >
                        Voltar para Busca
                      </button>
                    </div>

                  </div>
                </div>
              ) : (
                /* Show search results grid */
                <div className="space-y-4">
                  {searching ? (
                    <div className="text-center py-10 flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 text-sm mt-3 font-mono">Pesquisando base de dados nacional/internacional...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      Digite o nome de uma carta acima (ex: "Gardevoir", "Iono") e clique em Pesquisar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="modal-search-results">
                      {searchResults.map((card) => (
                        <div
                          key={card.id}
                          onClick={() => handleOpenAdd(card)}
                          className="bg-slate-950/60 hover:bg-slate-950 p-2.5 rounded-xl border border-slate-850 hover:border-purple-500/50 cursor-pointer transition-all duration-300 group flex flex-col justify-between"
                          id={`search-result-${card.id}`}
                        >
                          <div className="aspect-[3/4] flex items-center justify-center relative mb-2">
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
                          <div>
                            <div className="text-white font-bold text-xs truncate group-hover:text-purple-400 transition-colors">{card.name}</div>
                            <div className="card-data-field text-[9px] text-slate-400 mt-0.5 flex items-center justify-between">
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

          </div>
        </div>
      )}

    </div>
  );
}
