import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Store, 
  MapPin, 
  Calendar, 
  Clock, 
  Globe, 
  Instagram, 
  Ticket, 
  AlertTriangle, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  X, 
  Share2, 
  Flame, 
  MessageCircle, 
  Map, 
  Trash2, 
  Edit3,
  CalendarDays,
  ChevronRight,
  RotateCcw,
  Award
} from 'lucide-react';
import { Tournament, TournamentTier, TournamentSpotsStatus, Member } from '../types';
import { db, tournamentsCol, seedTournamentsIfEmpty } from '../lib/firebase';
import { 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import PokemonSprite from './PokemonSprite';

interface TournamentsProps {
  currentMember: Member;
}

// Cidades de destaque da Região Centro-Oeste Paulista
export const CENTRO_OESTE_CITIES = [
  'Bauru',
  'Marília',
  'Botucatu',
  'Jaú',
  'Assis',
  'Ourinhos',
  'Lins',
  'Lençóis Paulista',
  'Bariri',
  'Garça',
  'São Manuel'
];

export const isCentroOesteCity = (city?: string) => {
  if (!city) return false;
  const c = city.toLowerCase();
  return CENTRO_OESTE_CITIES.some(co => c.includes(co.toLowerCase()));
};

export const isMajorChampionship = (t: Tournament) => {
  const tier = (t.tier || '').toLowerCase();
  const name = (t.name || '').toLowerCase();
  return (
    tier.includes('regional') ||
    tier.includes('copa') ||
    tier.includes('cup') ||
    tier.includes('special') ||
    name.includes('regional') ||
    name.includes('copa') ||
    name.includes('major') ||
    (t.maxSpots && t.maxSpots >= 32)
  );
};

export default function Tournaments({ currentMember }: TournamentsProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('todas');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'centro_oeste' | 'majors' | 'sp_region' | 'soon' | 'confirmed'>('centro_oeste');
  const [selectedTier, setSelectedTier] = useState('todos');
  const [refreshing, setRefreshing] = useState(false);

  // Modal de cadastro / edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulário
  const [formName, setFormName] = useState('');
  const [formStoreName, setFormStoreName] = useState('');
  const [formCity, setFormCity] = useState('Bauru');
  const [formState, setFormState] = useState('SP');
  const [formAddress, setFormAddress] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('13:30');
  const [formFormat, setFormFormat] = useState('Standard (Padrão)');
  const [formTier, setFormTier] = useState<TournamentTier>('Copa de Liga');
  const [formEntryFee, setFormEntryFee] = useState('R$ 55,00');
  const [formPrizes, setFormPrizes] = useState('50 Championship Points (CP) + Troféu + Booster Boxes');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formInstagramUrl, setFormInstagramUrl] = useState('');
  const [formRegistrationUrl, setFormRegistrationUrl] = useState('');
  const [formReservationNotes, setFormReservationNotes] = useState('⚠️ Faça a sua reserva com antecedência! Vagas limitadas.');
  const [formMaxSpots, setFormMaxSpots] = useState<number | ''>(48);
  const [formSpotsStatus, setFormSpotsStatus] = useState<TournamentSpotsStatus>('open');
  const [formNotes, setFormNotes] = useState('');

  // 1. Carregar lista em tempo real com Firestore onSnapshot
  useEffect(() => {
    setLoading(true);
    // Assegura que as lojas reais (MadCat Bauru, Legacy TCG, Houzze Jaú, Regional SP) sejam semeadas
    seedTournamentsIfEmpty().catch(err => console.error('Erro ao verificar sementes:', err));

    const q = query(tournamentsCol);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Tournament[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
      // Ordena por data mais próxima
      items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setTournaments(items);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao buscar torneios:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Forçar atualização do banco com as lojas do Centro-Oeste e Grandes Campeonatos
  const handleRefreshCentroOeste = async () => {
    try {
      setRefreshing(true);
      await seedTournamentsIfEmpty(true);
    } catch (e) {
      console.error('Erro ao recarregar:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Cidades únicas disponíveis
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    tournaments.forEach(t => {
      if (t.city?.trim()) set.add(t.city.trim());
    });
    return Array.from(set).sort();
  }, [tournaments]);

  // Cálculos de data e contagem regressiva
  const getEventTimeDiff = (dateStr: string) => {
    if (!dateStr) return { days: 999, label: 'Data a definir', isSoon: false, isToday: false, isPast: false };
    
    // Normaliza para início do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = dateStr.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);
    eventDate.setHours(0, 0, 0, 0);

    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, label: 'Já realizado', isSoon: false, isToday: false, isPast: true };
    }
    if (diffDays === 0) {
      return { days: 0, label: 'É HOJE!', isSoon: true, isToday: true, isPast: false };
    }
    if (diffDays === 1) {
      return { days: 1, label: 'AMANHÃ!', isSoon: true, isToday: false, isPast: false };
    }
    if (diffDays <= 7) {
      return { days: diffDays, label: `Faltam ${diffDays} dias`, isSoon: true, isToday: false, isPast: false };
    }
    return { days: diffDays, label: `Em ${diffDays} dias`, isSoon: false, isToday: false, isPast: false };
  };

  // Filtragem dos campeonatos
  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      // Busca
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(queryLower);
        const matchesStore = t.storeName.toLowerCase().includes(queryLower);
        const matchesCity = t.city.toLowerCase().includes(queryLower);
        const matchesAddress = t.address?.toLowerCase().includes(queryLower);
        if (!matchesName && !matchesStore && !matchesCity && !matchesAddress) return false;
      }

      // Cidade
      if (selectedCity !== 'todas' && t.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // Tier
      if (selectedTier !== 'todos' && t.tier !== selectedTier) {
        return false;
      }

      // Filtros rápidos
      const diff = getEventTimeDiff(t.date);

      if (selectedFilter === 'centro_oeste') {
        if (!isCentroOesteCity(t.city)) return false;
      } else if (selectedFilter === 'majors') {
        if (!isMajorChampionship(t)) return false;
      } else if (selectedFilter === 'sp_region') {
        const c = (t.city || '').toLowerCase();
        if (!c.includes('são paulo') && !c.includes('campinas') && !c.includes('santos') && !c.includes('sorocaba')) return false;
      } else if (selectedFilter === 'soon') {
        if (!diff.isSoon || diff.isPast) return false;
      } else if (selectedFilter === 'confirmed') {
        const confirmed = (t.confirmedMemberIds || []).includes(currentMember.id);
        if (!confirmed) return false;
      }

      return true;
    });
  }, [tournaments, searchQuery, selectedCity, selectedTier, selectedFilter, currentMember.id]);

  // Próximo evento em destaque (o mais próximo que não seja passado)
  const nextSpotlightTournament = useMemo(() => {
    // Prioriza torneio do centro-oeste ou grande campeonato
    const upcoming = tournaments.filter(t => !getEventTimeDiff(t.date).isPast);
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [tournaments]);

  // Ação: Confirmar ou Desmarcar presença do membro
  const handleToggleAttendance = async (tournament: Tournament) => {
    try {
      const isAttending = (tournament.confirmedMemberIds || []).includes(currentMember.id);
      let updatedIds = [...(tournament.confirmedMemberIds || [])];
      let updatedNames = [...(tournament.confirmedMemberNames || [])];

      const memberName = currentMember.nickname || currentMember.name;

      if (isAttending) {
        updatedIds = updatedIds.filter(id => id !== currentMember.id);
        updatedNames = updatedNames.filter(name => name !== memberName && name !== currentMember.name);
      } else {
        updatedIds.push(currentMember.id);
        updatedNames.push(memberName);
      }

      const ref = doc(db, 'tournaments', tournament.id);
      await updateDoc(ref, {
        confirmedMemberIds: updatedIds,
        confirmedMemberNames: updatedNames
      });
    } catch (err) {
      console.error('Erro ao atualizar presença no torneio:', err);
    }
  };

  // Abrir modal para novo torneio (cadastro manual limpo)
  const handleOpenCreateModal = () => {
    setEditingTournament(null);
    setFormName('');
    setFormStoreName('');
    setFormCity('Bauru');
    setFormState('SP');
    setFormAddress('');
    setFormDate('');
    setFormTime('10:00');
    setFormFormat('Standard (Padrão)');
    setFormTier('Copa de Liga');
    setFormEntryFee('R$ 60,00');
    setFormPrizes('');
    setFormWebsiteUrl('');
    setFormInstagramUrl('');
    setFormRegistrationUrl('');
    setFormReservationNotes('⚠️ Faça a sua reserva antecipada! Vagas limitadas.');
    setFormMaxSpots(32);
    setFormSpotsStatus('open');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditModal = (t: Tournament) => {
    setEditingTournament(t);
    setFormName(t.name);
    setFormStoreName(t.storeName);
    setFormCity(t.city);
    setFormState(t.state || 'SP');
    setFormAddress(t.address || '');
    setFormDate(t.date);
    setFormTime(t.time || '13:30');
    setFormFormat(t.format || 'Standard (Padrão)');
    setFormTier((t.tier as TournamentTier) || 'Copa de Liga');
    setFormEntryFee(t.entryFee || '');
    setFormPrizes(t.prizes || '');
    setFormWebsiteUrl(t.websiteUrl || '');
    setFormInstagramUrl(t.instagramUrl || '');
    setFormRegistrationUrl(t.registrationUrl || '');
    setFormReservationNotes(t.reservationNotes || '');
    setFormMaxSpots(t.maxSpots || '');
    setFormSpotsStatus(t.spotsStatus || 'open');
    setFormNotes(t.notes || '');
    setIsModalOpen(true);
  };

  // Deletar campeonato
  const handleDeleteTournament = async (t: Tournament) => {
    if (!window.confirm(`Tem certeza que deseja remover o campeonato "${t.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'tournaments', t.id));
    } catch (err) {
      console.error('Erro ao excluir torneio:', err);
    }
  };

  // Salvar novo / editado
  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStoreName.trim() || !formCity.trim() || !formDate.trim()) {
      alert('Por favor, preencha o Nome do torneio, Loja, Cidade e Data.');
      return;
    }

    setSaving(true);
    try {
      const id = editingTournament ? editingTournament.id : `tourn-${Date.now()}`;
      
      // Normaliza URLs de Instagram
      let formattedInsta = formInstagramUrl.trim();
      if (formattedInsta && !formattedInsta.startsWith('http') && !formattedInsta.includes('instagram.com')) {
        const handle = formattedInsta.replace('@', '');
        formattedInsta = `https://instagram.com/${handle}`;
      }

      // Normaliza URL de site
      let formattedWebsite = formWebsiteUrl.trim();
      if (formattedWebsite && !formattedWebsite.startsWith('http')) {
        formattedWebsite = `https://${formattedWebsite}`;
      }

      // Normaliza URL de registro/WhatsApp
      let formattedRegistration = formRegistrationUrl.trim();
      if (formattedRegistration && !formattedRegistration.startsWith('http')) {
        const onlyDigits = formattedRegistration.replace(/\D/g, '');
        if (onlyDigits.length >= 10) {
          formattedRegistration = `https://wa.me/55${onlyDigits}?text=Ol%C3%A1%2C%20gostaria%20de%20reservar%20minha%20vaga%20para%20o%20torneio`;
        } else {
          formattedRegistration = `https://${formattedRegistration}`;
        }
      }

      const tournamentData: Tournament = {
        id,
        name: formName.trim(),
        storeName: formStoreName.trim(),
        city: formCity.trim(),
        state: formState.trim().toUpperCase(),
        address: formAddress.trim(),
        date: formDate.trim(),
        time: formTime.trim(),
        format: formFormat.trim(),
        tier: formTier,
        entryFee: formEntryFee.trim(),
        prizes: formPrizes.trim(),
        websiteUrl: formattedWebsite,
        instagramUrl: formattedInsta,
        registrationUrl: formattedRegistration,
        reservationNotes: formReservationNotes.trim(),
        maxSpots: formMaxSpots ? Number(formMaxSpots) : undefined,
        spotsStatus: formSpotsStatus,
        confirmedMemberIds: editingTournament?.confirmedMemberIds || [],
        confirmedMemberNames: editingTournament?.confirmedMemberNames || [],
        notes: formNotes.trim(),
        createdById: editingTournament?.createdById || currentMember.id,
        createdByName: editingTournament?.createdByName || currentMember.nickname || currentMember.name,
        createdAt: editingTournament?.createdAt || new Date().toISOString()
      };

      // Remove undefined properties to prevent Firestore serialization errors
      Object.keys(tournamentData).forEach(k => {
        if ((tournamentData as any)[k] === undefined) {
          delete (tournamentData as any)[k];
        }
      });

      await setDoc(doc(db, 'tournaments', id), tournamentData);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar torneio:', err);
      alert('Erro ao salvar torneio. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Helper para formatar data bonita (ex: 26 de Setembro de 2026 - Sábado)
  const formatDatePretty = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      const formatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      return `${formatted} (${weekday.charAt(0).toUpperCase() + weekday.slice(1)})`;
    } catch {
      return dateStr;
    }
  };

  // Helper de cores para o Tier
  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'Regional':
        return 'bg-gradient-to-r from-rose-900 to-red-800 text-rose-100 border-rose-500/60 font-black shadow-md';
      case 'Copa de Liga':
        return 'bg-purple-900/70 text-purple-200 border-purple-500/50 font-black';
      case 'Special Event':
        return 'bg-amber-900/70 text-amber-200 border-amber-500/50 font-black';
      case 'Desafio de Liga':
        return 'bg-blue-900/60 text-blue-300 border-blue-500/40';
      case 'Prerelease':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Helper de vagas
  const getSpotsStatusBadge = (status?: TournamentSpotsStatus) => {
    switch (status) {
      case 'limited':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Poucas Vagas
          </span>
        );
      case 'soldout':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Esgotado
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Encerrado
          </span>
        );
      case 'open':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Vagas Abertas
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. TOPO: Título e Identificação da Região Centro-Oeste Paulista */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/70 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-purple-600/20 rounded-xl border border-amber-500/30 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Campeonatos & Torneios Oficiais
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-mono font-bold">
                  Cadastro Manual • Informações Reais
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-350 mt-0.5">
                Cadastre e gerencie manualmente os torneios com datas, horários e valores exatos para o <strong>Centro-Oeste Paulista (Bauru, Marília, etc.)</strong> e Grandes Campeonatos.
              </p>
            </div>
          </div>

          {/* Cidades e Lojas atendidas */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Lojas da Região:</span>
            {['MadCat Bauru (R. Joaquim da Silva Martha, 680)', 'Legacy TCG Bauru', 'Houzze TCG Jaú', 'Rayearth Botucatu'].map((hub, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md font-mono text-slate-300">
                {hub}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
          <a
            href="https://events.pokemon.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:border-slate-600"
            title="Abrir o localizador oficial de eventos Play! Pokémon em nova aba"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Consultar Play! Pokémon</span>
          </a>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Campeonato
          </button>
        </div>
      </div>

      {/* 2. BANNER DE ALERTA: PRÓXIMO GRANDE CAMPEONATO CHEGANDO! */}
      {nextSpotlightTournament && (() => {
        const diff = getEventTimeDiff(nextSpotlightTournament.date);
        const isAttending = (nextSpotlightTournament.confirmedMemberIds || []).includes(currentMember.id);
        const isCO = isCentroOesteCity(nextSpotlightTournament.city);
        const isMajor = isMajorChampionship(nextSpotlightTournament);

        return (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-slate-900/95 to-purple-950/50 p-5 md:p-6 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md animate-pulse">
                    <Flame className="w-3.5 h-3.5" />
                    🚨 ALERTA DE CHEGANDO: {diff.label.toUpperCase()}
                  </span>
                  
                  {isMajor && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm">
                      <Award className="w-3 h-3" />
                      GRANDE CAMPEONATO OFICIAL
                    </span>
                  )}

                  {isCO && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 border border-indigo-500/50 text-indigo-300">
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      CENTRO-OESTE PAULISTA
                    </span>
                  )}

                  <span className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-bold ${getTierBadge(nextSpotlightTournament.tier)}`}>
                    {nextSpotlightTournament.tier || 'Torneio'}
                  </span>
                  {getSpotsStatusBadge(nextSpotlightTournament.spotsStatus)}
                </div>

                <div>
                  <h3 className="text-lg md:text-2xl font-black text-white tracking-tight">
                    {nextSpotlightTournament.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs md:text-sm text-slate-300 mt-1.5">
                    <span className="flex items-center gap-1.5 font-bold text-amber-300">
                      <Store className="w-4 h-4 text-amber-400 shrink-0" />
                      {nextSpotlightTournament.storeName}
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      {nextSpotlightTournament.city} - {nextSpotlightTournament.state || 'SP'}
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-purple-300">
                      <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                      {formatDatePretty(nextSpotlightTournament.date)} às {nextSpotlightTournament.time || '13:30'}
                    </span>
                  </div>
                </div>

                {nextSpotlightTournament.reservationNotes && (
                  <div className="p-3 bg-amber-950/60 border border-amber-500/35 rounded-xl text-xs text-amber-200 flex items-start gap-2 max-w-2xl">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300 block mb-0.5">Faça a sua Reserva com Antecedência!</strong>
                      <span>{nextSpotlightTournament.reservationNotes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação Imediata no Banner */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
                {nextSpotlightTournament.registrationUrl ? (
                  <a
                    href={nextSpotlightTournament.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-950/40 hover:shadow-emerald-900/60 transition-all text-center cursor-pointer"
                  >
                    <Ticket className="w-4 h-4" />
                    Faça a sua Reserva Agora!
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                ) : (
                  <div className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                    Reserva presencial na Loja
                  </div>
                )}

                <button
                  onClick={() => handleToggleAttendance(nextSpotlightTournament)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isAttending
                      ? 'bg-purple-900/60 text-purple-200 border-purple-500 hover:bg-purple-800/80'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-purple-500 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${isAttending ? 'text-purple-400' : 'text-slate-500'}`} />
                  {isAttending ? 'Presença Confirmada Spirits!' : 'Marcar Minha Presença (Spirits)'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. BARRA DE FILTROS E BUSCA FOCADA NO CENTRO-OESTE E GRANDES EVENTOS */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por campeonato, loja (ex: Legião Nerd, Arena Geek), cidade ou endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-xs md:text-sm outline-none font-medium placeholder-slate-500"
            />
          </div>

          {/* Filtro por Cidade */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold shrink-0 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> Cidade:
            </span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none font-medium focus:border-purple-500 cursor-pointer"
            >
              <option value="todas">Todas as Cidades ({tournaments.length})</option>
              <optgroup label="📍 Centro-Oeste Paulista">
                {uniqueCities.filter(c => isCentroOesteCity(c)).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
              <optgroup label="⚡ Grande SP e Arredores">
                {uniqueCities.filter(c => !isCentroOesteCity(c)).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Filtro por Formato */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold shrink-0 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-slate-500" /> Categoria:
            </span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none font-medium focus:border-purple-500 cursor-pointer"
            >
              <option value="todos">Todos os Formatos</option>
              <option value="Copa de Liga">Copa de Liga (League Cup)</option>
              <option value="Regional">Regional (Major 200 CP)</option>
              <option value="Special Event">Special Event (Major 100 CP)</option>
              <option value="Desafio de Liga">Desafio de Liga (League Challenge)</option>
            </select>
          </div>
        </div>

        {/* Chips de filtro rápido por Região & Porte */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-850">
          <span className="text-[11px] text-slate-500 font-semibold">Filtros rápidos:</span>
          
          <button
            onClick={() => setSelectedFilter('centro_oeste')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === 'centro_oeste' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <MapPin className="w-3 h-3 text-purple-400" />
            📍 Centro-Oeste Paulista (Bauru, Marília, etc.)
          </button>

          <button
            onClick={() => setSelectedFilter('majors')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === 'majors' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'bg-slate-950 text-slate-300 hover:text-amber-300 border border-slate-800'
            }`}
          >
            <Award className="w-3 h-3 text-amber-400" />
            🏆 Apenas Campeonatos Grandes (Regionais & Copas)
          </button>

          <button
            onClick={() => setSelectedFilter('soon')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === 'soon' 
                ? 'bg-red-600 text-white shadow-md' 
                : 'bg-slate-950 text-slate-300 hover:text-red-300 border border-slate-800'
            }`}
          >
            <Flame className="w-3 h-3 text-red-400" />
            🔥 Chegando (Próximos 7 dias)
          </button>

          <button
            onClick={() => setSelectedFilter('sp_region')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === 'sp_region' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-950 text-slate-300 hover:text-blue-300 border border-slate-800'
            }`}
          >
            <Store className="w-3 h-3 text-blue-400" />
            ⚡ Região de São Paulo
          </button>

          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === 'all' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({tournaments.length})
          </button>

          <button
            onClick={() => setSelectedFilter('confirmed')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === 'confirmed' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-slate-950 text-slate-300 hover:text-emerald-300 border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Minha Presença
          </button>
        </div>
      </div>

      {/* 4. LISTAGEM DE CARDS DE CAMPEONATO */}
      {loading ? (
        <div className="bg-slate-900/40 p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Carregando os grandes campeonatos do Centro-Oeste e SP...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="bg-slate-900/40 p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-800/80 rounded-2xl border border-slate-700 mx-auto flex items-center justify-center text-slate-500">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-white font-bold text-base">Nenhum campeonato encontrado com este filtro</h4>
            <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
              Experimente clicar em "Todos" ou use o botão para sincronizar os torneios oficiais do Centro-Oeste Paulista.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRefreshCentroOeste}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recarregar Torneios Oficiais
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Campeonato
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTournaments.map(tournament => {
            const diff = getEventTimeDiff(tournament.date);
            const isAttending = (tournament.confirmedMemberIds || []).includes(currentMember.id);
            const attendingMembers = tournament.confirmedMemberNames || [];
            const isCO = isCentroOesteCity(tournament.city);
            const isMajor = isMajorChampionship(tournament);

            return (
              <div 
                key={tournament.id} 
                className={`bg-slate-900/70 rounded-2xl border transition-all duration-200 hover:shadow-xl flex flex-col justify-between overflow-hidden ${
                  diff.isToday 
                    ? 'border-red-500/60 shadow-red-950/30 ring-1 ring-red-500/40' 
                    : diff.isSoon 
                      ? 'border-amber-500/40 shadow-amber-950/20' 
                      : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Topo do Card */}
                <div className="p-5 space-y-4">
                  
                  {/* Badges de Destaque: Major, Centro-Oeste, Tier e Vagas */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isMajor && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm">
                          <Award className="w-3 h-3" />
                          GRANDE CAMPEONATO
                        </span>
                      )}

                      {isCO ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 border border-indigo-500/50 text-indigo-300">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          CENTRO-OESTE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          REGIÃO SP
                        </span>
                      )}

                      <span className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-bold ${getTierBadge(tournament.tier)}`}>
                        {tournament.tier || 'Torneio'}
                      </span>
                    </div>

                    {/* Alerta de Contagem Regressiva */}
                    <div className="shrink-0">
                      {diff.isToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-600 text-white shadow-sm animate-pulse">
                          🔴 É HOJE!
                        </span>
                      ) : diff.isSoon ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Flame className="w-3 h-3 text-amber-400 animate-bounce" />
                          🚨 CHEGANDO ({diff.label})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono font-medium">
                          {diff.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nome do Torneio */}
                  <div>
                    <h3 className="text-base md:text-lg font-black text-white leading-snug">
                      {tournament.name}
                    </h3>
                    <p className="text-xs text-purple-400 font-semibold mt-0.5">
                      Formato: {tournament.format || 'Standard'}
                    </p>
                  </div>

                  {/* Informações da Loja e Localização (Requisito Principal) */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 space-y-2.5 text-xs">
                    
                    {/* Nome da Loja */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-white font-bold">
                        <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                          <Store className="w-4 h-4" />
                        </div>
                        <span className="text-amber-300 text-sm font-black">{tournament.storeName}</span>
                      </div>
                      {getSpotsStatusBadge(tournament.spotsStatus)}
                    </div>

                    {/* Cidade e Endereço */}
                    <div className="flex items-start gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white text-xs sm:text-sm">{tournament.city} - {tournament.state || 'SP'}</span>
                        {tournament.address && (
                          <div className="text-[11px] text-slate-400">
                            {tournament.address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data e Horário */}
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="font-semibold text-slate-200">
                        {formatDatePretty(tournament.date)} às <span className="text-amber-300 font-bold">{tournament.time || '13:30'}</span>
                      </span>
                    </div>

                    {/* Inscrição e Premiação Oficial */}
                    {(tournament.entryFee || tournament.prizes) && (
                      <div className="pt-2 border-t border-slate-850/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                        {tournament.entryFee && (
                          <span className="text-slate-300">
                            <strong className="text-slate-400">Inscrição:</strong> {tournament.entryFee}
                          </span>
                        )}
                        {tournament.prizes && (
                          <span className="text-amber-300/90 truncate max-w-xs font-semibold" title={tournament.prizes}>
                            🏆 {tournament.prizes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Links da Loja (Site e Instagram) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {tournament.websiteUrl && (
                      <a
                        href={tournament.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm"
                        title="Abrir site oficial da loja ou plataforma"
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        Site da Loja / Evento
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    )}

                    {tournament.instagramUrl && (
                      <a
                        href={tournament.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/40 to-pink-900/40 hover:from-purple-900/60 hover:to-pink-900/60 text-pink-300 hover:text-pink-200 text-xs font-semibold border border-pink-500/30 transition-all cursor-pointer shadow-sm"
                        title="Abrir Instagram oficial da loja"
                      >
                        <Instagram className="w-3.5 h-3.5 text-pink-400" />
                        Instagram da Loja
                        <ExternalLink className="w-3 h-3 text-pink-400/70" />
                      </a>
                    )}

                    {tournament.address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tournament.storeName}, ${tournament.address}, ${tournament.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                        title="Ver rota no Google Maps"
                      >
                        <Map className="w-3.5 h-3.5 text-emerald-400" />
                        Ver Rota
                      </a>
                    )}
                  </div>

                  {/* Chamada para Reserva e Notas */}
                  {tournament.reservationNotes && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300/90 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-300 block">Faça a sua reserva!</span>
                        <p className="text-[11px] leading-relaxed">{tournament.reservationNotes}</p>
                      </div>
                    </div>
                  )}

                  {/* Membros do Time Spirits Confirmados */}
                  <div className="pt-2 border-t border-slate-850">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1.5 font-bold text-slate-300">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        Presença Spirits ({attendingMembers.length}):
                      </span>
                      {tournament.maxSpots && (
                        <span className="text-[11px] font-mono text-slate-500">
                          Capacidade: {tournament.maxSpots} vagas
                        </span>
                      )}
                    </div>

                    {attendingMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {attendingMembers.map((name, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 text-[11px] font-bold"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Nenhum membro do time confirmou ainda. Seja o primeiro!
                      </p>
                    )}
                  </div>

                </div>

                {/* Rodapé do Card: Ações de Reserva e Presença */}
                <div className="p-4 bg-slate-950/80 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3">
                  
                  {/* Botão de Reserva */}
                  {tournament.registrationUrl ? (
                    <a
                      href={tournament.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950/40 transition-all cursor-pointer text-center"
                    >
                      <Ticket className="w-4 h-4" />
                      Faça a sua Reserva
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  ) : (
                    <div className="text-[11px] text-slate-500 text-center sm:text-left">
                      Inscrição direto na loja
                    </div>
                  )}

                  {/* Botão de Presença Spirits */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleToggleAttendance(tournament)}
                      className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isAttending
                          ? 'bg-purple-900/60 text-purple-300 border-purple-500 hover:bg-purple-800'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isAttending ? 'text-purple-400' : 'text-slate-500'}`} />
                      {isAttending ? 'Confirmado' : 'Eu Vou! 🙋‍♂️'}
                    </button>

                    {/* Editar e Excluir */}
                    <button
                      onClick={() => handleOpenEditModal(tournament)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="Editar campeonato"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTournament(tournament)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all cursor-pointer"
                      title="Excluir campeonato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base md:text-lg">
                  {editingTournament ? 'Editar Campeonato' : 'Cadastrar Grande Campeonato'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveTournament} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Sugestões Rápidas de Cidade do Centro-Oeste */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400">Sugestões de Cidades do Centro-Oeste Paulista & SP:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Bauru', 'Marília', 'Botucatu', 'Jaú', 'Assis', 'Ourinhos', 'São Paulo', 'Campinas'].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setFormCity(city)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        formCity.toLowerCase() === city.toLowerCase()
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome do Campeonato */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Nome do Campeonato / Torneio: <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Copa de Liga Pokémon Bauru - Major Centro-Oeste"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium"
                  required
                />
              </div>

              {/* Loja e Cidade (Requisito Principal) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Nome da Loja do Evento: <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: MadCat Bauru, Legacy TCG Bauru, Houzze TCG"
                    value={formStoreName}
                    onChange={(e) => setFormStoreName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium"
                    required
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      { name: 'MadCat Bauru', city: 'Bauru', addr: 'Rua Vereador Joaquim da Silva Martha, 680', ig: 'https://www.instagram.com/madcatbauru/' },
                      { name: 'Legacy TCG', city: 'Bauru', addr: 'Av. Duque de Caxias, 9-78', web: 'https://www.legacytcg.com.br', ig: 'https://www.instagram.com/legacytcgbauru/' },
                      { name: 'Houzze TCG', city: 'Jaú', addr: 'Rua Lourenço Prado, 809 - Centro', ig: 'https://www.instagram.com/houzzetcg/' },
                      { name: 'Rayearth Games', city: 'Botucatu', addr: 'Botucatu, SP' },
                      { name: 'Expo Center Norte', city: 'São Paulo', addr: 'Rua José Bernardo Pinto, 333', web: 'https://rk9.gg', ig: 'https://www.instagram.com/copagpokemon/' },
                      { name: 'Bazar Magic', city: 'São Paulo', addr: 'Rua Domingos de Morais, 814', web: 'https://www.bazarmagic.com.br', ig: 'https://www.instagram.com/bazarmagicoficial/' },
                    ].map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => {
                          setFormStoreName(s.name);
                          setFormCity(s.city);
                          if (s.addr) setFormAddress(s.addr);
                          if (s.ig) setFormInstagramUrl(s.ig);
                          if (s.web) setFormWebsiteUrl(s.web);
                        }}
                        className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        +{s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Cidade: <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Bauru, Marília"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      UF:
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="SP"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value.toUpperCase())}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium uppercase text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço Físico */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Endereço da Loja:
                </label>
                <input
                  type="text"
                  placeholder="ex: Rua Gustavo Maciel, 21-45 - Vila Cidade Universitária"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium"
                />
              </div>

              {/* Data, Horário e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Data do Evento: <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium cursor-pointer"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Horário de Início:
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Tipo / Tier:
                  </label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as TournamentTier)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium cursor-pointer"
                  >
                    <option value="Copa de Liga">Copa de Liga (League Cup - 50 CP)</option>
                    <option value="Regional">Regional (Major - 200 CP)</option>
                    <option value="Special Event">Special Event (Major - 100 CP)</option>
                    <option value="Desafio de Liga">Desafio de Liga (15 CP)</option>
                    <option value="Torneio Local">Torneio Local</option>
                  </select>
                </div>
              </div>

              {/* Links da Loja (Site e Instagram) - Requisito explícito */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-3">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Redes e Links da Loja
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-400" /> Link do Site da Loja / RK9:
                    </label>
                    <input
                      type="text"
                      placeholder="ex: https://legiaonerdbauru.com.br ou https://rk9.gg"
                      value={formWebsiteUrl}
                      onChange={(e) => setFormWebsiteUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-xs outline-none font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <Instagram className="w-3.5 h-3.5 text-pink-400" /> Instagram da Loja:
                    </label>
                    <input
                      type="text"
                      placeholder="ex: @legiaonerdbauru ou link do Instagram"
                      value={formInstagramUrl}
                      onChange={(e) => setFormInstagramUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-xs outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Reserva e Inscrição (Faça a sua Reserva) */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5" /> Reserva de Vagas & Inscrição
                </span>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> Link de Inscrição / WhatsApp da Loja:
                    </label>
                    <input
                      type="text"
                      placeholder="ex: https://wa.me/5514999998888 ou número com DDD"
                      value={formRegistrationUrl}
                      onChange={(e) => setFormRegistrationUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-xs outline-none font-medium"
                    />
                    <p className="text-[10px] text-slate-500">Insira link do WhatsApp da loja ou link do RK9 para os jogadores garantirem a vaga.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Alerta / Mensagem de Reserva:
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Faça a sua reserva! Vagas limitadas para o Centro-Oeste Paulista no WhatsApp da loja."
                      value={formReservationNotes}
                      onChange={(e) => setFormReservationNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-xs outline-none font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Status das Vagas:
                      </label>
                      <select
                        value={formSpotsStatus}
                        onChange={(e) => setFormSpotsStatus(e.target.value as TournamentSpotsStatus)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-xs outline-none font-medium cursor-pointer"
                      >
                        <option value="open">Vagas Abertas</option>
                        <option value="limited">Poucas Vagas / Limitadas</option>
                        <option value="soldout">Esgotado</option>
                        <option value="ended">Encerrado</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Capacidade Máxima (Jogadores):
                      </label>
                      <input
                        type="number"
                        placeholder="ex: 48"
                        value={formMaxSpots}
                        onChange={(e) => setFormMaxSpots(e.target.value ? Number(e.target.value) : '')}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-xs outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Taxa de Inscrição e Premiação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Valor da Inscrição:
                  </label>
                  <input
                    type="text"
                    placeholder="ex: R$ 55,00"
                    value={formEntryFee}
                    onChange={(e) => setFormEntryFee(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Premiação:
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 50 Championship Points (CP) + Troféu + Booster Boxes"
                    value={formPrizes}
                    onChange={(e) => setFormPrizes(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-sm outline-none font-medium"
                  />
                </div>
              </div>

              {/* Observações e Regras */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Regras / Requisitos (Decklist, check-in, etc.):
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Decklist obrigatória via RK9 ou impressa até 13:00. Sleeves oficiais ou opacos em bom estado."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white text-xs outline-none font-medium"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      {editingTournament ? 'Salvar Alterações' : 'Publicar Grande Campeonato'}
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
