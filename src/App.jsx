import React, { useState, useEffect } from 'react';
import { 
  Wallet, LayoutDashboard, Car, AlertTriangle, Settings, Calendar, 
  ChevronDown, Bell, CheckCircle, Trash2, List, TrendingUp, TrendingDown, Edit3, X, ArrowRightLeft, CreditCard
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import UberHub from './components/UberHub';
import CardsHub from './components/CardsHub';

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('profinances_currentPage') || 'dashboard');

  useEffect(() => {
    localStorage.setItem('profinances_currentPage', currentPage);
  }, [currentPage]);
  
  // Filtro de Mês Global
  const today = new Date();
  const [filterMonth, setFilterMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`); 

  // Estado dos Dados
  const [dashboard, setDashboard] = useState({ comprometido: 0, realizado: 0, sobras: 0, receitasRecebidas: 0, despesasPagas: 0 });
  const [despesas, setDespesas] = useState([]);
  const [selectedPayables, setSelectedPayables] = useState([]);
  const [deleteReceitaId, setDeleteReceitaId] = useState(null);
  const [receitas, setReceitas] = useState({ receitas: [], uber_total: 0 });
  const [contasFixas, setContasFixas] = useState([]);
  const [reliefDataState, setReliefDataState] = useState({ labels: [], data: [] });
  const [settings, setSettings] = useState({
    meta_faturamento_pessoal: '5000', meta_mes_uber: '2500', meta_hora_uber: '35', meta_km_uber: '2', jornada_semanal_uber: '5', km_troca_oleo: '0', responsaveis: 'Davi, Larissa', categorias_despesas: 'Moradia, Alimentação, Carro, Educação, Lazer, Outros'
  });
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('geral');
  const [toast, setToast] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };
  
  // Modais Customizados
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [despesaToPay, setDespesaToPay] = useState(null);
  const [payForm, setPayForm] = useState({ valor: '', data_pagamento: '' });
  const [isUnpayModalOpen, setIsUnpayModalOpen] = useState(false);
  const [despesaToUnpay, setDespesaToUnpay] = useState(null);

  const [isNewReceitaModal, setIsNewReceitaModal] = useState(false);
  const [newReceitaForm, setNewReceitaForm] = useState({ nome: '', valor: '', data: new Date().toISOString().split('T')[0] });

  const [isNewDespesaModal, setIsNewDespesaModal] = useState(false);
  const [newDespesaForm, setNewDespesaForm] = useState({ nome: '', valor: '', vencimento: new Date().toISOString().split('T')[0], categoria: 'Outros', forma_pagamento: 'Dinheiro' });

  const [isNewFixaModal, setIsNewFixaModal] = useState(false);
  const [newFixaForm, setNewFixaForm] = useState({ nome: '', valor_estimado: '', dia_vencimento: 10, tipo_valor: 'FIXO' });
  const [isDeleteFixaModalOpen, setIsDeleteFixaModalOpen] = useState(false);
  const [fixaToDelete, setFixaToDelete] = useState(null);

  const fetchData = () => {
    fetch(`/api/dashboard/${filterMonth}`).then(res => res.json()).then(setDashboard).catch(console.error);
    fetch(`/api/despesas/${filterMonth}`).then(res => res.json()).then(data => {
      const sorted = [...data].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
        if (a.status === 'pendente') return a.vencimento.localeCompare(b.vencimento);
        const dateA = a.data_pagamento || a.vencimento;
        const dateB = b.data_pagamento || b.vencimento;
        return dateB.localeCompare(dateA);
      });
      setDespesas(sorted);
    }).catch(console.error);
    fetch(`/api/receitas/${filterMonth}`).then(res => res.json()).then(setReceitas).catch(console.error);
    fetch(`/api/contas_fixas`).then(res => res.json()).then(setContasFixas).catch(console.error);
    fetch(`/api/settings`).then(res => res.json()).then(data => {
      if(Object.keys(data).length > 0) setSettings(data);
    }).catch(console.error);
    fetch(`/api/relief/${filterMonth}`).then(res => res.json()).then(data => {
      setReliefDataState({
        labels: data.map(r => {
          const [y, m] = r.month.split('-');
          return `${m}/${y}`;
        }),
        data: data.map(r => r.total)
      });
    }).catch(console.error);
  };
  useEffect(() => {
    fetchData();
  }, [filterMonth]);

  // Ações - Despesas
  const [editingDespesaId, setEditingDespesaId] = useState(null);
  
  const handleDeleteDespesa = async (id) => {
    await fetch(`/api/despesas/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const openPayModal = (despesa) => {
    setDespesaToPay(despesa);
    setPayForm({ valor: despesa.valor, data_pagamento: new Date().toISOString().split('T')[0] });
    setIsPayModalOpen(true);
  };

  const confirmPayDespesa = async (e) => {
    e.preventDefault();
    await fetch(`/api/despesas/${despesaToPay.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pago', valor: payForm.valor, data_pagamento: payForm.data_pagamento })
    });
    setIsPayModalOpen(false);
    fetchData();
  };

  const togglePayableSelection = (id) => {
    if (selectedPayables.includes(id)) {
      setSelectedPayables(selectedPayables.filter(item => item !== id));
    } else {
      setSelectedPayables([...selectedPayables, id]);
    }
  };

  const handleSelectAllPayables = (e) => {
    if (e.target.checked) {
      const pendingIds = despesas.filter(d => d.status === 'pendente').map(d => d.id);
      setSelectedPayables(pendingIds);
    } else {
      setSelectedPayables([]);
    }
  };

  const handleBulkPay = async () => {
    if (selectedPayables.length === 0) return;
    const promises = selectedPayables.map(id => {
      const despesa = despesas.find(d => d.id === id);
      if (!despesa) return Promise.resolve();
      return fetch(`/api/despesas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pago', valor: despesa.valor, data_pagamento: new Date().toISOString().split('T')[0] })
      });
    });
    await Promise.all(promises);
    setSelectedPayables([]);
    fetchData();
  };

  const openUnpayModal = (despesa) => {
    setDespesaToUnpay(despesa);
    setIsUnpayModalOpen(true);
  };

  const confirmUnpayDespesa = async () => {
    if (!despesaToUnpay) return;
    await fetch(`/api/despesas/${despesaToUnpay.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pendente', valor: despesaToUnpay.valor, data_pagamento: null })
    });
    setIsUnpayModalOpen(false);
    fetchData();
  };

  const openNewDespesaModal = () => {
    setEditingDespesaId(null);
    setNewDespesaForm({ nome: '', valor: '', vencimento: new Date().toISOString().split('T')[0], categoria: 'Outros', forma_pagamento: 'Dinheiro' });
    setIsNewDespesaModal(true);
  };

  const openEditDespesa = (despesa) => {
    setEditingDespesaId(despesa.id);
    setNewDespesaForm({ 
      nome: despesa.nome, 
      valor: despesa.valor, 
      vencimento: despesa.vencimento, 
      categoria: despesa.categoria, 
      forma_pagamento: despesa.forma_pagamento 
    });
    setIsNewDespesaModal(true);
  };

  const handleCreateDespesa = async (e) => {
    e.preventDefault();
    if(editingDespesaId) {
      await fetch(`/api/despesas/${editingDespesaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDespesaForm)
      });
      setEditingDespesaId(null);
    } else {
      await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDespesaForm)
      });
    }
    setIsNewDespesaModal(false);
    setNewDespesaForm({ nome: '', valor: '', vencimento: new Date().toISOString().split('T')[0], categoria: 'Outros', forma_pagamento: 'Dinheiro' });
    fetchData();
  };

  // Ações - Receitas
  const [editingReceitaId, setEditingReceitaId] = useState(null);

  const openNewReceitaModal = () => {
    setEditingReceitaId(null);
    const firstResponsavel = settings.responsaveis ? settings.responsaveis.split(',')[0].trim() : 'Davi';
    setNewReceitaForm({ nome: '', valor: '', data: new Date().toISOString().split('T')[0], responsavel: firstResponsavel });
    setIsNewReceitaModal(true);
  };

  const openEditReceita = (receita) => {
    setEditingReceitaId(receita.id);
    setNewReceitaForm({ nome: receita.nome, valor: receita.valor, data: receita.data, responsavel: receita.responsavel });
    setIsNewReceitaModal(true);
  };

  const handleCreateReceita = async (e) => {
    e.preventDefault();
    if(editingReceitaId) {
      await fetch(`/api/receitas/${editingReceitaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReceitaForm)
      });
      setEditingReceitaId(null);
    } else {
      await fetch('/api/receitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReceitaForm)
      });
    }
    setIsNewReceitaModal(false);
    setNewReceitaForm({ nome: '', valor: '', data: new Date().toISOString().split('T')[0] });
    fetchData();
  };
  const handleDeleteReceita = (id) => {
    setDeleteReceitaId(id);
  };
  
  const confirmDeleteReceita = async () => {
    if (!deleteReceitaId) return;
    await fetch(`/api/receitas/${deleteReceitaId}`, { method: 'DELETE' });
    setDeleteReceitaId(null);
    fetchData();
  };

  // Ações - Fixas
  const [editingFixaId, setEditingFixaId] = useState(null);

  const openNewFixaModal = () => {
    setEditingFixaId(null);
    setNewFixaForm({ nome: '', valor_estimado: '', dia_vencimento: 10, tipo_valor: 'FIXO', parcelas_totais: '', mes_inicio: filterMonth, categoria: 'Outros', valor_entrada: '' });
    setIsNewFixaModal(true);
  };

  const openEditFixa = (fixa) => {
    setEditingFixaId(fixa.id);
    setNewFixaForm({ 
      nome: fixa.nome, 
      valor_estimado: fixa.valor_estimado, 
      dia_vencimento: fixa.dia_vencimento, 
      tipo_valor: fixa.tipo_valor,
      parcelas_totais: fixa.parcelas_totais || '',
      mes_inicio: fixa.mes_inicio || '',
      categoria: fixa.categoria || 'Outros',
      valor_entrada: ''
    });
    setIsNewFixaModal(true);
  };

  const handleCreateFixa = async (e) => {
    e.preventDefault();
    if(editingFixaId) {
      await fetch(`/api/contas_fixas/${editingFixaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFixaForm)
      });
      setEditingFixaId(null);
    } else {
      await fetch('/api/contas_fixas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFixaForm)
      });
    }
    setIsNewFixaModal(false);
    setNewFixaForm({ nome: '', valor_estimado: '', dia_vencimento: 10, tipo_valor: 'FIXO', categoria: 'Outros', valor_entrada: '' });
    fetchData();
  };
  const handleDeleteFixa = (id) => {
    setFixaToDelete(id);
    setIsDeleteFixaModalOpen(true);
  };

  const confirmDeleteFixa = async () => {
    if(!fixaToDelete) return;
    await fetch(`/api/contas_fixas/${fixaToDelete}`, { method: 'DELETE' });
    setIsDeleteFixaModalOpen(false);
    setFixaToDelete(null);
    fetchData();
  };

  // Ações - Configurações
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    for(const key of Object.keys(settings)) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key] })
      });
    }
    fetchData();
    fetchData();
    showToast("Configurações salvas com sucesso!");
    setTimeout(() => setIsSettingsModalOpen(false), 1500);
  };

  const TagInput = ({ value, onChange, placeholder }) => {
    const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
    const [input, setInput] = useState('');
    
    const addTag = (e) => {
      if(e.key === 'Enter' && input.trim()) {
        e.preventDefault();
        if(!tags.includes(input.trim())) {
          onChange([...tags, input.trim()].join(', '));
        }
        setInput('');
      }
    };
    
    const removeTag = (tagToRemove) => {
      onChange(tags.filter(t => t !== tagToRemove).join(', '));
    };

    return (
      <div className="border border-gray-200 rounded-md p-2 flex flex-wrap gap-2 items-center bg-white focus-within:border-[#C87941] w-full">
        {tags.map(t => (
          <span key={t} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded flex items-center">
            {t} <button type="button" onClick={() => removeTag(t)} className="ml-1 text-gray-400 hover:text-red-500"><X className="w-3 h-3"/></button>
          </span>
        ))}
        <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={addTag} placeholder={placeholder} className="flex-1 outline-none text-sm min-w-[120px]" />
      </div>
    );
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  // Paleta Terrosa
  const colors = {
    bg: 'bg-[#F9F8F6]', sidebar: 'bg-[#2D2A26]', action: 'bg-[#C87941] hover:bg-[#b06a39]', textAction: 'text-[#C87941]',
    positive: 'text-[#7A8B76]', bgPositive: 'bg-[#7A8B76]', negative: 'text-[#A35C5C]', bgNegative: 'bg-[#A35C5C]'
  };

  // Progress Bar Dashboard
  const percentConsumed = dashboard.receitasRecebidas > 0 ? Math.min((dashboard.despesasPagas / dashboard.receitasRecebidas) * 100, 100) : 0;

  // Cálculos Avançados para os Gráficos
  const receitasDavi = receitas.receitas.filter(r => r.responsavel === 'Davi').reduce((acc, curr) => acc + curr.valor, 0) + receitas.uber_total;
  const receitasTotais = receitas.receitas.reduce((acc, curr) => acc + curr.valor, 0) + receitas.uber_total;
  const despesasTotaisMes = despesas.reduce((acc, curr) => acc + curr.valor, 0); 
  const uberLucroMes = receitas.uber_total;

  const metaPessoal = parseFloat(settings.meta_faturamento_pessoal) || 5000;
  const metaUber = parseFloat(settings.meta_mes_uber) || 2500;

  // Cálculos Dinâmicos Uber
  const jornadaSemanalUber = parseInt(settings.jornada_semanal_uber) || 5;
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  
  let metaUberSemanalDinamica = 0;
  let metaUberDiariaDinamica = 0;
  
  if (filterMonth === mesAtual) {
    const ultimoDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diasRestantesNoMes = ultimoDiaDoMes - hoje.getDate() + 1; // Inclui o dia de hoje
    const semanasRestantes = diasRestantesNoMes / 7;
    const faltaFaturarUber = Math.max(metaUber - uberLucroMes, 0);
    
    if (semanasRestantes > 0) {
      metaUberSemanalDinamica = faltaFaturarUber / semanasRestantes;
      metaUberDiariaDinamica = metaUberSemanalDinamica / jornadaSemanalUber;
    }
  } else {
    const [anoStr, mesStr] = filterMonth.split('-');
    const diasNoMes = new Date(parseInt(anoStr), parseInt(mesStr), 0).getDate();
    const semanasNoMes = diasNoMes / 7;
    metaUberSemanalDinamica = metaUber / semanasNoMes;
    metaUberDiariaDinamica = metaUberSemanalDinamica / jornadaSemanalUber;
  }
  
  const zeroAZeroProgress = despesasTotaisMes > 0 ? Math.min((receitasTotais / despesasTotaisMes) * 100, 100) : 100;

  const despesasPorCategoria = despesas.reduce((acc, curr) => {
    acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
    return acc;
  }, {});
  
  const categoryDonut = {
    labels: Object.keys(despesasPorCategoria),
    datasets: [{
      data: Object.values(despesasPorCategoria),
      backgroundColor: ['#2D2A26', '#C87941', '#7A8B76', '#A35C5C', '#E8C872', '#4B6584', '#8854D0', '#D1D5DB'],
      borderWidth: 1, borderColor: '#fff'
    }]
  };

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const barData = {
    labels: dashboard?.history ? dashboard.history.map(h => monthNames[parseInt(h.month.split('/')[0], 10) - 1] || h.month) : ['Resumo do Mês'],
    datasets: [
      { label: 'Saídas (R$)', data: dashboard?.history ? dashboard.history.map(h => h.saidas) : [despesasTotaisMes], backgroundColor: '#A35C5C', borderRadius: 4 },
      { label: 'Entradas (R$)', data: dashboard?.history ? dashboard.history.map(h => h.entradas) : [receitasTotais], backgroundColor: '#7A8B76', borderRadius: 4 }
    ]
  };

  const personalDonut = {
    labels: ['Realizado', 'Faltante'],
    datasets: [{
      data: [receitasDavi, Math.max(metaPessoal - receitasDavi, 0)],
      backgroundColor: ['#C87941', '#F9F8F6'],
      hoverBackgroundColor: ['#b06a39', '#F9F8F6'],
      borderWidth: 1, borderColor: '#eee'
    }]
  };

  const uberDonut = {
    labels: ['Lucro Uber', 'Restante'],
    datasets: [{
      data: [uberLucroMes, Math.max(metaUber - uberLucroMes, 0)],
      backgroundColor: ['#2D2A26', '#F9F8F6'],
      hoverBackgroundColor: ['#1a1916', '#F9F8F6'],
      borderWidth: 1, borderColor: '#eee'
    }]
  };

  // 6 Meses de projeção (agora vindo do backend)
  const reliefLineData = {
    labels: reliefDataState.labels,
    datasets: [{
        label: 'Contas Fixas Projetadas (R$)',
        data: reliefDataState.data,
        borderColor: '#C87941',
      backgroundColor: 'rgba(122, 139, 118, 0.1)',
      tension: 0.3,
      fill: true
    }]
  };


  const kmTrocaOleo = parseFloat(settings.km_troca_oleo || 0);
  const maxKm = parseFloat(dashboard?.max_km || 0);
  const showOilAlert = kmTrocaOleo > 0 && maxKm > 0 && (kmTrocaOleo - maxKm <= 1000);
  const oilAlertRemaining = kmTrocaOleo - maxKm;
  const oilAlertColor = oilAlertRemaining <= 100 ? 'bg-red-500' : 'bg-[#C87941]';

  return (
    <div className={`flex h-screen w-full ${colors.bg} overflow-hidden text-gray-800 font-sans`}>
      {/* SIDEBAR MINIMALISTA */}
      <aside className={`w-64 ${colors.sidebar} flex flex-col z-10 transition-all`}>
        <div className="h-20 flex items-center px-8">
          <span className="text-white font-light text-xl tracking-widest uppercase">PRO <span className="font-bold text-[#C87941]">Finances</span></span>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-1">
          <button onClick={() => setCurrentPage('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Dashboard</span>
          </button>
          <button onClick={() => setCurrentPage('uber')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'uber' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Car className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Uber Hub</span>
          </button>
          <button onClick={() => setCurrentPage('incomes')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'incomes' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <TrendingUp className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Receitas</span>
          </button>
          <button onClick={() => setCurrentPage('cartoes')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'cartoes' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <CreditCard className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Cartões</span>
          </button>
          <button onClick={() => setCurrentPage('payables')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'payables' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <List className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Contas a Pagar</span>
          </button>
          <button onClick={() => setCurrentPage('fixed')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'fixed' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Calendar className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Contas Fixas</span>
          </button>
        </nav>
        
        <div className="px-4 py-6 mt-auto border-t border-white/5">
          <button onClick={() => setIsSettingsModalOpen(true)} className={`w-full flex items-center px-4 py-3 rounded-md transition-all text-gray-400 hover:text-white hover:bg-white/5`}>
            <Settings className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Configurações</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
        <header className="pt-8 pb-6 flex items-center justify-between px-10 sticky top-0 z-30 bg-[#F9F8F6]">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-light text-gray-800">
              {currentPage === 'dashboard' && 'Saúde Financeira'}
              {currentPage === 'payables' && 'Contas a Pagar'}
              {currentPage === 'incomes' && 'Receitas'}
              {currentPage === 'fixed' && 'Configurar Contas Fixas'}
              {currentPage === 'uber' && 'Uber Hub - Frota & Corridas'}
              {currentPage === 'cartoes' && 'Gestão de Cartões'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center bg-white border border-gray-200 rounded-md px-4 py-2 shadow-sm">
              <Calendar className={`w-4 h-4 ${colors.textAction} mr-3`} />
              <input 
                type="month" 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
                className="outline-none text-gray-700 font-medium bg-transparent cursor-pointer"
              />
            </div>
            <div className="relative">
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative p-2 text-gray-400 hover:text-gray-800 transition-all">
                <Bell className="w-5 h-5" />
                {showOilAlert && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F9F8F6]"></span>}
              </button>
              {isNotificationsOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in">
                  <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Notificações</span>
                    {showOilAlert && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">1 Nova</span>}
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {showOilAlert ? (
                      <div className={`p-3 rounded-md mb-2 flex items-start space-x-3 ${oilAlertColor.includes('red') ? 'bg-red-50' : 'bg-orange-50'}`}>
                        <div className={`p-2 rounded-full ${oilAlertColor.includes('red') ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-sm font-bold ${oilAlertColor.includes('red') ? 'text-red-800' : 'text-orange-800'}`}>Troca de Óleo</h4>
                          <p className={`text-xs mt-1 ${oilAlertColor.includes('red') ? 'text-red-600' : 'text-orange-600'}`}>
                            {oilAlertRemaining <= 0 ? 'Já passou do momento de trocar o óleo!' : `Faltam apenas ${Math.max(0, oilAlertRemaining).toLocaleString('pt-BR')} KM.`}
                          </p>
                          <button onClick={() => { setIsNotificationsOpen(false); setIsSettingsModalOpen(true); setActiveSettingsTab('uber'); }} className={`text-xs underline mt-2 ${oilAlertColor.includes('red') ? 'text-red-700' : 'text-orange-700'}`}>Atualizar Configuração</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-400">Nenhuma notificação no momento.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className={`w-9 h-9 rounded-full ${colors.bgPositive} flex items-center justify-center text-white font-bold shadow-sm`}>DR</div>
          </div>
        </header>

        <div className="p-10 space-y-10 max-w-6xl mx-auto w-full">
          
          {/* DASHBOARD GERAL */}
          {currentPage === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-500 font-light">Resumo financeiro e projeções do mês atual.</p>
              </div>
              {/* Cards Superiores - Resumo Financeiro */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                  <h3 className="text-sm font-semibold tracking-widest uppercase text-gray-400 mb-2">Comprometido</h3>
                  <p className={`text-4xl font-light ${colors.negative}`}>{formatCurrency(dashboard.comprometido)}</p>
                  <p className="text-xs text-gray-400 mt-3">Soma do que falta pagar este mês.</p>
                </div>
                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                  <h3 className="text-sm font-semibold tracking-widest uppercase text-gray-400 mb-2">Falta Faturar (Break-even)</h3>
                  <p className={`text-4xl font-light ${dashboard.breakEven > 0 ? 'text-gray-800' : colors.positive}`}>
                    {dashboard.breakEven > 0 ? formatCurrency(dashboard.breakEven) : 'Break-even!'}
                  </p>
                  <p className="text-xs text-gray-400 mt-3">Quanto falta ganhar pra cobrir os custos do mês.</p>
                </div>
                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1 ${dashboard.projecaoSobras >= 0 ? colors.bgPositive : colors.bgNegative}`}></div>
                  <h3 className="text-sm font-semibold tracking-widest uppercase text-gray-400 mb-2">Projeção de Sobra Livre</h3>
                  <p className={`text-4xl font-light ${dashboard.projecaoSobras >= 0 ? colors.positive : colors.negative}`}>{formatCurrency(dashboard.projecaoSobras)}</p>
                  <p className="text-xs text-gray-400 mt-3">Sua Meta Global de Faturamento subtraindo todas as Contas.</p>
                </div>
              </div>

              {/* Grid de Gráficos Secundários */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Entradas x Saídas */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Entradas vs Saídas do Mês</h3>
                  <div className="h-48 w-full">
                    <Bar data={barData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </div>

                {/* Zero a Zero */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Equalização</h3>
                  <p className="text-sm text-gray-500 mb-6">Receitas vs Despesas.</p>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-gray-500">Progresso</span>
                    <span className="text-xl font-light text-gray-800">{zeroAZeroProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner mb-4">
                    <div className={`h-full transition-all duration-1000 ${zeroAZeroProgress >= 100 ? colors.bgPositive : 'bg-[#C87941]'}`} style={{ width: `${zeroAZeroProgress}%` }}></div>
                  </div>
                  <div className="flex justify-between w-full text-xs text-gray-500 font-medium">
                    <span>Receitas: <strong className="text-[#7A8B76]">{formatCurrency(receitasTotais)}</strong></span>
                    <span>Despesas: <strong className="text-[#A35C5C]">{formatCurrency(despesasTotaisMes)}</strong></span>
                  </div>
                </div>

                {/* Meta Mensal Uber Hub */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col relative">
                  <h3 className="text-lg font-medium text-gray-800 mb-1 w-full text-left">Progresso Uber Hub</h3>
                  <p className="text-sm text-gray-400 mb-4 w-full text-left">Meta: {formatCurrency(metaUber)}</p>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-32 h-32 relative mb-2">
                      <Doughnut data={uberDonut} options={{ cutout: '75%', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } } }} />
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-sm font-bold text-gray-800">{Math.min((uberLucroMes/metaUber)*100, 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-center mb-4">
                      Realizado: {formatCurrency(uberLucroMes)}
                    </div>
                  </div>
                  <div className="w-full mt-auto flex justify-between items-end border-t border-gray-100 pt-3">
                    <div className="text-left">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Meta Diária</p>
                      <p className={`font-medium text-sm ${metaUberDiariaDinamica > 0 ? 'text-[#C87941]' : 'text-[#7A8B76]'}`}>{metaUberDiariaDinamica > 0 ? formatCurrency(metaUberDiariaDinamica) : 'Batida!'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Meta Semanal</p>
                      <p className={`font-medium text-sm ${metaUberSemanalDinamica > 0 ? 'text-[#C87941]' : 'text-[#7A8B76]'}`}>{metaUberSemanalDinamica > 0 ? formatCurrency(metaUberSemanalDinamica) : 'Batida!'}</p>
                    </div>
                  </div>
                </div>

                {/* Meta Faturamento Pessoal */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center relative">
                  <h3 className="text-lg font-medium text-gray-800 mb-1 w-full text-left">Faturamento Pessoal (Davi)</h3>
                  <p className="text-sm text-gray-400 mb-4 w-full text-left">Meta: {formatCurrency(metaPessoal)}</p>
                  <div className="w-32 h-32 relative">
                    <Doughnut data={personalDonut} options={{ cutout: '75%', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } } }} />
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-bold text-[#C87941]">{Math.min((receitasDavi/metaPessoal)*100, 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500 text-center">
                    Realizado: {formatCurrency(receitasDavi)}
                  </div>
                </div>

                {/* Gráfico de Categorias */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center relative">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 w-full text-left">Despesas por Categoria</h3>
                  <div className="w-48 h-48 relative">
                    {Object.keys(despesasPorCategoria).length > 0 ? (
                      <Doughnut data={categoryDonut} options={{ maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } } }} />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-300 text-xs text-center">Nenhuma despesa</div>
                    )}
                  </div>
                </div>

                {/* Projeção de Alívio */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col">
                  <h3 className="text-lg font-medium text-gray-800 mb-1">Projeção de Contas Fixas</h3>
                  <p className="text-sm text-gray-400 mb-4">Evolução do seu custo de vida nos próximos meses.</p>
                  <div className="h-48 w-full">
                    <Line data={reliefLineData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* UBER HUB */}
          {currentPage === 'uber' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-500 font-light">Gerenciamento completo das suas corridas e gastos com a frota.</p>
              </div>
              <UberHub 
                fetchGlobalData={fetchData} 
                colors={colors} 
                formatCurrency={formatCurrency} 
                globalMonth={filterMonth}
                settings={settings}
                metaUberDiaria={metaUberDiariaDinamica}
                metaUberSemanal={metaUberSemanalDinamica}
                lucroMes={uberLucroMes}
              />
            </div>
          )}

          {/* CARTÕES HUB */}
          {currentPage === 'cartoes' && (
            <div className="animate-fade-in">
              <CardsHub filterMonth={filterMonth} />
            </div>
          )}

          {/* SETTINGS (REMOVIDO DA MAIN) */}

          {/* CONTAS A PAGAR */}
          {currentPage === 'payables' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-gray-500 font-light">Gerencie suas despesas pendentes e pagas do mês.</p>
                  <p className="text-2xl font-bold text-[#A35C5C] mt-1">Total: {formatCurrency(despesas.reduce((acc, d) => acc + d.valor, 0))}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedPayables([]); }} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-2.5 rounded-md font-medium shadow-sm transition-all text-sm tracking-wide">
                    {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar'}
                  </button>
                  <button onClick={openNewDespesaModal} className={`${colors.action} text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition-all text-sm tracking-wide`}>+ Nova Despesa</button>
                </div>
              </div>

              {isSelectionMode && (
                <div className="bg-[#C87941]/10 border border-[#C87941]/20 rounded-xl p-4 mb-4 flex justify-between items-center animate-fade-in">
                  <div className="text-gray-800 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-300 text-[#C87941] focus:ring-[#C87941] cursor-pointer"
                             checked={despesas.filter(d => d.status === 'pendente').length > 0 && selectedPayables.length === despesas.filter(d => d.status === 'pendente').length}
                             onChange={handleSelectAllPayables} />
                      <span className="text-sm font-medium">Selecionar Tudo</span>
                    </div>
                    <span>
                      <span className="font-semibold text-[#C87941]">{selectedPayables.length}</span> contas. Total: <span className="font-bold">{formatCurrency(despesas.filter(d => selectedPayables.includes(d.id)).reduce((acc, d) => acc + d.valor, 0))}</span>
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedPayables([])} className="text-gray-500 hover:text-gray-700 text-sm font-medium px-2 py-1">Desmarcar</button>
                    <button onClick={handleBulkPay} disabled={selectedPayables.length === 0} className={`${selectedPayables.length > 0 ? colors.action : 'bg-gray-300'} text-white px-5 py-2 rounded-md text-sm font-medium transition shadow-sm`}>Pagar Selecionadas</button>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="py-4 px-6 font-medium w-28 text-center">Status</th>
                      <th className="py-4 px-6 font-medium">Vencimento</th>
                      <th className="py-4 px-6 font-medium">Descrição</th>
                      <th className="py-4 px-6 font-medium">Categoria</th>
                      <th className="py-4 px-6 font-medium text-right">Valor</th>
                      <th className="py-4 px-6 font-medium text-center w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesas.map(d => {
                      const isPaid = d.status === 'pago';
                      return (
                        <tr key={d.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isPaid ? 'opacity-50' : ''}`}>
                          <td className="py-4 px-6 text-center">
                            {isPaid ? (
                              <div className="flex flex-col items-center justify-center">
                                <button onClick={() => openUnpayModal(d)} title="Desfazer Pagamento"><CheckCircle className={`w-5 h-5 mx-auto ${colors.positive}`} /></button>
                                {d.data_pagamento && <span className="text-[9px] text-[#7A8B76] font-bold mt-1 tracking-widest uppercase block">{d.data_pagamento.split('-').reverse().join('/')}</span>}
                              </div>
                            ) : (
                              isSelectionMode ? (
                                <input 
                                  type="checkbox" 
                                  className="rounded border-gray-300 text-[#C87941] focus:ring-[#C87941] cursor-pointer w-4 h-4 mx-auto block"
                                  checked={selectedPayables.includes(d.id)}
                                  onChange={() => togglePayableSelection(d.id)}
                                />
                              ) : (
                                <button onClick={() => openPayModal(d)} className="bg-[#7A8B76] text-white text-[11px] px-3 py-1.5 rounded-sm font-medium hover:bg-[#687a64] transition-colors mx-auto block uppercase tracking-wide shadow-sm" title="Pagar Conta">Pagar</button>
                              )
                            )}
                          </td>
                          <td className={`py-4 px-6 text-sm ${isPaid ? 'line-through text-gray-400' : 'text-gray-600'}`}>{d.vencimento.split('-').reverse().join('/')}</td>
                          <td className={`py-4 px-6 font-medium ${isPaid ? 'line-through text-gray-400' : 'text-gray-800'}`}>{d.nome} {d.fixa_id && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">FIXA</span>}</td>
                          <td className={`py-4 px-6 ${isPaid ? 'opacity-50' : ''}`}>
                            <span className="text-[10px] px-2 py-1 rounded border bg-gray-50 border-gray-200 text-gray-600 uppercase tracking-wider font-medium">
                              {d.categoria || 'Sem Categoria'}
                            </span>
                          </td>
                          <td className={`py-4 px-6 text-right font-medium ${isPaid ? 'text-gray-400' : colors.negative}`}>{formatCurrency(d.valor)}</td>
                          <td className="py-4 px-6 text-center flex items-center justify-center space-x-2">
                            <button onClick={() => openEditDespesa(d)} className="text-gray-300 hover:text-[#C87941] transition-colors"><Edit3 className="w-4 h-4 mx-auto" /></button>
                            <button onClick={() => handleDeleteDespesa(d.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RECEITAS (INTEGRADO COM UBER) */}
          {currentPage === 'incomes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-gray-500 font-light">Suas entradas e agregação inteligente do Uber Hub.</p>
                  <p className="text-2xl font-bold text-[#7A8B76] mt-1">Total: {formatCurrency(receitas.receitas.reduce((acc, r) => acc + r.valor, 0) + receitas.uber_total)}</p>
                </div>
                <button onClick={openNewReceitaModal} className={`${colors.action} text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition-all text-sm tracking-wide`}>+ Nova Receita</button>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="py-4 px-6 font-medium">Data</th>
                      <th className="py-4 px-6 font-medium">Origem</th>
                      <th className="py-4 px-6 font-medium text-right">Valor</th>
                      <th className="py-4 px-6 font-medium text-center w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b-2 border-gray-100 bg-[#7A8B76]/5">
                      <td className="py-5 px-6 text-sm text-gray-600 font-medium">Mês de {filterMonth}</td>
                      <td className="py-5 px-6 font-bold text-gray-800 flex items-center">
                        <Car className={`w-5 h-5 mr-3 ${colors.positive}`} /> Total Lucro Uber Hub 
                        <span className="ml-3 text-xs bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded shadow-sm font-normal">Automático</span>
                      </td>
                      <td className={`py-5 px-6 text-right font-bold ${colors.positive}`}>{formatCurrency(receitas.uber_total)}</td>
                      <td className="py-5 px-6 text-center text-gray-400 text-sm">--</td>
                    </tr>
                    {receitas.receitas.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 text-sm text-gray-600">{r.data.split('-').reverse().join('/')}</td>
                        <td className="py-4 px-6 font-medium text-gray-800">
                          {r.nome}
                          {r.responsavel && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-widest">{r.responsavel}</span>}
                        </td>
                        <td className={`py-4 px-6 text-right font-medium ${colors.positive}`}>{formatCurrency(r.valor)}</td>
                        <td className="py-4 px-6 text-center flex items-center justify-center space-x-2">
                          <button onClick={() => openEditReceita(r)} className="text-gray-300 hover:text-[#C87941] transition-colors"><Edit3 className="w-4 h-4 mx-auto" /></button>
                          <button onClick={() => handleDeleteReceita(r.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTAS FIXAS */}
          {currentPage === 'fixed' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-gray-500 font-light">Contas que se repetem todo mês. Elas são projetadas automaticamente.</p>
                  <p className="text-2xl font-bold text-[#A35C5C] mt-1">Total Estimado: {formatCurrency(contasFixas.reduce((acc, c) => acc + (c.valor_estimado || 0), 0))}</p>
                </div>
                <button onClick={openNewFixaModal} className={`${colors.action} text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition-all text-sm tracking-wide`}>+ Configurar Conta Fixa</button>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="py-4 px-6 font-medium">Nome</th>
                      <th className="py-4 px-6 font-medium">Dia do Vencimento</th>
                      <th className="py-4 px-6 font-medium">Tipo</th>
                      <th className="py-4 px-6 font-medium text-right">Valor Estimado</th>
                      <th className="py-4 px-6 font-medium text-center w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contasFixas.map(fixa => (
                      <tr key={fixa.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 font-medium text-gray-800">{fixa.nome}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">Dia {fixa.dia_vencimento}</td>
                        <td className="py-4 px-6">
                          <span className={`text-[10px] px-2 py-1 rounded border ${fixa.tipo_valor === 'FIXO' ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>{fixa.tipo_valor}</span>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-gray-800">{formatCurrency(fixa.valor_estimado)}</td>
                        <td className="py-4 px-6 text-center flex items-center justify-center space-x-2">
                          <button onClick={() => openEditFixa(fixa)} className="text-gray-300 hover:text-[#C87941] transition-colors"><Edit3 className="w-4 h-4 mx-auto" /></button>
                          <button onClick={() => handleDeleteFixa(fixa.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================
          MODAIS CUSTOMIZADOS COM BACKDROP BLUR
      ========================================= */}
      
      {/* Modal Novo Uber Log (REMOVIDO) */}

      {/* Outros Modais - Restante Simplificado (Contas Pagar, Receitas) */}
      {isUnpayModalOpen && despesaToUnpay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in-up">
            <h2 className="text-xl font-light text-gray-800 mb-2">Desfazer Pagamento?</h2>
            <p className="text-sm text-gray-500 mb-6">A conta <strong className="text-gray-800">{despesaToUnpay.nome}</strong> voltará para o status pendente.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsUnpayModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-md text-gray-600 font-medium hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={confirmUnpayDespesa} className="flex-1 py-3 bg-[#A35C5C] hover:bg-[#8e5050] text-white rounded-md font-medium transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {isPayModalOpen && despesaToPay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in-up">
            <h2 className="text-xl font-light text-gray-800 mb-1">Confirmar Pagamento</h2>
            <form onSubmit={confirmPayDespesa} className="space-y-4 mt-4">
              <input type="number" step="0.01" value={payForm.valor} onChange={e => setPayForm({...payForm, valor: e.target.value})} className="w-full p-3 border-b-2 border-gray-200 bg-gray-50 text-lg" required />
              <input type="date" value={payForm.data_pagamento} onChange={e => setPayForm({...payForm, data_pagamento: e.target.value})} className="w-full p-3 border-b-2 border-gray-200 bg-gray-50" required />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-md">Cancelar</button>
                <button type="submit" className={`flex-1 py-3 text-white ${colors.bgPositive} rounded-md`}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isNewDespesaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between"><h2 className="text-xl font-light">Nova Despesa</h2><button onClick={()=>setIsNewDespesaModal(false)}><X className="w-5 h-5"/></button></div>
            <form onSubmit={handleCreateDespesa} className="space-y-4 mt-4">
              <input type="text" placeholder="Nome" value={newDespesaForm.nome} onChange={e => setNewDespesaForm({...newDespesaForm, nome: e.target.value})} className="w-full p-3 border rounded" required />
              <input type="number" placeholder="Valor" value={newDespesaForm.valor} onChange={e => setNewDespesaForm({...newDespesaForm, valor: e.target.value})} className="w-full p-3 border rounded" required />
              <input type="date" value={newDespesaForm.vencimento} onChange={e => setNewDespesaForm({...newDespesaForm, vencimento: e.target.value})} className="w-full p-3 border rounded" required />
              <select value={newDespesaForm.categoria} onChange={e => setNewDespesaForm({...newDespesaForm, categoria: e.target.value})} className="w-full p-3 border rounded">
                {(settings.categorias_despesas ? settings.categorias_despesas.split(',') : ['Outros']).map(c => c.trim()).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button type="submit" className={`w-full py-3 text-white ${colors.action} rounded`}>Salvar</button>
            </form>
          </div>
        </div>
      )}
      {isNewReceitaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between"><h2 className="text-xl font-light">Nova Receita</h2><button onClick={()=>setIsNewReceitaModal(false)}><X className="w-5 h-5"/></button></div>
            <form onSubmit={handleCreateReceita} className="space-y-4 mt-4">
              <input type="text" placeholder="Nome" value={newReceitaForm.nome} onChange={e => setNewReceitaForm({...newReceitaForm, nome: e.target.value})} className="w-full p-3 border rounded" required />
              <input type="number" placeholder="Valor" value={newReceitaForm.valor} onChange={e => setNewReceitaForm({...newReceitaForm, valor: e.target.value})} className="w-full p-3 border rounded" required />
              <input type="date" value={newReceitaForm.data} onChange={e => setNewReceitaForm({...newReceitaForm, data: e.target.value})} className="w-full p-3 border rounded" required />
              <select value={newReceitaForm.responsavel} onChange={e => setNewReceitaForm({...newReceitaForm, responsavel: e.target.value})} className="w-full p-3 border rounded" required>
                {settings.responsaveis.split(',').map(r => r.trim()).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button type="submit" className={`w-full py-3 text-white ${colors.action} rounded`}>Salvar</button>
            </form>
          </div>
        </div>
      )}
      {isNewFixaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between"><h2 className="text-xl font-light">Nova Conta Fixa</h2><button onClick={()=>setIsNewFixaModal(false)}><X className="w-5 h-5"/></button></div>
            <form onSubmit={handleCreateFixa} className="space-y-4 mt-4">
              <input type="text" placeholder="Nome" value={newFixaForm.nome} onChange={e => setNewFixaForm({...newFixaForm, nome: e.target.value})} className="w-full p-3 border rounded" required />
              <input type="number" placeholder="Valor Estimado" value={newFixaForm.valor_estimado} onChange={e => setNewFixaForm({...newFixaForm, valor_estimado: e.target.value})} className="w-full p-3 border rounded" required />
              <input type="number" placeholder="Dia de Vencimento" value={newFixaForm.dia_vencimento} onChange={e => setNewFixaForm({...newFixaForm, dia_vencimento: e.target.value})} className="w-full p-3 border rounded" required />
              <select value={newFixaForm.tipo_valor} onChange={e => setNewFixaForm({...newFixaForm, tipo_valor: e.target.value})} className="w-full p-3 border rounded">
                <option value="FIXO">Valor Fixo</option>
                <option value="VARIAVEL">Valor Variável</option>
                <option value="PARCELAMENTO">Parcelamento</option>
              </select>
              <select value={newFixaForm.categoria} onChange={e => setNewFixaForm({...newFixaForm, categoria: e.target.value})} className="w-full p-3 border rounded">
                {(settings.categorias_despesas ? settings.categorias_despesas.split(',') : ['Outros']).map(c => c.trim()).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {newFixaForm.tipo_valor === 'PARCELAMENTO' ? (
                <div className="flex gap-4">
                  {!editingFixaId && (
                    <div className="w-1/3">
                      <label className="block text-xs text-gray-500 mb-1">Entrada (Opcional)</label>
                      <input type="number" placeholder="Ex: 500" value={newFixaForm.valor_entrada || ''} onChange={e => setNewFixaForm({...newFixaForm, valor_entrada: e.target.value})} className="w-full p-3 border rounded" />
                    </div>
                  )}
                  <div className={!editingFixaId ? "w-1/3" : "w-1/2"}>
                    <label className="block text-xs text-gray-500 mb-1">Total de Parcelas</label>
                    <input type="number" placeholder="Ex: 12" value={newFixaForm.parcelas_totais} onChange={e => setNewFixaForm({...newFixaForm, parcelas_totais: e.target.value})} className="w-full p-3 border rounded" required />
                  </div>
                  <div className={!editingFixaId ? "w-1/3" : "w-1/2"}>
                    <label className="block text-xs text-gray-500 mb-1">Mês Inicial</label>
                    <input type="month" value={newFixaForm.mes_inicio} onChange={e => setNewFixaForm({...newFixaForm, mes_inicio: e.target.value})} className="w-full p-3 border rounded" required />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Mês Inicial (Opcional, para começar a projetar a partir daqui)</label>
                  <input type="month" value={newFixaForm.mes_inicio || ''} onChange={e => setNewFixaForm({...newFixaForm, mes_inicio: e.target.value})} className="w-full p-3 border rounded" />
                </div>
              )}
              <button type="submit" className={`w-full py-3 text-white ${colors.action} rounded`}>Salvar</button>
            </form>
          </div>
        </div>
      )}
      {isDeleteFixaModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in-up">
            <h2 className="text-xl font-light text-gray-800 mb-2">Excluir Conta Fixa</h2>
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja excluir esta conta? Isso também apagará as projeções pendentes desta conta nos próximos meses. (As contas já pagas serão mantidas no histórico).
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setIsDeleteFixaModalOpen(false); setFixaToDelete(null); }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={confirmDeleteFixa} className="flex-1 py-3 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition">Excluir</button>
            </div>
          </div>
        </div>
      )}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex h-[600px] animate-fade-in-up">
            
            {/* Sidebar das Configurações */}
            <div className={`${colors.sidebar} w-64 p-6 flex flex-col text-white`}>
              <div className="flex items-center mb-8">
                <h2 className="text-xl font-light tracking-widest uppercase">Ajustes</h2>
              </div>
              <nav className="space-y-2 flex-1">
                <button type="button" onClick={() => setActiveSettingsTab('geral')} className={`w-full text-left px-4 py-2 rounded transition-all ${activeSettingsTab === 'geral' ? 'bg-white/10 font-medium' : 'text-gray-400 hover:text-white'}`}>Geral</button>
                <button type="button" onClick={() => setActiveSettingsTab('uber')} className={`w-full text-left px-4 py-2 rounded transition-all ${activeSettingsTab === 'uber' ? 'bg-white/10 font-medium' : 'text-gray-400 hover:text-white'}`}>Uber Hub</button>
                <button type="button" onClick={() => setActiveSettingsTab('categorias')} className={`w-full text-left px-4 py-2 rounded transition-all ${activeSettingsTab === 'categorias' ? 'bg-white/10 font-medium' : 'text-gray-400 hover:text-white'}`}>Categorias</button>
              </nav>
            </div>

            {/* Conteúdo das Configurações */}
            <div className="flex-1 flex flex-col bg-[#F9F8F6] relative">
              <div className="flex-1 p-10 overflow-y-auto">
                <button onClick={() => setIsSettingsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 z-10"><X className="w-6 h-6"/></button>
                <form id="settings-form" onSubmit={handleSaveSettings} className="space-y-8 mt-2">
                  
                  {activeSettingsTab === 'geral' && (
                    <div className="space-y-6 animate-fade-in">
                      <h3 className="text-xl font-medium text-gray-800 border-b pb-2">Metas Pessoais e Responsáveis</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta de Faturamento Pessoal (Davi)</label>
                        <input type="number" step="0.01" value={settings.meta_faturamento_pessoal} onChange={e => setSettings({...settings, meta_faturamento_pessoal: e.target.value})} className="w-full md:w-1/2 px-4 py-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#C87941]" />
                        <p className="text-xs text-gray-400 mt-1">Sua meta principal para recebimentos.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Responsáveis (Ex: Davi, Larissa)</label>
                        <TagInput value={settings.responsaveis} onChange={val => setSettings({...settings, responsaveis: val})} placeholder="Digite e aperte Enter..." />
                        <p className="text-xs text-gray-400 mt-1">Usado para separar as receitas de cada pessoa na família.</p>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'uber' && (
                    <div className="space-y-6 animate-fade-in">
                      <h3 className="text-xl font-medium text-gray-800 border-b pb-2">Metas do Uber Hub</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Meta Mensal (R$)</label>
                          <input type="number" step="0.01" value={settings.meta_mes_uber} onChange={e => setSettings({...settings, meta_mes_uber: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#C87941]" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Meta por Hora (R$/h)</label>
                          <input type="number" step="0.01" value={settings.meta_hora_uber} onChange={e => setSettings({...settings, meta_hora_uber: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#C87941]" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Meta por Km (R$/km)</label>
                          <input type="number" step="0.01" value={settings.meta_km_uber} onChange={e => setSettings({...settings, meta_km_uber: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#C87941]" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Jornada Semanal (Dias)</label>
                          <input type="number" min="1" max="7" value={settings.jornada_semanal_uber} onChange={e => setSettings({...settings, jornada_semanal_uber: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#C87941]" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Próxima Troca de Óleo (Km)</label>
                          <input type="number" value={settings.km_troca_oleo} onChange={e => setSettings({...settings, km_troca_oleo: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#C87941]" placeholder="Ex: 50000" />
                          <p className="text-xs text-gray-400 mt-1">Avisa quando faltarem 1.000km.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'categorias' && (
                    <div className="space-y-6 animate-fade-in">
                      <h3 className="text-xl font-medium text-gray-800 border-b pb-2">Categorias de Despesas</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gerencie as Categorias (Ex: Moradia, Lazer)</label>
                        <TagInput value={settings.categorias_despesas} onChange={val => setSettings({...settings, categorias_despesas: val})} placeholder="Digite a categoria e Enter..." />
                        <p className="text-xs text-gray-400 mt-1">Essas categorias aparecerão ao registrar uma nova despesa ou conta fixa.</p>
                      </div>
                    </div>
                  )}

                </form>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
                <button type="submit" form="settings-form" className={`${colors.action} text-white px-8 py-3 rounded-md font-medium shadow-sm hover:shadow-md transition-all`}>
                  Salvar Mudanças
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed top-10 right-10 z-50 animate-fade-in-up">
          <div className="bg-[#7A8B76] text-white px-6 py-4 rounded-md shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium tracking-wide">{toast}</span>
          </div>
        </div>
      )}
      {deleteReceitaId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fade-in-up border border-gray-100">
            <h2 className="text-xl font-light text-gray-800 mb-2">Confirmar Exclusão</h2>
            <p className="text-sm text-gray-500 mb-6">Tem certeza que deseja excluir esta receita? Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteReceitaId(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-md font-medium hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={confirmDeleteReceita} className="flex-1 py-2.5 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
