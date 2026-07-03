import React, { useState, useEffect } from 'react';
import { 
  Wallet, LayoutDashboard, Car, AlertTriangle, Settings, Calendar, 
  ChevronDown, Bell, CheckCircle, Trash2, List, TrendingUp, TrendingDown, Edit3, X, ArrowRightLeft
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // Filtro de Mês Global
  const today = new Date();
  const [filterMonth, setFilterMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`); 

  // Estado dos Dados
  const [dashboard, setDashboard] = useState({ comprometido: 0, realizado: 0, sobras: 0, receitasRecebidas: 0, despesasPagas: 0 });
  const [despesas, setDespesas] = useState([]);
  const [receitas, setReceitas] = useState({ receitas: [], uber_total: 0 });
  const [contasFixas, setContasFixas] = useState([]);
  const [uberLogs, setUberLogs] = useState([]);
  
  // Modais Customizados
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [despesaToPay, setDespesaToPay] = useState(null);
  const [payForm, setPayForm] = useState({ valor: '', data_pagamento: '' });

  const [isNewReceitaModal, setIsNewReceitaModal] = useState(false);
  const [newReceitaForm, setNewReceitaForm] = useState({ nome: '', valor: '', data: new Date().toISOString().split('T')[0] });

  const [isNewDespesaModal, setIsNewDespesaModal] = useState(false);
  const [newDespesaForm, setNewDespesaForm] = useState({ nome: '', valor: '', vencimento: new Date().toISOString().split('T')[0], categoria: 'Outros', forma_pagamento: 'Dinheiro' });

  const [isNewFixaModal, setIsNewFixaModal] = useState(false);
  const [newFixaForm, setNewFixaForm] = useState({ nome: '', valor_estimado: '', dia_vencimento: 10, tipo_valor: 'FIXO' });

  const [isNewUberModal, setIsNewUberModal] = useState(false);
  const [newUberForm, setNewUberForm] = useState({
    data: new Date().toISOString().split('T')[0],
    aplicativo: 'Uber', corridas: '', km: '', tempo_online: '00:00',
    valor_bruto: '', combustivel: '', manutencao: '', bonus: '', gorjeta: ''
  });

  const fetchData = () => {
    fetch(`/api/dashboard/${filterMonth}`).then(res => res.json()).then(setDashboard).catch(console.error);
    fetch(`/api/despesas/${filterMonth}`).then(res => res.json()).then(setDespesas).catch(console.error);
    fetch(`/api/receitas/${filterMonth}`).then(res => res.json()).then(setReceitas).catch(console.error);
    fetch(`/api/contas_fixas`).then(res => res.json()).then(setContasFixas).catch(console.error);
    fetch(`/api/uber_logs/${filterMonth}`).then(res => res.json()).then(setUberLogs).catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth]);

  // Ações - Despesas
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

  const handleCreateDespesa = async (e) => {
    e.preventDefault();
    await fetch('/api/despesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDespesaForm)
    });
    setIsNewDespesaModal(false);
    setNewDespesaForm({ nome: '', valor: '', vencimento: new Date().toISOString().split('T')[0], categoria: 'Outros', forma_pagamento: 'Dinheiro' });
    fetchData();
  };

  // Ações - Receitas
  const handleCreateReceita = async (e) => {
    e.preventDefault();
    await fetch('/api/receitas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReceitaForm)
    });
    setIsNewReceitaModal(false);
    setNewReceitaForm({ nome: '', valor: '', data: new Date().toISOString().split('T')[0] });
    fetchData();
  };
  const handleDeleteReceita = async (id) => {
    await fetch(`/api/receitas/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // Ações - Fixas
  const handleCreateFixa = async (e) => {
    e.preventDefault();
    await fetch('/api/contas_fixas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFixaForm)
    });
    setIsNewFixaModal(false);
    setNewFixaForm({ nome: '', valor_estimado: '', dia_vencimento: 10, tipo_valor: 'FIXO' });
    fetchData();
  };
  const handleDeleteFixa = async (id) => {
    await fetch(`/api/contas_fixas/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // Ações - Uber
  const handleCreateUberLog = async (e) => {
    e.preventDefault();
    await fetch('/api/uber_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUberForm)
    });
    setIsNewUberModal(false);
    setNewUberForm({
      data: new Date().toISOString().split('T')[0], aplicativo: 'Uber', corridas: '', km: '', tempo_online: '00:00',
      valor_bruto: '', combustivel: '', manutencao: '', bonus: '', gorjeta: ''
    });
    fetchData(); // Vai atualizar inclusive o Dashboard por causa da rota de Dashboard que puxa o total do uber_logs
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  // Paleta Terrosa
  const colors = {
    bg: 'bg-[#F9F8F6]', sidebar: 'bg-[#2D2A26]', action: 'bg-[#C87941] hover:bg-[#b06a39]', textAction: 'text-[#C87941]',
    positive: 'text-[#7A8B76]', bgPositive: 'bg-[#7A8B76]', negative: 'text-[#A35C5C]', bgNegative: 'bg-[#A35C5C]'
  };

  // Progress Bar Dashboard
  const percentConsumed = dashboard.receitasRecebidas > 0 ? Math.min((dashboard.despesasPagas / dashboard.receitasRecebidas) * 100, 100) : 0;

  // Cálculos do Uber Hub
  const uberTotalCorridas = uberLogs.reduce((acc, log) => acc + log.corridas, 0);
  const uberTotalKm = uberLogs.reduce((acc, log) => acc + log.km, 0);
  const uberTotalCusto = uberLogs.reduce((acc, log) => acc + log.combustivel + log.manutencao, 0);
  const uberLucroTotal = uberLogs.reduce((acc, log) => acc + log.lucro_liquido, 0);

  let uberTotalHoras = 0;
  const lucroPorDia = [0,0,0,0,0,0,0]; 
  
  uberLogs.forEach(log => {
      const [y, m, d] = log.data.split('-');
      const date = new Date(y, m-1, d);
      lucroPorDia[date.getDay()] += log.lucro_liquido;

      if(log.tempo_online && log.tempo_online.includes(':')) {
          const [hh, mm] = log.tempo_online.split(':');
          uberTotalHoras += parseInt(hh, 10) + (parseInt(mm, 10)/60);
      }
  });

  const uberMediaHora = uberTotalHoras > 0 ? (uberLucroTotal / uberTotalHoras) : 0;
  const gaugePercent = Math.min((uberMediaHora / 35) * 100, 100);
  
  const barChartData = {
    labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    datasets: [{
      label: 'Lucro Líquido (R$)', data: lucroPorDia,
      backgroundColor: lucroPorDia.map(val => val >= 100 ? '#7A8B76' : '#C87941'),
      borderRadius: 4
    }]
  };
  const doughnutData = {
    labels: ['Progresso', 'Falta'],
    datasets: [{
      data: [gaugePercent, 100 - gaugePercent],
      backgroundColor: ['#7A8B76', '#f3f4f6'],
      borderWidth: 0, cutout: '80%'
    }]
  };

  const getHeatmapColor = (lucro) => {
    if(lucro >= 150) return 'bg-[#7A8B76]/20 text-[#7A8B76] font-bold'; 
    if(lucro >= 50) return 'bg-[#7A8B76]/10 text-[#7A8B76]'; 
    if(lucro > 0) return 'bg-yellow-50 text-yellow-700'; 
    return 'bg-[#A35C5C]/20 text-[#A35C5C] font-bold'; 
  };

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
          <button onClick={() => setCurrentPage('payables')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'payables' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <List className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Contas a Pagar</span>
          </button>
          <button onClick={() => setCurrentPage('incomes')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'incomes' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <TrendingUp className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Receitas</span>
          </button>
          <button onClick={() => setCurrentPage('uber')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'uber' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Car className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Uber Hub</span>
          </button>
          <button onClick={() => setCurrentPage('fixed')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${currentPage === 'fixed' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Calendar className="w-5 h-5 mr-4 opacity-70" />
            <span className="font-medium text-sm tracking-wide">Contas Fixas</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
        <header className="h-20 flex items-center justify-between px-10 sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-light text-gray-800">
              {currentPage === 'dashboard' && 'Saúde Financeira'}
              {currentPage === 'payables' && 'Contas a Pagar'}
              {currentPage === 'incomes' && 'Receitas'}
              {currentPage === 'fixed' && 'Configurar Contas Fixas'}
              {currentPage === 'uber' && 'Uber Hub - Frota & Corridas'}
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
            <button className="relative p-2 text-gray-400 hover:text-gray-800 transition-all"><Bell className="w-5 h-5" /></button>
            <div className={`w-9 h-9 rounded-full ${colors.bgPositive} flex items-center justify-center text-white font-bold shadow-sm`}>DR</div>
          </div>
        </header>

        <div className="p-10 space-y-10 max-w-6xl mx-auto w-full">
          
          {/* DASHBOARD GERAL */}
          {currentPage === 'dashboard' && (
            <div className="space-y-12 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                  <h3 className="text-sm font-semibold tracking-widest uppercase text-gray-400 mb-2">Comprometido</h3>
                  <p className={`text-4xl font-light ${colors.negative}`}>{formatCurrency(dashboard.comprometido)}</p>
                  <p className="text-xs text-gray-400 mt-3">Soma de tudo o que está pendente no mês.</p>
                </div>
                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                  <h3 className="text-sm font-semibold tracking-widest uppercase text-gray-400 mb-2">Realizado</h3>
                  <p className="text-4xl font-light text-gray-800">{formatCurrency(dashboard.realizado)}</p>
                  <p className="text-xs text-gray-400 mt-3">Soma do que já entrou e saiu da conta.</p>
                </div>
                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1 ${dashboard.sobras >= 0 ? colors.bgPositive : colors.bgNegative}`}></div>
                  <h3 className="text-sm font-semibold tracking-widest uppercase text-gray-400 mb-2">Sobras (Lucro)</h3>
                  <p className={`text-4xl font-light ${dashboard.sobras >= 0 ? colors.positive : colors.negative}`}>{formatCurrency(dashboard.sobras)}</p>
                  <p className="text-xs text-gray-400 mt-3">Receitas totais menos despesas totais.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
                 <div className="flex justify-between items-end mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-800">Consumo da Receita</h3>
                      <p className="text-sm text-gray-500">Quanto da sua receita total já foi consumida pelas despesas pagas.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-light text-gray-800">{percentConsumed.toFixed(1)}%</span>
                    </div>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className={`h-4 rounded-full transition-all duration-1000 ${percentConsumed > 80 ? colors.bgNegative : percentConsumed > 50 ? 'bg-[#C87941]' : colors.bgPositive}`} style={{ width: `${percentConsumed}%` }}></div>
                 </div>
              </div>
            </div>
          )}

          {/* UBER HUB */}
          {currentPage === 'uber' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <p className="text-gray-500 font-light">Controle avançado de frotas, ganhos e despesas automotivas.</p>
                <button onClick={() => setIsNewUberModal(true)} className={`${colors.action} text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition-all text-sm tracking-wide`}>+ Novo Dia Trabalhado</button>
              </div>

              {/* DASHBOARD DO UBER HUB */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Gauge R$/h Líquido */}
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center relative">
                  <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4 text-center">Média / Hora Líquida</h3>
                  <div className="w-32 h-32 relative flex items-center justify-center">
                    <Doughnut data={doughnutData} options={{ cutout: '80%', plugins: { tooltip: { enabled: false }, legend: { display: false } } }} />
                    <div className="absolute flex flex-col items-center">
                      <span className={`text-xl font-bold ${uberMediaHora >= 35 ? colors.positive : 'text-gray-800'}`}>
                        {formatCurrency(uberMediaHora)}
                      </span>
                      <span className="text-[10px] text-gray-400">Meta: R$35/h</span>
                    </div>
                  </div>
                </div>

                {/* Grafico de Barras */}
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm col-span-1 md:col-span-2">
                   <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Lucro Líquido por Dia da Semana</h3>
                   <div className="h-32">
                     <Bar data={barChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }} />
                   </div>
                </div>

                {/* Resumo do Mês */}
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
                   <div>
                     <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Corridas Totais</h3>
                     <p className="text-lg font-medium text-gray-800">{uberTotalCorridas}</p>
                   </div>
                   <div className="flex justify-between">
                     <div>
                       <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Km Rodado</h3>
                       <p className="text-sm font-medium text-gray-600">{uberTotalKm.toFixed(1)} km</p>
                     </div>
                     <div>
                       <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Custo Total</h3>
                       <p className="text-sm font-medium text-gray-600">{formatCurrency(uberTotalCusto)}</p>
                     </div>
                   </div>
                   <div className="pt-2 border-t border-gray-100">
                     <h3 className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Lucro Líquido Total</h3>
                     <p className={`text-2xl font-bold ${colors.positive}`}>{formatCurrency(uberLucroTotal)}</p>
                   </div>
                </div>
              </div>

              {/* Tabela Histórica Avançada */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 text-[10px] uppercase tracking-wider">
                      <th className="py-4 px-4 font-medium">Data</th>
                      <th className="py-4 px-4 font-medium">App</th>
                      <th className="py-4 px-4 font-medium text-center">Corridas</th>
                      <th className="py-4 px-4 font-medium text-center">Horas</th>
                      <th className="py-4 px-4 font-medium text-right">R$/Km</th>
                      <th className="py-4 px-4 font-medium text-right">R$/Hora</th>
                      <th className="py-4 px-4 font-medium text-center">% Comb.</th>
                      <th className="py-4 px-4 font-medium text-right">Lucro Líq.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uberLogs.map(log => {
                      const bruto = log.valor_bruto || 0;
                      const comb = log.combustivel || 0;
                      const km = log.km || 1; 
                      
                      let horasDec = 0;
                      if(log.tempo_online && log.tempo_online.includes(':')) {
                         const [h, m] = log.tempo_online.split(':');
                         horasDec = parseInt(h) + (parseInt(m)/60);
                      }
                      
                      const valPorKm = log.km > 0 ? (bruto / km) : 0;
                      const valPorHr = horasDec > 0 ? (bruto / horasDec) : 0;
                      const percComb = bruto > 0 ? (comb / bruto) * 100 : 0;
                      
                      return (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-xs font-medium text-gray-600">{log.data.split('-').reverse().join('/')}</td>
                          <td className="py-3 px-4 text-xs text-gray-500">{log.aplicativo}</td>
                          <td className="py-3 px-4 text-xs text-center text-gray-700">{log.corridas}</td>
                          <td className="py-3 px-4 text-xs text-center text-gray-700">{log.tempo_online}</td>
                          <td className="py-3 px-4 text-xs text-right text-gray-700">{log.km > 0 ? formatCurrency(valPorKm) : 'N/A'}</td>
                          <td className="py-3 px-4 text-xs text-right text-gray-700">{formatCurrency(valPorHr)}</td>
                          <td className="py-3 px-4 text-xs text-center text-gray-700">{percComb.toFixed(1)}%</td>
                          <td className={`py-3 px-4 text-sm text-right rounded-l-md ${getHeatmapColor(log.lucro_liquido)}`}>
                             {formatCurrency(log.lucro_liquido)}
                          </td>
                        </tr>
                      )
                    })}
                    {uberLogs.length === 0 && (
                      <tr><td colSpan="8" className="py-16 text-center text-gray-400 font-light">Nenhum log registrado neste mês.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTAS A PAGAR */}
          {currentPage === 'payables' && (
             // ... [Mantido como estava] ...
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-500 font-light">Gerencie suas despesas pendentes e pagas do mês.</p>
                <button onClick={() => setIsNewDespesaModal(true)} className={`${colors.action} text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition-all text-sm tracking-wide`}>+ Nova Despesa</button>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="py-4 px-6 font-medium w-16 text-center">Status</th>
                      <th className="py-4 px-6 font-medium">Vencimento</th>
                      <th className="py-4 px-6 font-medium">Descrição</th>
                      <th className="py-4 px-6 font-medium text-right">Valor</th>
                      <th className="py-4 px-6 font-medium text-center w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesas.map(d => {
                      const isPaid = d.status === 'pago';
                      return (
                        <tr key={d.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isPaid ? 'opacity-50' : ''}`}>
                          <td className="py-4 px-6 text-center">
                            {isPaid ? <CheckCircle className={`w-5 h-5 mx-auto ${colors.positive}`} /> : <button onClick={() => openPayModal(d)} className="w-5 h-5 border-2 border-gray-300 rounded-sm hover:border-[#7A8B76] mx-auto block transition-colors" title="Dar Baixa"></button>}
                          </td>
                          <td className={`py-4 px-6 text-sm ${isPaid ? 'line-through text-gray-400' : 'text-gray-600'}`}>{d.vencimento.split('-').reverse().join('/')}</td>
                          <td className={`py-4 px-6 font-medium ${isPaid ? 'line-through text-gray-400' : 'text-gray-800'}`}>{d.nome} {d.fixa_id && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">FIXA</span>}</td>
                          <td className={`py-4 px-6 text-right font-medium ${isPaid ? 'text-gray-400' : colors.negative}`}>{formatCurrency(d.valor)}</td>
                          <td className="py-4 px-6 text-center"><button onClick={() => handleDeleteDespesa(d.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
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
                <p className="text-gray-500 font-light">Suas entradas e agregação inteligente do Uber Hub.</p>
                <button onClick={() => setIsNewReceitaModal(true)} className={`${colors.action} text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition-all text-sm tracking-wide`}>+ Nova Receita</button>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="py-4 px-6 font-medium">Data</th>
                      <th className="py-4 px-6 font-medium">Origem</th>
                      <th className="py-4 px-6 font-medium text-right">Valor</th>
                      <th className="py-4 px-6 font-medium text-center w-24">Ações</th>
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
                        <td className="py-4 px-6 font-medium text-gray-800">{r.nome}</td>
                        <td className={`py-4 px-6 text-right font-medium ${colors.positive}`}>{formatCurrency(r.valor)}</td>
                        <td className="py-4 px-6 text-center"><button onClick={() => handleDeleteReceita(r.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTAS FIXAS */}
          {currentPage === 'fixed' && (
             // ... [Mantido como estava] ...
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-500 font-light">Contas que se repetem todo mês. Elas são projetadas automaticamente.</p>
                <button onClick={() => setIsNewFixaModal(true)} className={`${colors.action} text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition-all text-sm tracking-wide`}>+ Configurar Conta Fixa</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {contasFixas.map(fixa => (
                  <div key={fixa.id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm relative group">
                    <button onClick={() => handleDeleteFixa(fixa.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                    <h3 className="text-lg font-medium text-gray-800 mb-1">{fixa.nome}</h3>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Vence dia {fixa.dia_vencimento}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Valor Estimado</p>
                        <p className="text-xl font-light text-gray-800">{formatCurrency(fixa.valor_estimado)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded border ${fixa.tipo_valor === 'FIXO' ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>{fixa.tipo_valor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================
          MODAIS CUSTOMIZADOS COM BACKDROP BLUR
      ========================================= */}
      
      {/* Modal Novo Uber Log */}
      {isNewUberModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-light text-gray-800">Registrar Novo Dia de Corrida</h2>
              <button onClick={() => setIsNewUberModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateUberLog} className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Data</label>
                  <input type="date" value={newUberForm.data} onChange={e => setNewUberForm({...newUberForm, data: e.target.value})} className="w-full p-2 border border-gray-200 rounded focus:border-[#C87941] outline-none text-sm text-gray-800" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Aplicativo</label>
                  <select value={newUberForm.aplicativo} onChange={e => setNewUberForm({...newUberForm, aplicativo: e.target.value})} className="w-full p-2 border border-gray-200 rounded focus:border-[#C87941] outline-none text-sm text-gray-800 bg-white">
                     <option value="Uber">Uber</option>
                     <option value="99">99</option>
                     <option value="InDrive">InDrive</option>
                     <option value="Multi">Multi (Vários)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Tempo Online (HH:MM)</label>
                  <input type="time" value={newUberForm.tempo_online} onChange={e => setNewUberForm({...newUberForm, tempo_online: e.target.value})} className="w-full p-2 border border-gray-200 rounded focus:border-[#C87941] outline-none text-sm text-gray-800" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Corridas Feitas</label>
                  <input type="number" value={newUberForm.corridas} onChange={e => setNewUberForm({...newUberForm, corridas: e.target.value})} className="w-full p-2 border border-gray-200 rounded focus:border-[#C87941] outline-none text-sm text-gray-800" required />
                 </div>
                 <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Km Rodados</label>
                  <input type="number" step="0.1" value={newUberForm.km} onChange={e => setNewUberForm({...newUberForm, km: e.target.value})} className="w-full p-2 border border-gray-200 rounded focus:border-[#C87941] outline-none text-sm text-gray-800" required />
                 </div>
                 <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Valor Bruto (R$)</label>
                  <input type="number" step="0.01" value={newUberForm.valor_bruto} onChange={e => setNewUberForm({...newUberForm, valor_bruto: e.target.value})} className="w-full p-2 border border-gray-200 rounded focus:border-[#C87941] outline-none text-sm text-gray-800" required />
                 </div>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Custos & Extras</p>
                <div className="grid grid-cols-4 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Combustível</label>
                    <input type="number" step="0.01" value={newUberForm.combustivel} onChange={e => setNewUberForm({...newUberForm, combustivel: e.target.value})} className="w-full p-2 border border-gray-200 rounded outline-none text-sm bg-white" required />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Manutenção</label>
                    <input type="number" step="0.01" value={newUberForm.manutencao} onChange={e => setNewUberForm({...newUberForm, manutencao: e.target.value})} className="w-full p-2 border border-gray-200 rounded outline-none text-sm bg-white" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Bônus</label>
                    <input type="number" step="0.01" value={newUberForm.bonus} onChange={e => setNewUberForm({...newUberForm, bonus: e.target.value})} className="w-full p-2 border border-gray-200 rounded outline-none text-sm bg-white" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Gorjeta</label>
                    <input type="number" step="0.01" value={newUberForm.gorjeta} onChange={e => setNewUberForm({...newUberForm, gorjeta: e.target.value})} className="w-full p-2 border border-gray-200 rounded outline-none text-sm bg-white" />
                   </div>
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className={`w-full py-3 text-sm font-medium text-white ${colors.action} rounded-md transition-colors shadow-sm`}>Salvar Dia (Lucro será calculado automaticamente)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outros Modais - Restante Simplificado (Contas Pagar, Receitas) */}
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
              <input type="number" placeholder="Dia" value={newFixaForm.dia_vencimento} onChange={e => setNewFixaForm({...newFixaForm, dia_vencimento: e.target.value})} className="w-full p-3 border rounded" required />
              <select value={newFixaForm.tipo_valor} onChange={e => setNewFixaForm({...newFixaForm, tipo_valor: e.target.value})} className="w-full p-3 border rounded">
                <option value="FIXO">Valor Fixo</option>
                <option value="VARIAVEL">Valor Variável</option>
              </select>
              <button type="submit" className={`w-full py-3 text-white ${colors.action} rounded`}>Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
