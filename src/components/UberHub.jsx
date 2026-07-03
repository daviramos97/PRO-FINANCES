import React, { useState, useMemo, useEffect } from 'react';
import { 
  Car, TrendingUp, DollarSign, Clock, MapPin, Wrench, Edit3, Trash2, Trophy, AlertTriangle, CheckCircle, Save, X, Filter, User
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart 
} from 'recharts';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function UberHub({ fetchGlobalData, colors, formatCurrency, globalMonth, settings, metaUberDiaria, metaUberSemanal, lucroMes }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('uberhub_activeTab') || 'performance');
  const [historicalGasPerc, setHistoricalGasPerc] = useState(0);

  // Fetch all-time data once to calculate historical gas percentage
  useEffect(() => {
    fetch('/api/uber_logs') // Without filters, it returns all time logs
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const totalB = data.reduce((acc, log) => acc + log.valor_bruto, 0);
          const totalC = data.reduce((acc, log) => acc + log.gasto_combustivel, 0);
          if (totalB > 0) {
            setHistoricalGasPerc(totalC / totalB);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem('uberhub_activeTab', activeTab);
  }, [activeTab]);
  
  // FILTER STATE
  const [uberLogs, setUberLogs] = useState([]);
  const [filterType, setFilterType] = useState('month'); // 'month', 'range', 'all'
  const [localMonth, setLocalMonth] = useState(globalMonth);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

  // LOCAL FETCH
  const fetchLocalLogs = async () => {
    let url = '/api/uber_logs';
    if (filterType === 'month') {
      url += `?mes_ano=${localMonth}`;
    } else if (filterType === 'range') {
      url += `?start=${startDate}&end=${endDate}`;
    }
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      setUberLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLocalLogs();
  }, [filterType, localMonth, startDate, endDate]);

  // Atualizar `localMonth` se `globalMonth` mudar (opcional, mas bom pra manter sinergia inicial)
  useEffect(() => {
    if (filterType === 'month') {
      setLocalMonth(globalMonth);
    }
  }, [globalMonth]);

  
  // FORM AND MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    aplicativo: 'Uber', corridas: '', km: '', tempo_online: '00:00',
    valor_bruto: '', combustivel: '', manutencao: '', bonus: '', gorjeta: ''
  });

  // INFINITE SCROLL STATE
  const [visibleCount, setVisibleCount] = useState(10);
  const observerTarget = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 10);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [observerTarget, uberLogs]);

  // RESET SCROLL ON FILTER CHANGE
  useEffect(() => {
    setVisibleCount(10);
  }, [filterType, localMonth, startDate, endDate]);

  const previewLucro = useMemo(() => {
    const bruto = parseFloat(form.valor_bruto) || 0;
    const comb = parseFloat(form.combustivel) || 0;
    const man = parseFloat(form.manutencao) || 0;
    const bon = parseFloat(form.bonus) || 0;
    const gorj = parseFloat(form.gorjeta) || 0;
    return bruto + bon + gorj - comb - man;
  }, [form]);

  // CALCULA MÉTRICAS MENSAIS
  const metrics = useMemo(() => {
    let totalCorridas = 0, totalKm = 0, totalBruto = 0, totalCombustivel = 0, totalLucro = 0, totalHorasDec = 0;
    const lucroPorDiaSemana = [0,0,0,0,0,0,0]; // Dom a Sab
    const qtdPorDiaSemana = [0,0,0,0,0,0,0]; 
    const evolutionDataMap = {}; // para Linhas e Areas
    const scatterData = [];

    uberLogs.forEach(log => {
      totalCorridas += log.corridas;
      totalKm += log.km;
      totalBruto += log.valor_bruto;
      totalCombustivel += log.combustivel;
      totalLucro += log.lucro_liquido;

      let horasDec = 0;
      if(log.tempo_online && log.tempo_online.includes(':')) {
        const [hh, mm] = log.tempo_online.split(':');
        horasDec = parseInt(hh, 10) + (parseInt(mm, 10)/60);
      }
      totalHorasDec += horasDec;

      // Agrega dados por dia para gráficos de evolução
      if(!evolutionDataMap[log.data]) {
        evolutionDataMap[log.data] = { data: log.data, bruto: 0, combustivel: 0, horas: 0, km: 0, lucro: 0 };
      }
      evolutionDataMap[log.data].bruto += log.valor_bruto;
      evolutionDataMap[log.data].combustivel += log.combustivel;
      evolutionDataMap[log.data].horas += horasDec;
      evolutionDataMap[log.data].km += log.km;
      evolutionDataMap[log.data].lucro += log.lucro_liquido;

      if(horasDec > 0) {
        scatterData.push({ x: horasDec, y: log.lucro_liquido, date: log.data });
      }
    });

    const evolData = Object.values(evolutionDataMap).sort((a,b) => a.data.localeCompare(b.data)).map(item => {
      const [y, m, d] = item.data.split('-');
      const dateObj = new Date(y, m-1, d);
      const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      
      lucroPorDiaSemana[dateObj.getDay()] += item.lucro;
      qtdPorDiaSemana[dateObj.getDay()] += 1;

      return {
        ...item,
        labelData: item.data.split('-').reverse().slice(0,2).join('/'),
        fullDateInfo: `${item.data.split('-').reverse().join('/')} - ${diasSemana[dateObj.getDay()]}`,
        mediaHr: item.horas > 0 ? item.bruto / item.horas : 0,
        mediaKm: item.km > 0 ? item.bruto / item.km : 0
      };
    });

    const barData = [
      { name: 'Seg', lucro: qtdPorDiaSemana[1] > 0 ? lucroPorDiaSemana[1] / qtdPorDiaSemana[1] : 0 },
      { name: 'Ter', lucro: qtdPorDiaSemana[2] > 0 ? lucroPorDiaSemana[2] / qtdPorDiaSemana[2] : 0 },
      { name: 'Qua', lucro: qtdPorDiaSemana[3] > 0 ? lucroPorDiaSemana[3] / qtdPorDiaSemana[3] : 0 },
      { name: 'Qui', lucro: qtdPorDiaSemana[4] > 0 ? lucroPorDiaSemana[4] / qtdPorDiaSemana[4] : 0 },
      { name: 'Sex', lucro: qtdPorDiaSemana[5] > 0 ? lucroPorDiaSemana[5] / qtdPorDiaSemana[5] : 0 },
      { name: 'Sáb', lucro: qtdPorDiaSemana[6] > 0 ? lucroPorDiaSemana[6] / qtdPorDiaSemana[6] : 0 },
      { name: 'Dom', lucro: qtdPorDiaSemana[0] > 0 ? lucroPorDiaSemana[0] / qtdPorDiaSemana[0] : 0 },
    ];

    const mediaHoraMes = totalHorasDec > 0 ? (totalBruto / totalHorasDec) : 0;
    const mediaKmMes = totalKm > 0 ? (totalBruto / totalKm) : 0;
    
    return { 
      totalCorridas, totalKm, totalBruto, totalCombustivel, totalLucro, mediaHoraMes, mediaKmMes,
      evolData, barData, scatterData
    };
  }, [uberLogs]);

  // ACTIONS
  const handleSave = async (e) => {
    e.preventDefault();
    if(editingId) {
      await fetch(`/api/uber_logs/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    } else {
      await fetch('/api/uber_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    }
    setEditingId(null);
    setIsModalOpen(false);
    setForm({
      data: new Date().toISOString().split('T')[0], aplicativo: 'Uber', corridas: '', km: '', tempo_online: '00:00',
      valor_bruto: '', combustivel: '', manutencao: '', bonus: '', gorjeta: ''
    });
    fetchLocalLogs();
    fetchGlobalData(); // Atualiza painel e Dashboard Principal
  };

  const handleOpenNewModal = () => {
    setEditingId(null);
    setForm({
      data: new Date().toISOString().split('T')[0], aplicativo: 'Uber', corridas: '', km: '', tempo_online: '00:00',
      valor_bruto: '', combustivel: '', manutencao: '', bonus: '', gorjeta: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (log) => {
    setEditingId(log.id);
    setForm({
      data: log.data, aplicativo: log.aplicativo, corridas: log.corridas, km: log.km, tempo_online: log.tempo_online,
      valor_bruto: log.valor_bruto, combustivel: log.combustivel, manutencao: log.manutencao, 
      bonus: log.bonus, gorjeta: log.gorjeta
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(window.confirm('Excluir este registro?')) {
      await fetch(`/api/uber_logs/${id}`, { method: 'DELETE' });
      fetchLocalLogs();
      fetchGlobalData();
    }
  };

  // HELPERS
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const fullDateInfo = payload[0].payload.fullDateInfo;
      const displayLabel = fullDateInfo || label;
      return (
        <div className="bg-white border border-gray-200 p-3 shadow-lg rounded-md text-xs">
          <p className="font-bold text-gray-800 mb-1">{displayLabel}</p>
          {payload.map(p => (
            <p key={p.dataKey} style={{color: p.color}}>{p.name}: {formatCurrency(p.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 p-3 shadow-lg rounded-md text-xs">
          <p className="font-bold text-gray-800 mb-1">Data: {data.date.split('-').reverse().join('/')}</p>
          <p className="text-gray-600">Horas: {data.x.toFixed(1)}h</p>
          <p className="text-gray-600">Lucro: {formatCurrency(data.y)}</p>
        </div>
      );
    }
    return null;
  };

  const getHeatmapLevelClass = (lucro) => {
    if (lucro < 0) return 'bg-[#A35C5C] text-white shadow-sm';
    if (lucro === 0) return 'bg-gray-50 text-gray-300';
    if (lucro <= 50) return 'bg-[#7A8B76]/20 text-[#2D2A26]';
    if (lucro <= 100) return 'bg-[#7A8B76]/40 text-[#2D2A26] shadow-sm';
    if (lucro <= 150) return 'bg-[#7A8B76]/60 text-white shadow-sm';
    if (lucro <= 200) return 'bg-[#7A8B76]/80 text-white shadow-sm';
    return 'bg-[#7A8B76] text-white shadow-sm';
  };

  // HEATMAP CALENDAR LOGIC (Apenas para meses)
  const heatmapDays = useMemo(() => {
    if (filterType !== 'month') return [];
    if (!localMonth || !localMonth.includes('-')) return [];
    const [y, m] = localMonth.split('-');
    const start = new Date(parseInt(y), parseInt(m)-1, 1);
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });
    
    return days.map(d => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const log = uberLogs.find(l => l.data === dateStr);
      let statusClass = 'bg-gray-50 text-gray-300'; // none
      if(log) {
        statusClass = getHeatmapLevelClass(log.lucro_liquido);
      }
      return { date: d, dateStr, statusClass, lucro: log ? log.lucro_liquido : 0 };
    });
  }, [localMonth, uberLogs, filterType]);

  // HEATMAP AGREGADO (Para Períodos Maiores que 1 Mês)
  const aggregatedHeatmap = useMemo(() => {
    if (filterType === 'month') return null;

    const diasMes = Array.from({ length: 31 }, (_, i) => i + 1);
    
    return diasMes.map(dia => {
      // Filtra todas as jornadas que caíram neste dia do mês (1 a 31)
      const logsDoDia = uberLogs.filter(l => {
        if (!l.data) return false;
        const [, , d] = l.data.split('-');
        return parseInt(d, 10) === dia;
      });

      if (logsDoDia.length === 0) {
        return { dia, statusClass: 'bg-gray-50 text-gray-300', count: 0, avgLucro: 0 };
      }

      let totalLucro = 0;
      logsDoDia.forEach(log => {
        totalLucro += log.lucro_liquido;
      });

      const avgLucro = totalLucro / logsDoDia.length;
      const statusClass = getHeatmapLevelClass(avgLucro);

      return { dia, statusClass, count: logsDoDia.length, avgLucro };
    });
  }, [filterType, uberLogs]);

  // GAUGE LOGIC
  const metaKm = parseFloat(settings?.meta_km_uber) || 2.0;
  const gaugeValue = Math.min((metrics.mediaKmMes / metaKm) * 100, 100);
  const gaugeData = [{ name: 'Atingido', value: gaugeValue }, { name: 'Falta', value: 100 - gaugeValue }];

  // METAS DINÂMICAS E ALVO BRUTO
  const hoje = new Date();
  const rawComecoSemana = startOfWeek(hoje, { weekStartsOn: 1 }); // Segunda
  const rawFimSemana = endOfWeek(hoje, { weekStartsOn: 1 }); // Domingo
  const comecoMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  // Restringe a semana ao mês atual
  const comecoSemana = rawComecoSemana < comecoMes ? comecoMes : rawComecoSemana;
  const fimSemana = rawFimSemana > fimMes ? fimMes : rawFimSemana;
  
  const diasNaSemanaAtual = Math.round((fimSemana - comecoSemana) / (1000 * 60 * 60 * 24)) + 1;
  const metaUberSemanalProporcional = metaUberSemanal > 0 ? (metaUberSemanal / 7) * diasNaSemanaAtual : 0;
  
  const lucroSemanaAtual = uberLogs.reduce((acc, log) => {
    const dataLog = parseISO(log.data);
    if (dataLog >= comecoSemana && dataLog <= fimSemana) {
      return acc + log.lucro_liquido;
    }
    return acc;
  }, 0);
  
  const percentualSemana = metaUberSemanalProporcional > 0 ? Math.min((lucroSemanaAtual / metaUberSemanalProporcional) * 100, 100) : 100;
  const percGasolina = historicalGasPerc > 0 ? historicalGasPerc : (metrics.totalBruto > 0 ? (metrics.totalCombustivel / metrics.totalBruto) : 0);
  const alvoBrutoDiario = metaUberDiaria > 0 ? (metaUberDiaria / (1 - percGasolina)) : 0;

  return (
    <div className="space-y-6">
      
      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-8">
        <button 
          onClick={() => setActiveTab('performance')} 
          className={`px-6 py-4 font-medium text-sm transition-all relative ${activeTab === 'performance' ? 'text-[#C87941]' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Painel de Performance
          {activeTab === 'performance' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C87941]"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('registro')} 
          className={`px-6 py-4 font-medium text-sm transition-all relative ${activeTab === 'registro' ? 'text-[#C87941]' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Registro de Jornada
          {activeTab === 'registro' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C87941]"></div>}
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400 mr-1" />
          <div className="flex items-center space-x-1 border border-gray-200 rounded-md p-1 bg-gray-50">
            <button onClick={() => setFilterType('month')} className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${filterType === 'month' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Mês Específico</button>
            <button onClick={() => setFilterType('range')} className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${filterType === 'range' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Período Customizado</button>
            <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${filterType === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Tudo</button>
          </div>
        </div>

        <div className="flex items-center">
          {filterType === 'month' && (
            <input type="month" value={localMonth} onChange={e => setLocalMonth(e.target.value)} className="p-2 border border-gray-200 rounded-md text-sm text-gray-700 font-medium outline-none shadow-sm focus:border-[#C87941]" />
          )}
          
          {filterType === 'range' && (
            <div className="flex items-center space-x-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-gray-200 rounded-md text-sm text-gray-700 font-medium outline-none shadow-sm focus:border-[#C87941]" />
              <span className="text-gray-400 text-sm">até</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-gray-200 rounded-md text-sm text-gray-700 font-medium outline-none shadow-sm focus:border-[#C87941]" />
            </div>
          )}

          {filterType === 'all' && (
             <span className="text-sm font-medium text-gray-500">Mostrando todo o histórico disponível</span>
          )}
        </div>
      </div>

      {/* ABA 1: PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="space-y-8 animate-fade-in">
          {/* CARDS MENSAIS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
              {filterType === 'month' && (
                <div className="absolute top-0 left-0 h-full bg-[#7A8B76]/20 transition-all z-0" style={{width: `${Math.min((metrics.totalLucro / (parseFloat(settings?.meta_mes_uber) || 2500)) * 100, 100)}%`}}></div>
              )}
              <div className="relative z-10 w-full">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Lucro Líquido Total</h3>
                <p className="text-3xl font-light text-[#7A8B76]">{formatCurrency(metrics.totalLucro)}</p>
                {filterType === 'month' && <p className="text-[10px] text-gray-400 mt-1">Meta: {formatCurrency(parseFloat(settings?.meta_mes_uber) || 2500)}</p>}
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Média R$/Hora</h3>
              <p className="text-3xl font-light text-gray-800">{formatCurrency(metrics.mediaHoraMes)}<span className="text-sm text-gray-400 ml-1">/h</span></p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Km Rodados</h3>
              <p className="text-3xl font-light text-gray-800">{metrics.totalKm.toLocaleString('pt-BR')}<span className="text-sm text-gray-400 ml-1">km</span></p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
              <div className="mb-3 w-full">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Faturamento Bruto</h3>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(metrics.totalBruto)}</p>
              </div>
              <div className="pt-3 border-t border-gray-50 w-full">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Custo Combustível</h3>
                <p className="text-lg font-medium text-[#A35C5C]">{formatCurrency(metrics.totalCombustivel)}</p>
              </div>
            </div>
          </div>

          {/* GRÁFICOS RECHARTS */}
          {/* NOVO: Acompanhamento de Metas Dinâmicas */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Trophy className="w-4 h-4 mr-2 text-[#C87941]" />
                Sua Jornada: {settings?.jornada_semanal_uber || 5} dias por semana
              </h3>
              <p className="text-xs text-gray-500 mb-6">Com base no que você já faturou este mês e nos dias que faltam para acabar o mês, recalculamos diariamente o quanto você precisa fazer para bater a meta.</p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 uppercase font-semibold tracking-wider">Novo Alvo Semanal</span>
                    <span className={`font-bold ${metaUberSemanal > 0 ? 'text-[#C87941]' : 'text-[#7A8B76]'}`}>{metaUberSemanal > 0 ? formatCurrency(metaUberSemanal) : 'Batida!'}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 uppercase font-semibold tracking-wider">Novo Alvo Diário (Líquido)</span>
                    <span className={`font-bold ${metaUberDiaria > 0 ? 'text-[#C87941]' : 'text-[#7A8B76]'}`}>{metaUberDiaria > 0 ? formatCurrency(metaUberDiaria) : 'Batida!'}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 uppercase font-semibold tracking-wider">Alvo Bruto Diário</span>
                    <span className={`font-bold ${alvoBrutoDiario > 0 ? 'text-[#8B5A2B]' : 'text-[#5a6b55]'}`}>{alvoBrutoDiario > 0 ? formatCurrency(alvoBrutoDiario) : 'Batida!'}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Estimado c/ base no gasto histórico de {(percGasolina * 100).toFixed(1)}% com combustível.</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 border-l border-gray-100 pl-6 flex flex-col justify-center">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4 flex items-center">
                Progresso da Semana Atual
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md normal-case font-medium text-[10px] tracking-normal">
                  {format(comecoSemana, 'dd/MM')} a {format(fimSemana, 'dd/MM')}
                </span>
              </h3>
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-light text-gray-800">{formatCurrency(lucroSemanaAtual)}</span>
                <span className="text-sm font-semibold text-gray-500">{percentualSemana.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${percentualSemana >= 100 ? 'bg-[#7A8B76]' : 'bg-[#C87941]'}`} style={{ width: `${percentualSemana}%` }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                <span>R$ 0,00</span>
                <span>{metaUberSemanalProporcional > 0 ? formatCurrency(metaUberSemanalProporcional) : 'Meta Batida'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. BarChart: Lucro Semana */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">Média de Lucro por Dia da Semana</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                    <Tooltip cursor={{fill: '#f9fafb'}} content={<CustomTooltip />} />
                    <Bar dataKey="lucro" name="Lucro Líquido" fill="#C87941" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Gauge: Eficiência Mensal */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2 w-full text-left">Eficiência: Meta {formatCurrency(metaKm)}/km</h3>
              <div className="h-40 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={gaugeData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                      <Cell fill="#7A8B76" />
                      <Cell fill="#f3f4f6" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute bottom-4 flex flex-col items-center">
                  <span className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.mediaKmMes)}<span className="text-xs text-gray-400 font-normal">/km</span></span>
                  <span className="text-[10px] text-gray-400 mt-0.5">atingidos no período</span>
                </div>
              </div>
            </div>

            {/* 3. Heatmap Calendar */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">
                {filterType === 'month' ? 'Heatmap (Desempenho Diário)' : 'Heatmap (Média do Dia no Mês)'}
              </h3>
              
              {filterType === 'month' ? (
                <div className="grid grid-cols-7 gap-1">
                  {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} className="text-[10px] text-center font-bold text-gray-400">{d}</div>)}
                  {/* Offset do primeiro dia do mes */}
                  {heatmapDays.length > 0 && Array.from({length: heatmapDays[0].date.getDay()}).map((_, i) => <div key={`empty-${i}`}></div>)}
                  {heatmapDays.map((d) => (
                    <div 
                      key={d.dateStr} 
                      title={`${d.dateStr} (Lucro: ${formatCurrency(d.lucro)})`}
                      className={`aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium transition-colors ${d.statusClass}`}
                    >
                      {d.date.getDate()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {aggregatedHeatmap && aggregatedHeatmap.map((d) => (
                    <div 
                      key={`agg-${d.dia}`} 
                      title={`Dia ${d.dia} (Média Lucro: ${formatCurrency(d.avgLucro)} / Base: ${d.count} dias)`}
                      className={`aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium transition-colors ${d.statusClass}`}
                    >
                      {d.dia}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. LineChart Duplo: Evolução R$/Km e R$/Hora */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm md:col-span-2">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">Evolução: R$/Km e R$/Hora Brutos</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={metrics.evolData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="labelData" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '11px', color: '#6b7280'}} />
                    <Line type="monotone" name="Média R$/Hora" dataKey="mediaHr" stroke="#7A8B76" strokeWidth={3} dot={{r:3}} />
                    <Line type="monotone" name="Média R$/Km" dataKey="mediaKm" stroke="#2D2A26" strokeWidth={3} dot={{r:3}} yAxisId="right" />
                    <YAxis yAxisId="right" orientation="right" hide />
                    <YAxis hide />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 5. ScatterPlot: Horas vs Lucro */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">Esforço vs Retorno (Scatter)</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" dataKey="x" name="Horas" unit="h" tick={{fontSize:10}} stroke="#e5e7eb" />
                    <YAxis type="number" dataKey="y" name="Lucro" unit=" R$" tick={{fontSize:10}} stroke="#e5e7eb" />
                    <Tooltip content={<ScatterTooltip />} cursor={{strokeDasharray: '3 3'}} />
                    <Scatter name="Dias" data={metrics.scatterData} fill="#C87941" shape="circle" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6. AreaChart: Faturamento vs Combustivel */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm md:col-span-3 flex flex-col md:flex-row gap-6 items-center">
              <div className="w-full md:w-3/4">
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">Margem Diária (Faturamento x Custo Combustível)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.evolData}>
                      <defs>
                        <linearGradient id="colorBruto" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7A8B76" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#7A8B76" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorComb" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A35C5C" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#A35C5C" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="labelData" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{fontSize: '11px'}} />
                      <Area type="monotone" dataKey="bruto" name="Faturamento Bruto" stroke="#7A8B76" fillOpacity={1} fill="url(#colorBruto)" />
                      <Area type="monotone" dataKey="combustivel" name="Custo Combustível" stroke="#A35C5C" fillOpacity={1} fill="url(#colorComb)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="w-full md:w-1/4 flex flex-col items-center justify-center p-6 bg-gray-50/50 rounded-xl border border-gray-100 h-full">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-3 text-center">Taxa Média de Combustível</h4>
                <p className="text-4xl font-light text-[#A35C5C]">
                  {metrics.totalBruto > 0 ? ((metrics.totalCombustivel / metrics.totalBruto) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-[10px] text-gray-500 mt-3 text-center leading-relaxed">
                  Do seu faturamento bruto é destinado apenas para custear o combustível.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: REGISTRO DE JORNADA */}
      {activeTab === 'registro' && (
        <div className="space-y-6 animate-fade-in">
          {/* Lado Direito Inteiro: Histórico em Cards */}
          <div className="w-full space-y-4">
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2"/> Histórico de Jornadas
                <span className="ml-2 font-normal text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 hidden md:inline-block">
                   {filterType === 'month' ? localMonth : filterType === 'all' ? 'Tudo' : `${startDate.split('-').reverse().join('/')} - ${endDate.split('-').reverse().join('/')}`}
                </span>
              </h3>
              <button 
                onClick={handleOpenNewModal} 
                className="bg-[#2D2A26] hover:bg-[#1a1816] text-white text-xs font-medium py-2 px-4 rounded-md transition-colors shadow-sm flex items-center"
              >
                <Edit3 className="w-3 h-3 mr-2" /> Nova Jornada
              </button>
            </div>
            
            {uberLogs.length === 0 && (
              <div className="bg-white border border-gray-100 p-10 text-center rounded-xl shadow-sm">
                <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhuma corrida registrada neste período.</p>
              </div>
            )}

            {/* Listagem Reversa Horizontal (Mais recentes primeiro) c/ limite visibleCount */}
            <div className="flex flex-col space-y-3">
              {[...uberLogs].sort((a,b) => b.data.localeCompare(a.data)).slice(0, visibleCount).map(log => {
                
                let hrs = 0;
                if(log.tempo_online && log.tempo_online.includes(':')) {
                   const [hh, mm] = log.tempo_online.split(':');
                   hrs = parseInt(hh) + (parseInt(mm)/60);
                }
                const mediaHr = hrs > 0 ? (log.valor_bruto / hrs) : 0;
                const mediaKm = log.km > 0 ? (log.valor_bruto / log.km) : 0;
                const isWinner = mediaKm >= metaKm;

                return (
                  <div key={log.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between group gap-4 relative">
                    
                    {/* Lado Esquerdo: Ícone + Data + Infos Básicas */}
                    <div className="flex items-center space-x-4 md:flex-[1.2]">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isWinner ? 'bg-[#7A8B76]/10' : 'bg-gray-50 border border-gray-100'}`}>
                        {isWinner ? <Trophy className="w-5 h-5 text-[#7A8B76]" /> : <Car className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-gray-800">{log.data.split('-').reverse().join('/')}</h4>
                          <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-medium">{log.aplicativo}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-3 mt-1.5">
                          <span className="flex items-center" title="Horas Online"><Clock className="w-3.5 h-3.5 mr-1 opacity-60"/>{log.tempo_online}h</span>
                          <span className="flex items-center" title="Corridas"><User className="w-3.5 h-3.5 mr-1 opacity-60"/>{log.corridas}</span>
                          <span className="flex items-center" title="Km Rodados"><MapPin className="w-3.5 h-3.5 mr-1 opacity-60"/>{log.km} km</span>
                        </div>
                      </div>
                    </div>

                    {/* Centro: Valores */}
                    <div className="flex items-center justify-between md:justify-center space-x-4 md:space-x-6 md:flex-[2] border-t md:border-t-0 border-gray-50 pt-3 md:pt-0">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Bruto</p>
                        <p className="text-sm font-medium text-gray-700">{formatCurrency(log.valor_bruto)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-[#A35C5C] uppercase font-semibold">Gasto</p>
                        <p className="text-sm font-medium text-gray-700">{formatCurrency(log.combustivel + log.manutencao)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Média/Hora</p>
                        <p className="text-sm font-medium text-gray-700">{formatCurrency(mediaHr)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Média/Km</p>
                        <p className={`text-sm font-bold ${mediaKm >= metaKm ? 'text-[#7A8B76]' : 'text-gray-700'}`}>{formatCurrency(mediaKm)}</p>
                      </div>
                    </div>

                    {/* Lado Direito: Lucro + Ações */}
                    <div className="flex items-center justify-between md:justify-end space-x-6 md:flex-[0.8] border-t md:border-t-0 border-gray-50 pt-3 md:pt-0">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Lucro Líq.</p>
                        <p className={`text-lg font-bold ${log.lucro_liquido > 0 ? 'text-[#7A8B76]' : 'text-[#A35C5C]'}`}>
                          {formatCurrency(log.lucro_liquido)}
                        </p>
                      </div>
                      <div className="flex space-x-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(log)} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#C87941] hover:bg-orange-50 transition-colors"><Edit3 className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(log.id)} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
            
            {/* Observer Target para Infinite Scroll */}
            {visibleCount < uberLogs.length && (
              <div ref={observerTarget} className="h-10 w-full flex items-center justify-center text-gray-400 text-xs">
                 Carregando mais jornadas...
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE JORNADA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 border-b border-gray-100 p-5 flex justify-between items-center shrink-0">
              <h3 className="font-medium text-gray-800 flex items-center"><Edit3 className="w-4 h-4 mr-2 text-[#C87941]"/> {editingId ? 'Editar Jornada' : 'Nova Jornada'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="overflow-y-auto p-5">
              <form id="uberForm" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center"><Car className="w-3 h-3 mr-1"/> Básico</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm text-gray-800 bg-gray-50 focus:border-[#C87941]" required />
                    <select value={form.aplicativo} onChange={e => setForm({...form, aplicativo: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm text-gray-800 bg-gray-50 focus:border-[#C87941]">
                       <option value="Uber">Uber</option>
                       <option value="99">99</option>
                       <option value="Multi">Multi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center"><Clock className="w-3 h-3 mr-1"/> Operação</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="time" title="Horas Online" value={form.tempo_online} onChange={e => setForm({...form, tempo_online: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm text-gray-800 bg-gray-50 focus:border-[#C87941]" required />
                    <input type="number" title="Corridas" placeholder="Viagens" value={form.corridas} onChange={e => setForm({...form, corridas: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm text-gray-800 bg-gray-50 focus:border-[#C87941]" required />
                    <input type="number" step="0.1" title="Km Rodados" placeholder="KM" value={form.km} onChange={e => setForm({...form, km: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm text-gray-800 bg-gray-50 focus:border-[#C87941]" required />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center"><DollarSign className="w-3 h-3 mr-1"/> Ganhos e Custos</label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input type="number" step="0.01" placeholder="Valor Bruto R$" value={form.valor_bruto} onChange={e => setForm({...form, valor_bruto: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm text-gray-800 focus:border-[#C87941] bg-white font-medium" required />
                    <input type="number" step="0.01" placeholder="Combustível R$" value={form.combustivel} onChange={e => setForm({...form, combustivel: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm text-[#A35C5C] focus:border-[#C87941] bg-white" required />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="number" step="0.01" placeholder="Bônus R$" value={form.bonus} onChange={e => setForm({...form, bonus: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm bg-gray-50" />
                    <input type="number" step="0.01" placeholder="Gorjeta R$" value={form.gorjeta} onChange={e => setForm({...form, gorjeta: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm bg-gray-50" />
                    <input type="number" step="0.01" placeholder="Outros R$" title="Manutenção, Limpeza" value={form.manutencao} onChange={e => setForm({...form, manutencao: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded outline-none text-sm bg-gray-50" />
                  </div>
                </div>

                {/* REAL TIME PREVIEW */}
                <div className={`p-4 rounded-lg flex justify-between items-center transition-colors ${previewLucro > 0 ? 'bg-[#7A8B76]/10' : 'bg-gray-100'}`}>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview Lucro Líq.</span>
                  <span className={`text-lg font-bold ${previewLucro > 0 ? 'text-[#7A8B76]' : 'text-gray-800'}`}>{formatCurrency(previewLucro)}</span>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 shrink-0 bg-white flex space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors text-center">
                Cancelar
              </button>
              <button form="uberForm" type="submit" className="flex-1 py-3 bg-[#2D2A26] hover:bg-[#1a1816] text-white text-sm font-medium rounded-md transition-colors shadow-sm flex items-center justify-center">
                <Save className="w-4 h-4 mr-2" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
