import React from 'react';
import { 
  Wallet, LayoutDashboard, ArrowLeftRight, Car, 
  CreditCard, AlertTriangle, Settings, Calendar, 
  ChevronDown, Bell, Landmark, TrendingUp, 
  ArrowDownToLine, ArrowUpFromLine, TrendingDown, 
  WalletCards, MoreHorizontal 
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';

export default function App() {
  const cashflowData = {
    labels: ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'],
    datasets: [
      {
        label: 'Receitas',
        data: [12500, 14000, 13800, 14200, 14500, 15300],
        backgroundColor: '#7A8B76',
        borderRadius: 4,
        barPercentage: 0.65,
        categoryPercentage: 0.8
      },
      {
        label: 'Despesas',
        data: [9000, 11500, 8500, 8800, 8900, 8450],
        backgroundColor: '#A35C5C',
        borderRadius: 4,
        barPercentage: 0.65,
        categoryPercentage: 0.8
      }
    ]
  };

  const cashflowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 13, weight: '500' } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#2D2A26',
        titleFont: { size: 14, weight: '600' },
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: { callback: (value) => 'R$ ' + value / 1000 + 'k' }
      },
      x: {
        border: { display: false },
        grid: { display: false }
      }
    }
  };

  const expensesData = {
    labels: ['Moradia', 'Alimentação', 'Transporte', 'Lazer & Outros'],
    datasets: [{
      data: [3500, 1800, 1200, 1950],
      backgroundColor: ['#2D2A26', '#C87941', '#7A8B76', '#D4CFC7'],
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6
    }]
  };

  const expensesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2D2A26',
        callbacks: {
          label: (context) => ' ' + new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed)
        }
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar flex flex-col shadow-lg z-10 transition-all">
        <div className="h-20 flex items-center px-6 border-b border-gray-700">
          <Wallet className="text-primary w-6 h-6 mr-3" />
          <span className="text-white font-bold text-xl tracking-wide">Finanças PRO</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 bg-primary/10 text-primary border-r-4 border-primary rounded-l-lg transition-all">
            <LayoutDashboard className="w-5 h-5 mr-3" />
            <span className="font-medium">Dashboard</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all group">
            <ArrowLeftRight className="w-5 h-5 mr-3 group-hover:text-primary transition-all" />
            <span className="font-medium">Transações</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all group">
            <Car className="w-5 h-5 mr-3 group-hover:text-primary transition-all" />
            <span className="font-medium">Uber Hub</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all group">
            <CreditCard className="w-5 h-5 mr-3 group-hover:text-primary transition-all" />
            <span className="font-medium">Cartões</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all group">
            <AlertTriangle className="w-5 h-5 mr-3 group-hover:text-negative transition-all" />
            <span className="font-medium">Dívidas</span>
          </a>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <a href="#" className="flex items-center px-4 py-3 text-gray-400 hover:text-white transition-all group">
            <Settings className="w-5 h-5 mr-3 group-hover:text-primary transition-all" />
            <span>Configurações</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
        {/* Header */}
        <header className="h-20 bg-background/80 backdrop-blur-md border-b border-bordercolor flex items-center justify-between px-8 sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Olá, Davi!</h1>
            <p className="text-sm text-gray-500">Bem-vindo de volta ao seu controle financeiro.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-white border border-bordercolor rounded-lg px-4 py-2 shadow-sm hover:shadow transition-all cursor-pointer">
              <Calendar className="w-4 h-4 text-primary mr-2" />
              <span className="font-medium text-gray-700">Abril 2026</span>
              <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
            </div>
            
            <button className="relative p-2 text-gray-500 hover:text-primary transition-all">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-negative rounded-full border-2 border-background"></span>
            </button>
            
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              DR
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-bordercolor shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-all">
                  <Landmark className="w-6 h-6 text-gray-600 group-hover:text-primary transition-all" />
                </div>
                <span className="flex items-center text-sm font-medium text-positive bg-positive/10 px-2.5 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3 mr-1" />+2.4%
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Patrimônio Líquido</h3>
              <p className="text-2xl font-bold text-gray-800">R$ 142.500,00</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-bordercolor shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-positive/10 transition-all">
                  <ArrowDownToLine className="w-6 h-6 text-gray-600 group-hover:text-positive transition-all" />
                </div>
                <span className="flex items-center text-sm font-medium text-positive bg-positive/10 px-2.5 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3 mr-1" />+12%
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Receitas do Mês</h3>
              <p className="text-2xl font-bold text-gray-800">R$ 15.300,00</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-bordercolor shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-negative/10 transition-all">
                  <ArrowUpFromLine className="w-6 h-6 text-gray-600 group-hover:text-negative transition-all" />
                </div>
                <span className="flex items-center text-sm font-medium text-negative bg-negative/10 px-2.5 py-0.5 rounded-full">
                  <TrendingDown className="w-3 h-3 mr-1" />-5.2%
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Despesas do Mês</h3>
              <p className="text-2xl font-bold text-gray-800">R$ 8.450,00</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-bordercolor shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-primary/10 transition-all">
                  <WalletCards className="w-6 h-6 text-gray-600 group-hover:text-primary transition-all" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Saldo Disponível</h3>
              <p className="text-2xl font-bold text-gray-800">R$ 6.850,00</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-bordercolor shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Fluxo de Caixa</h2>
                <button className="text-sm text-gray-500 hover:text-primary transition-all flex items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  Últimos 6 meses <ChevronDown className="w-4 h-4 ml-1" />
                </button>
              </div>
              <div className="relative h-[300px] w-full">
                <Bar data={cashflowData} options={cashflowOptions} />
              </div>
            </div>

            <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-bordercolor shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Despesas por Categoria</h2>
                <button className="text-gray-400 hover:text-primary transition-all">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative h-[220px] w-full flex justify-center mb-4">
                <Doughnut data={expensesData} options={expensesOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-500 font-medium">Total</span>
                  <span className="text-lg font-bold text-gray-800">R$ 8.450</span>
                </div>
              </div>

              <div className="mt-auto space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between text-sm group">
                  <div className="flex items-center text-gray-600 group-hover:text-gray-900 transition-colors">
                    <span className="w-3 h-3 rounded-full bg-[#2D2A26] mr-3 shadow-sm"></span>
                    Moradia
                  </div>
                  <span className="font-medium text-gray-800">R$ 3.500</span>
                </div>
                <div className="flex items-center justify-between text-sm group">
                  <div className="flex items-center text-gray-600 group-hover:text-gray-900 transition-colors">
                    <span className="w-3 h-3 rounded-full bg-[#C87941] mr-3 shadow-sm"></span>
                    Alimentação
                  </div>
                  <span className="font-medium text-gray-800">R$ 1.800</span>
                </div>
                <div className="flex items-center justify-between text-sm group">
                  <div className="flex items-center text-gray-600 group-hover:text-gray-900 transition-colors">
                    <span className="w-3 h-3 rounded-full bg-[#7A8B76] mr-3 shadow-sm"></span>
                    Transporte (Uber)
                  </div>
                  <span className="font-medium text-gray-800">R$ 1.200</span>
                </div>
                <div className="flex items-center justify-between text-sm group">
                  <div className="flex items-center text-gray-600 group-hover:text-gray-900 transition-colors">
                    <span className="w-3 h-3 rounded-full bg-[#D4CFC7] mr-3 shadow-sm"></span>
                    Lazer & Outros
                  </div>
                  <span className="font-medium text-gray-800">R$ 1.950</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
