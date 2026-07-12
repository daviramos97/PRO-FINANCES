import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit3, Trash2, Settings, ArrowRight } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function CardsHub({ filterMonth }) {
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(() => {
    const saved = localStorage.getItem('profinances_selectedCardId');
    return saved ? Number(saved) : null;
  });
  const [invoiceData, setInvoiceData] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [nextMonthTotal, setNextMonthTotal] = useState({ month: '', total: 0 });
  const [invoiceMonth, setInvoiceMonth] = useState(filterMonth);
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  // Forms
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [newPurchase, setNewPurchase] = useState({ id: null, description: '', amount: '', purchase_date: '', installments: 1 });
  const [cardForm, setCardForm] = useState({ id: null, name: '', limit_amount: '', closing_day: 10, due_day: 20, color: '#000000' });

  const fetchCards = async () => {
    const res = await fetch('http://localhost:4006/api/cards');
    const data = await res.json();
    setCards(data);
    if (data.length > 0 && !selectedCardId) {
      setSelectedCardId(data[0].id);
    } else if (data.length === 0) {
      setSelectedCardId(null);
      setInvoiceData(null);
    }
  };

  const fetchInvoice = async () => {
    if (!selectedCardId) return;
    const res = await fetch(`http://localhost:4006/api/cards/${selectedCardId}/invoice/${invoiceMonth}`);
    const data = await res.json();
    setInvoiceData(data);
    
    try {
      const resProj = await fetch(`http://localhost:4006/api/cards/${selectedCardId}/projection/${invoiceMonth}`);
      const dataProj = await resProj.json();
      setProjectionData(dataProj);
    } catch (e) {
      console.error("Erro ao buscar projeção", e);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    const fetchNextTotal = async () => {
      try {
        const res = await fetch(`http://localhost:4006/api/cards/total_next_month/${filterMonth}`);
        const data = await res.json();
        setNextMonthTotal({ month: data.target_month, total: data.total });
      } catch (e) {
        console.error("Erro ao buscar total geral do mês seguinte", e);
      }
    };
    fetchNextTotal();
  }, [filterMonth, cards]);

  useEffect(() => {
    setInvoiceMonth(filterMonth);
  }, [filterMonth]);

  useEffect(() => {
    if(selectedCardId) localStorage.setItem('profinances_selectedCardId', selectedCardId);
    else localStorage.removeItem('profinances_selectedCardId');
  }, [selectedCardId]);

  useEffect(() => {
    fetchInvoice();
  }, [selectedCardId, invoiceMonth]);

  // Purchases
  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!selectedCardId) return;
    
    if (newPurchase.id) {
      await fetch(`http://localhost:4006/api/cards/purchases/${newPurchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPurchase)
      });
    } else {
      await fetch(`http://localhost:4006/api/cards/${selectedCardId}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPurchase)
      });
    }
    setIsPurchaseModalOpen(false);
    setNewPurchase({ id: null, description: '', amount: '', purchase_date: '', installments: 1 });
    fetchInvoice();
    fetchCards();
  };

  const handleDeletePurchase = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Compra',
      message: 'Tem certeza que deseja excluir esta compra? O valor será deduzido da sua fatura.',
      onConfirm: async () => {
        await fetch(`http://localhost:4006/api/cards/purchases/${id}`, { method: 'DELETE' });
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        fetchInvoice();
        fetchCards();
      }
    });
  };

  // Card Management
  const openCardModal = (card = null) => {
    if (card) {
      setCardForm(card);
    } else {
      setCardForm({ id: null, name: '', limit_amount: '', closing_day: 10, due_day: 20, color: '#C87941' });
    }
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    const isEdit = !!cardForm.id;
    const url = isEdit ? `http://localhost:4006/api/cards/${cardForm.id}` : `http://localhost:4006/api/cards`;
    const method = isEdit ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardForm)
    });
    
    setIsCardModalOpen(false);
    fetchCards();
  };

  const handleDeleteCard = (cardId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Cartão',
      message: 'Tem certeza que deseja excluir este cartão? Todas as compras e faturas vinculadas serão perdidas.',
      onConfirm: async () => {
        await fetch(`http://localhost:4006/api/cards/${cardId}`, { method: 'DELETE' });
        if(selectedCardId === cardId) setSelectedCardId(null);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        fetchCards();
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-light text-gray-800">Meus Cartões</h2>
          <p className="text-sm text-gray-500 font-light mt-1 mb-2">Gerencie seus cartões de crédito de forma minimalista</p>
          {nextMonthTotal.month && nextMonthTotal.total > 0 && (
            <div className="inline-flex items-center gap-2 bg-[#A35C5C]/10 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-[#A35C5C] animate-pulse"></div>
              <p className="text-xs font-medium text-[#A35C5C]">
                Total previsto para {new Date(`${nextMonthTotal.month}-02`).toLocaleString('pt-BR', { month: 'long' }).replace('.', '').toUpperCase()}: {formatCurrency(nextMonthTotal.total)}
              </p>
            </div>
          )}
        </div>
        <button 
          onClick={() => openCardModal()}
          className="px-4 py-2 bg-gray-900 text-white rounded-md flex items-center gap-2 hover:bg-gray-800 transition-colors text-sm"
        >
          <Plus size={16} /> Novo Cartão
        </button>
      </div>

      {/* Grid de Cartões Minimalista */}
      {cards.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-lg text-gray-500">
          Nenhum cartão cadastrado. Clique no botão acima para adicionar um.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
          {cards.map(card => (
            <div 
              key={card.id} 
              onClick={() => { setSelectedCardId(card.id); setIsInvoiceModalOpen(true); }}
              className={`h-44 rounded-xl p-6 cursor-pointer flex flex-col justify-between transition-all border shadow-sm hover:shadow-md hover:-translate-y-1 relative overflow-hidden bg-gradient-to-br from-white to-gray-50`}
              style={{ borderLeftWidth: '6px', borderLeftColor: card.color || '#333' }}
            >
              <div className="flex justify-between items-start z-10">
                <span className="font-bold text-gray-800 text-lg tracking-wide">{card.name}</span>
                <div className="flex gap-3">
                  <button onClick={(e) => { e.stopPropagation(); openCardModal(card); }} className="text-gray-400 hover:text-gray-600 transition-colors p-1 bg-white/80 rounded-full shadow-sm">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-white/80 rounded-full shadow-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              {/* Botão de Lançar Compra Rápido no Cartão */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedCardId(card.id); 
                  setNewPurchase({ id: null, description: '', amount: '', purchase_date: '', installments: 1 }); 
                  setIsPurchaseModalOpen(true); 
                }} 
                className="absolute right-6 bottom-16 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 hover:scale-110 transition-transform z-20"
                title="Lançar nova compra"
              >
                <Plus size={24} />
              </button>

              <div className="flex flex-col gap-2 z-10 w-full mt-4">
                <div className="flex justify-between items-end mb-1">
                  <div className="text-left">
                    <p className="text-[10px] text-gray-500 font-medium">F: {card.closing_day} &nbsp;|&nbsp; V: {card.due_day}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-700 font-bold">{formatCurrency(card.used_limit)} <span className="text-gray-400 font-normal">/ {formatCurrency(card.limit_amount)}</span></p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(((card.used_limit || 0) / card.limit_amount) * 100, 100)}%`, backgroundColor: card.color || '#333' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal da Fatura Selecionada */}
      {isInvoiceModalOpen && invoiceData && invoiceData.card && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-gray-800">Fatura: {invoiceData.card.name}</h3>
                <input 
                  type="month" 
                  value={invoiceMonth}
                  onChange={(e) => setInvoiceMonth(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-[#C87941]"
                />
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6 flex flex-col md:flex-row gap-8 overflow-y-auto">
              <div className="w-full md:w-2/5 md:border-r border-gray-100 md:pr-6 flex flex-col">
                <h3 className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Total da Fatura</h3>
                <p className="text-4xl font-black mb-4 text-[#A35C5C]">
                  {formatCurrency(invoiceData.total)}
                </p>
                
                {projectionData && projectionData.length > 0 && (
                  <div className="mt-4 mb-6 h-40 w-full">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Projeção de Alívio (6 Meses)</p>
                    <Line 
                      plugins={[{
                        id: 'drawValues',
                        afterDatasetsDraw(chart) {
                          const { ctx, data } = chart;
                          ctx.save();
                          ctx.font = 'bold 11px sans-serif';
                          ctx.fillStyle = '#6B7280'; // text-gray-500
                          ctx.textAlign = 'center';
                          ctx.textBaseline = 'bottom';
                          chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
                            const value = data.datasets[0].data[index];
                            const text = formatCurrency(value);
                            ctx.fillText(text, datapoint.x, datapoint.y - 8);
                          });
                          ctx.restore();
                        }
                      }]}
                      data={{
                        labels: projectionData.map(d => {
                          const [y, m] = d.month.split('-');
                          const date = new Date(y, m - 1);
                          return date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
                        }),
                        datasets: [{
                          label: 'Fatura',
                          data: projectionData.map(d => d.total),
                          borderColor: invoiceData.card.color || '#C87941',
                          backgroundColor: `${invoiceData.card.color || '#C87941'}20`,
                          tension: 0.4,
                          fill: true,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                          clip: false
                        }]
                      }}
                      options={{
                        layout: { padding: { top: 25 } },
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { 
                          x: { display: true, grid: { display: false } }, 
                          y: { display: false, min: 0 } 
                        }
                      }}
                    />
                  </div>
                )}

                <button 
                  onClick={() => { setNewPurchase({ id: null, description: '', amount: '', purchase_date: '', installments: 1 }); setIsPurchaseModalOpen(true); }}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors shadow-md mt-auto"
                >
                  <Plus size={18} /> Lançar Compra
                </button>
              </div>

              <div className="w-full md:w-3/5">
                <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Lançamentos deste Mês</h3>
                
                <div className="space-y-2">
                  {invoiceData.items.length === 0 ? (
                    <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-gray-500 text-sm">Nenhuma compra listada para esta fatura.</p>
                    </div>
                  ) : (
                    invoiceData.items.map((item, index) => (
                      <div key={index} className="group flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="bg-white border border-gray-200 shadow-sm rounded-full p-2.5 text-gray-500">
                            <CreditCard size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{item.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.purchase_date.split('-').reverse().join('/')} 
                              {item.total_installments > 1 && <span className="ml-2 px-1.5 py-0.5 bg-gray-200 rounded text-[10px] font-bold text-gray-600">{item.current_installment}/{item.total_installments}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-gray-700">{formatCurrency(item.installment_amount)}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setNewPurchase({ id: item.id, description: item.description, amount: (item.installment_amount * item.total_installments).toFixed(2), purchase_date: item.purchase_date, installments: item.total_installments }); setIsPurchaseModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-[#C87941] bg-white rounded shadow-sm border border-gray-100 transition-all hover:scale-110">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeletePurchase(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-white rounded shadow-sm border border-gray-100 transition-all hover:scale-110">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Compra */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">{newPurchase.id ? 'Editar Compra' : 'Nova Compra'}</h3>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleAddPurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Descrição</label>
                <input required type="text" value={newPurchase.description} onChange={e => setNewPurchase({...newPurchase, description: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400" placeholder="Ex: Mercado" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Valor Total (R$)</label>
                <input required type="number" step="0.01" value={newPurchase.amount} onChange={e => setNewPurchase({...newPurchase, amount: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400" placeholder="0.00" />
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Data da Compra</label>
                  <input required type="date" value={newPurchase.purchase_date} onChange={e => setNewPurchase({...newPurchase, purchase_date: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Parcelas</label>
                  <input required type="number" min="1" max="48" value={newPurchase.installments} onChange={e => setNewPurchase({...newPurchase, installments: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 mt-2 bg-gray-900 text-white rounded font-medium hover:bg-gray-800 transition-colors text-sm">
                {newPurchase.id ? 'Salvar Alterações' : 'Lançar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar Cartão */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">{cardForm.id ? 'Editar Cartão' : 'Novo Cartão'}</h3>
              <button onClick={() => setIsCardModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSaveCard} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Nome do Cartão</label>
                <input required type="text" value={cardForm.name} onChange={e => setCardForm({...cardForm, name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400" placeholder="Ex: Nubank" />
              </div>
              <div className="flex gap-4">
                <div className="w-2/3">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Limite (R$)</label>
                  <input required type="number" step="0.01" value={cardForm.limit_amount} onChange={e => setCardForm({...cardForm, limit_amount: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400" placeholder="0.00" />
                </div>
                <div className="w-1/3">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Cor de Destaque</label>
                  <input required type="color" value={cardForm.color} onChange={e => setCardForm({...cardForm, color: e.target.value})} className="w-full h-[42px] p-1 bg-gray-50 border border-gray-200 rounded cursor-pointer" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Dia Fechamento</label>
                  <input required type="number" min="1" max="31" value={cardForm.closing_day} onChange={e => setCardForm({...cardForm, closing_day: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Dia Vencimento</label>
                  <input required type="number" min="1" max="31" value={cardForm.due_day} onChange={e => setCardForm({...cardForm, due_day: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 mt-2 bg-gray-900 text-white rounded font-medium hover:bg-gray-800 transition-colors text-sm">
                Salvar Cartão
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação (Substitui window.confirm) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="px-5 py-2 text-white bg-red-500 hover:bg-red-600 rounded-md font-medium text-sm transition-colors shadow-sm"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
