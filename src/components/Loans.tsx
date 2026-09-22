import React, { useState, useEffect, useMemo } from 'react';
import { db, collectionCol, loansCol, membersCol } from '../lib/firebase';
import { getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Member, CardItem, LoanRecord } from '../types';
import { 
  ArrowLeftRight, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCw, 
  Sparkles,
  Info,
  ShieldCheck,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import PokemonSprite from './PokemonSprite';
import PokemonLoader from './PokemonLoader';
import { normalizeCollectionCards, getPTCGLId } from '../services/cardNormalizationService';
import { getAuthenticCardImageUrl } from '../utils/cardImages';

interface LoansProps {
  currentMember: Member;
}

export default function Loans({ currentMember }: LoansProps) {
  const [availableCards, setAvailableCards] = useState<CardItem[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestingCardId, setRequestingCardId] = useState<string | null>(null);
  const [requestQty, setRequestQty] = useState(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadData = async () => {
    if (!currentMember?.id) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      
      // 1. Load active lendable cards from all team members EXCEPT current user
      const cardsSnap = await getDocs(collectionCol);
      const rawCards = cardsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as CardItem))
        .filter(c => c && c.ownerId !== currentMember.id && Boolean(c.isLendable));
      // Normalização retroativa de dados priorizando o código e número oficial do PTCGL
      const normalizedCards = normalizeCollectionCards(rawCards);
      setAvailableCards(normalizedCards as any);

      // 2. Load all Loans
      const loansSnap = await getDocs(loansCol);
      const loansList = loansSnap.docs.map(d => ({ id: d.id, ...d.data() } as LoanRecord));
      setLoans(loansList);

      // 3. Load team members for avatar resolution
      const memSnap = await getDocs(membersCol);
      const memList = memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
      setMembers(memList);

    } catch (err: any) {
      console.error('Error loading loaning system data:', err);
      setErrorMessage(err?.message || 'Falha ao sincronizar dados de empréstimos com o Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMember?.id]);

  const handleRequestLoan = async (card: CardItem) => {
    if (!card || !currentMember) return;

    try {
      const quantityToBorrow = Math.min(Math.max(1, requestQty), card.quantity || 1);

      const newLoan: Omit<LoanRecord, 'id'> = {
        cardId: card.id || '',
        cardName: card.name || 'Carta sem nome',
        cardImageUrl: card.imageUrl || 'https://images.pokemontcg.io/sv1/1.png',
        ownerId: card.ownerId || '',
        ownerName: card.ownerName || 'Membro do Time',
        borrowerId: currentMember.id,
        borrowerName: currentMember.name || currentMember.nickname || 'Treinador Spirits',
        quantity: quantityToBorrow,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      const docRef = await addDoc(loansCol, newLoan);
      
      // Update local state with new record
      setLoans(prev => [...prev, { id: docRef.id, ...newLoan } as LoanRecord]);
      setRequestingCardId(null);
      setRequestQty(1);
      setNotification({
        type: 'success',
        message: `Solicitação de x${quantityToBorrow} ${card.name} enviada para ${card.ownerName || 'o proprietário'}!`
      });
    } catch (err: any) {
      console.error('Error requesting loan:', err);
      setNotification({
        type: 'error',
        message: 'Erro ao solicitar empréstimo. Verifique sua conexão e tente novamente.'
      });
    }
  };

  const handleApproveLoan = async (loan: LoanRecord) => {
    try {
      const loanRef = doc(db, 'loans', loan.id);
      await updateDoc(loanRef, {
        status: 'active',
        loanedAt: new Date().toISOString()
      });
      setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: 'active', loanedAt: new Date().toISOString() } : l));
      setNotification({
        type: 'success',
        message: `Empréstimo de "${loan.cardName}" aprovado para ${loan.borrowerName}!`
      });
    } catch (err: any) {
      console.error('Error approving loan:', err);
      setNotification({ type: 'error', message: 'Falha ao aprovar empréstimo.' });
    }
  };

  const handleDeclineLoan = async (loan: LoanRecord) => {
    try {
      const loanRef = doc(db, 'loans', loan.id);
      await updateDoc(loanRef, {
        status: 'declined'
      });
      setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: 'declined' } : l));
      setNotification({
        type: 'success',
        message: `Solicitação de "${loan.cardName}" recusada.`
      });
    } catch (err: any) {
      console.error('Error declining loan:', err);
      setNotification({ type: 'error', message: 'Falha ao recusar empréstimo.' });
    }
  };

  const handleCancelMyRequest = async (loanId: string) => {
    try {
      const loanRef = doc(db, 'loans', loanId);
      await deleteDoc(loanRef);
      setLoans(prev => prev.filter(l => l.id !== loanId));
      setNotification({
        type: 'success',
        message: 'Solicitação cancelada com sucesso.'
      });
    } catch (err: any) {
      console.error('Error canceling request:', err);
      setNotification({ type: 'error', message: 'Falha ao cancelar solicitação.' });
    }
  };

  const handleReturnLoan = async (loan: LoanRecord) => {
    try {
      const loanRef = doc(db, 'loans', loan.id);
      await updateDoc(loanRef, {
        status: 'returned',
        returnedAt: new Date().toISOString()
      });

      setLoans(prev => prev.map(l => 
        l.id === loan.id ? { ...l, status: 'returned', returnedAt: new Date().toISOString() } : l
      ));
      setConfirmReturnId(null);
      setNotification({
        type: 'success',
        message: `Devolução da carta "${loan.cardName}" confirmada com sucesso!`
      });
    } catch (err: any) {
      console.error('Error returning loan:', err);
      setNotification({
        type: 'error',
        message: 'Erro ao registrar devolução.'
      });
    }
  };

  const getMemberSprite = (userId?: string): string => {
    if (!userId) return 'substitute';
    const mem = members.find(m => m.id === userId);
    return mem?.avatarSprite || 'substitute';
  };

  // Safe filtering that will never throw TypeError on undefined properties
  const filteredCards = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return availableCards;
    return availableCards.filter(card => {
      const name = (card.name || '').toLowerCase();
      const owner = (card.ownerName || '').toLowerCase();
      const set = (card.setName || '').toLowerCase();
      return name.includes(term) || owner.includes(term) || set.includes(term);
    });
  }, [availableCards, searchTerm]);

  // Split loans into active categories with defensive null checks
  const myBorrowedCards = useMemo(() => {
    if (!currentMember?.id) return [];
    return loans.filter(l => l && l.borrowerId === currentMember.id && l.status === 'active');
  }, [loans, currentMember?.id]);

  const myLentCards = useMemo(() => {
    if (!currentMember?.id) return [];
    return loans.filter(l => l && l.ownerId === currentMember.id && l.status === 'active');
  }, [loans, currentMember?.id]);

  const pendingRequestsFromMe = useMemo(() => {
    if (!currentMember?.id) return [];
    return loans.filter(l => l && l.borrowerId === currentMember.id && l.status === 'pending');
  }, [loans, currentMember?.id]);

  const pendingRequestsToMe = useMemo(() => {
    if (!currentMember?.id) return [];
    return loans.filter(l => l && l.ownerId === currentMember.id && l.status === 'pending');
  }, [loans, currentMember?.id]);

  if (!currentMember) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="font-bold text-white text-sm">Nenhum jogador selecionado</p>
        <p className="text-xs text-slate-500 mt-1">Faça login ou selecione seu treinador no menu para acessar os empréstimos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="loans-system-view">
      
      {/* Header */}
      <div className="border-b border-slate-850 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🤝</span> Empréstimos Spirits
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Compartilhe e pegue emprestadas cartas raras do time de forma organizada. Rastreabilidade total com confirmação mútua!
          </p>
        </div>

        <button
          id="reload-loans-btn"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Toast Notification Banner */}
      {notification && (
        <div 
          id="loans-notification"
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success' 
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
              : 'bg-red-950/50 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 bg-red-900/50 hover:bg-red-900 text-white rounded text-[11px] font-bold cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Pending Approval Banner (when teammates requested cards from YOU) */}
      {pendingRequestsToMe.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Solicitações de Empréstimo Recebidas ({pendingRequestsToMe.length})</span>
          </div>
          <p className="text-xs text-slate-300">
            Seus colegas de time pediram para emprestar as cartas abaixo do seu acervo. Aprove ou recuse:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingRequestsToMe.map(req => (
              <div 
                key={req.id} 
                className="bg-slate-950/70 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img 
                    src={req.cardImageUrl || 'https://images.pokemontcg.io/sv1/1.png'} 
                    alt={req.cardName} 
                    className="w-9 h-12 object-contain rounded bg-slate-900 border border-slate-800 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{req.cardName} <span className="text-amber-400 font-mono">x{req.quantity}</span></h4>
                    <p className="text-[10px] text-slate-400 truncate">Solicitante: <strong className="text-slate-200">{req.borrowerName}</strong></p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`approve-loan-${req.id}`}
                    onClick={() => handleApproveLoan(req)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    <Check className="w-3 h-3" />
                    <span>Aprovar</span>
                  </button>
                  <button
                    id={`decline-loan-${req.id}`}
                    onClick={() => handleDeclineLoan(req)}
                    className="px-2 py-1 bg-slate-850 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-750 hover:border-red-500/30 font-semibold rounded text-[11px] cursor-pointer transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <PokemonLoader 
          pokemon="alakazam" 
          title="Consultando contratos de empréstimo..." 
          subtitle="Carregando acervo compartilhado e solicitações ativas..." 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLUMNS: Browse available cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Acervo Compartilhado do Time</span>
                  </h2>
                  <p className="text-xs text-slate-400">Cartas disponibilizadas por outros membros da Spirits para empréstimo competitivo</p>
                </div>
                
                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="borrow-search"
                    type="text"
                    placeholder="Buscar por carta, dono ou coleção..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-lg text-white text-xs outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {filteredCards.length === 0 ? (
                <div className="text-center py-16 px-4 text-slate-500 text-sm space-y-2">
                  <div className="text-2xl">🃏</div>
                  <p className="font-semibold text-slate-400">
                    {searchTerm ? 'Nenhuma carta encontrada para este filtro.' : 'Nenhuma carta compartilhada disponível no momento.'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchTerm 
                      ? 'Tente buscar por outro termo ou limpe o campo de busca.' 
                      : 'Incentive seus colegas de time a cadastrarem suas cartas sobressalentes na aba Coleção marcando como "Disponível para Empréstimo".'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredCards.map(card => {
                    const isRequesting = requestingCardId === card.id;
                    const hasPendingRequest = pendingRequestsFromMe.some(r => r.cardId === card.id);

                    return (
                      <div 
                        key={card.id} 
                        className="bg-slate-950/60 border border-slate-850 hover:border-purple-500/40 p-4 rounded-xl flex gap-3 transition-all duration-300 group"
                        id={`lend-card-${card.id}`}
                      >
                        <img 
                          src={card.imageUrl || 'https://images.pokemontcg.io/sv1/1.png'} 
                          alt={card.name || 'Card'} 
                          className="w-20 h-28 object-contain rounded border border-slate-800 bg-slate-900 shrink-0 group-hover:scale-105 transition-transform" 
                          referrerPolicy="no-referrer"
                        />
                        
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] uppercase font-mono text-purple-400 font-bold tracking-wider truncate block">
                                {card.setName || 'Coleção TCG'}
                              </span>
                              <span className="font-mono text-[9px] text-purple-300 font-bold bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-500/20 shrink-0">
                                {getPTCGLId(card)}
                              </span>
                            </div>
                            <h3 className="text-white font-bold text-sm mt-0.5 truncate" title={card.name}>
                              {card.name}
                            </h3>
                            
                            {/* Owner profile details */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <PokemonSprite name={getMemberSprite(card.ownerId)} size="sm" className="w-5 h-5 shrink-0" />
                              <span className="text-[11px] text-slate-400 truncate">
                                Dono: <strong className="text-slate-300 font-semibold">{card.ownerName || 'Membro'}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="mt-3">
                            {hasPendingRequest ? (
                              <div className="space-y-1">
                                <span className="text-[10px] bg-slate-900 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/20 font-bold block text-center">
                                  Solicitado (Aguardando)
                                </span>
                              </div>
                            ) : isRequesting ? (
                              <div className="space-y-2 bg-slate-900/90 p-2 rounded-lg border border-purple-500/30">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] text-slate-300 font-bold">Quantidade:</label>
                                  <div className="flex items-center gap-1">
                                    <input 
                                      id={`qty-input-${card.id}`}
                                      type="number" 
                                      min="1" 
                                      max={card.quantity || 1} 
                                      value={requestQty}
                                      onChange={(e) => setRequestQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                      className="w-12 px-1.5 py-0.5 bg-slate-950 border border-slate-750 text-white rounded text-xs font-mono text-center"
                                    />
                                    <span className="text-[10px] text-slate-500">/ {card.quantity || 1}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    id={`confirm-loan-${card.id}`}
                                    onClick={() => handleRequestLoan(card)}
                                    className="flex-1 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-[10px] cursor-pointer transition-all shadow-sm"
                                  >
                                    Confirmar Pedido
                                  </button>
                                  <button
                                    id={`cancel-loan-${card.id}`}
                                    onClick={() => setRequestingCardId(null)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded text-[10px] cursor-pointer transition-all"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                id={`request-loan-btn-${card.id}`}
                                onClick={() => {
                                  setRequestingCardId(card.id);
                                  setRequestQty(1);
                                }}
                                className="w-full py-1.5 bg-purple-950/60 hover:bg-purple-900 text-purple-300 hover:text-purple-100 font-bold rounded-lg text-xs border border-purple-500/20 hover:border-purple-500/40 cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm"
                              >
                                <span>Solicitar Empréstimo</span>
                                <span className="font-mono text-[10px] text-purple-400">(x{card.quantity || 1})</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

          {/* RIGHT COLUMN: Active and Pending Loans Panels */}
          <div className="space-y-6">
            
            {/* 1. Cards Borrowed by Me */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Cartas Comigo ({myBorrowedCards.length})</h2>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Em mãos</span>
              </div>

              {myBorrowedCards.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-3">Nenhuma carta do time emprestada com você atualmente.</p>
              ) : (
                <div className="space-y-3">
                  {myBorrowedCards.map(loan => {
                    const isConfirming = confirmReturnId === loan.id;

                    return (
                      <div key={loan.id} className="bg-slate-950/50 p-3 rounded-lg border border-slate-850 space-y-2">
                        <div className="flex gap-2.5 items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <img 
                              src={loan.cardImageUrl || 'https://images.pokemontcg.io/sv1/1.png'} 
                              alt={loan.cardName} 
                              className="w-8 h-11 object-contain rounded bg-slate-900 border border-slate-800 shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate" title={loan.cardName}>
                                {loan.cardName} <span className="text-purple-400 font-mono">x{loan.quantity}</span>
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate">Dono: <span className="text-slate-300 font-semibold">{loan.ownerName}</span></p>
                            </div>
                          </div>

                          {!isConfirming && (
                            <button
                              id={`return-borrow-${loan.id}`}
                              onClick={() => setConfirmReturnId(loan.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-purple-900 text-slate-300 hover:text-white font-semibold rounded text-[10px] cursor-pointer shrink-0 transition-all border border-slate-700"
                            >
                              Devolver
                            </button>
                          )}
                        </div>

                        {/* Inline Return Confirmation to prevent accidental clicks */}
                        {isConfirming && (
                          <div className="bg-purple-950/40 p-2 rounded-lg border border-purple-500/30 flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-purple-300">Confirmar devolução ao dono?</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleReturnLoan(loan)}
                                className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-[10px] cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmReturnId(null)}
                                className="px-2 py-0.5 bg-slate-800 text-slate-400 hover:text-white rounded text-[10px] cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. My Pending Requests (Waiting for owners to accept) */}
            {pendingRequestsFromMe.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white">Pedidos Pendentes ({pendingRequestsFromMe.length})</h2>
                  </div>
                  <span className="text-[10px] font-mono text-amber-500 uppercase">Aguardando</span>
                </div>

                <div className="space-y-2.5">
                  {pendingRequestsFromMe.map(req => (
                    <div key={req.id} className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-850/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={req.cardImageUrl || 'https://images.pokemontcg.io/sv1/1.png'} 
                          alt={req.cardName} 
                          className="w-7 h-10 object-contain rounded bg-slate-900 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{req.cardName} x{req.quantity}</h4>
                          <p className="text-[10px] text-slate-400 truncate">Com: {req.ownerName}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelMyRequest(req.id)}
                        className="px-2 py-0.5 text-slate-500 hover:text-red-400 text-[10px] font-semibold cursor-pointer shrink-0"
                        title="Cancelar solicitação"
                      >
                        Cancelar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Cards I have lent to others */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">Minhas Cartas Emprestadas ({myLentCards.length})</h2>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Seu acervo</span>
              </div>

              {myLentCards.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-3">Nenhuma carta sua está emprestada com outros jogadores.</p>
              ) : (
                <div className="space-y-3">
                  {myLentCards.map(loan => (
                    <div key={loan.id} className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 flex gap-2.5 items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={loan.cardImageUrl || 'https://images.pokemontcg.io/sv1/1.png'} 
                          alt={loan.cardName} 
                          className="w-8 h-11 object-contain rounded bg-slate-900 border border-slate-800 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate" title={loan.cardName}>
                            {loan.cardName} <span className="text-purple-400 font-mono">x{loan.quantity}</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">Com: <strong className="text-slate-300">{loan.borrowerName}</strong></p>
                        </div>
                      </div>

                      <button
                        id={`owner-return-${loan.id}`}
                        onClick={() => handleReturnLoan(loan)}
                        className="px-2.5 py-1 bg-purple-950/60 text-purple-300 hover:bg-purple-900 hover:text-white border border-purple-800/40 rounded text-[10px] font-semibold cursor-pointer shrink-0 transition-all"
                      >
                        Confirmar Retorno
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions Info panel */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <Info className="w-4 h-4" />
                <h3 className="text-xs uppercase tracking-wide">Como funciona?</h3>
              </div>
              <ul className="text-[11px] text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
                <li>Cadastre as cartas raras sobressalentes que você tem no seu acervo pessoal através da aba <strong>Coleção</strong>.</li>
                <li>Marque-as como "Disponível para Empréstimo" para permitir solicitações dos parceiros de treino.</li>
                <li>Quando um colega pedir as cartas, você receberá a solicitação para aprovar diretamente nesta tela ou no <strong>Dashboard</strong>.</li>
                <li>Após torneios ou treinos, clique em <strong>Devolver</strong> para manter o controle do estoque 100% atualizado.</li>
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

