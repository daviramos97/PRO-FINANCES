import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit3, Trash2, Settings, ArrowRight } from 'lucide-react';

export default function CardsHub({ filterMonth }) {
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  
  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  
  // Forms
  const [newPurchase, setNewPurchase] = useState({ description: '', amount: '', purchase_date: '', installments: 1 });
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
    const res = await fetch(`http://localhost:4006/api/cards/${selectedCardId}/invoice/${filterMonth}`);
    const data = await res.json();
    setInvoiceData(data);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    fetchInvoice();
  }, [selectedCardId, filterMonth]);

  // Purchases
  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!selectedCardId) return;
    await fetch(`http://localhost:4006/api/cards/${selectedCardId}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPurchase)
    });
    setIsPurchaseModalOpen(false);
    setNewPurchase({ description: '', amount: '', purchase_date: '', installments: 1 });
    fetchInvoice();
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

  const handleDeleteCard = async (cardId) => {
    if(!window.confirm("Tem certeza que deseja excluir este cartão? Todas as compras e faturas vinculadas serão perdidas.")) return;
    await fetch(`http://localhost:4006/api/cards/${cardId}`, { method: 'DELETE' });
    if(selectedCardId === cardId) setSelectedCardId(null);
    fetchCards();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-light text-gray-800">Meus Cartões</h2>
          <p className="text-sm text-gray-500 font-light mt-1">Gerencie seus cartões de crédito de forma minimalista</p>
        </div>
        <button 
          onClick={() => openCardModal()}
          className="px-4 py-2 bg-gray-900 text-white rounded-md flex items-center gap-2 hover:bg-gray-800 transition-colors text-sm"
        >
          <Plus size={16} /> Novo Cartão
        </button>
      </div>

      {/* Carrossel de Cartões Minimalista */}
      {cards.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-lg text-gray-500">
          Nenhum cartão cadastrado. Clique no botão acima para adicionar um.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {cards.map(card => (
            <div 
              key={card.id} 
              onClick={() => setSelectedCardId(card.id)}
              className={`min-w-[280px] h-32 rounded-xl p-5 cursor-pointer flex flex-col justify-between transition-all border ${selectedCardId === card.id ? 'bg-white shadow-md border-gray-200 ring-1 ring-gray-200' : 'bg-gray-50/50 border-gray-200 opacity-70 hover:opacity-100 hover:bg-white'}`}
              style={{ borderLeftWidth: '4px', borderLeftColor: card.color || '#333' }}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-gray-800">{card.name}</span>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openCardModal(card); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-400 font-light">Limite Total</p>
                  <p className="text-sm text-gray-700 font-medium">R$ {card.limit_amount.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400">Fecha: {card.closing_day}</p>
                  <p className="text-[11px] text-gray-400">Vence: {card.due_day}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Área da Fatura Selecionada */}
      {invoiceData && invoiceData.card && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-8">
          
          <div className="w-full md:w-1/3 md:border-r border-gray-100 md:pr-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Fatura {invoiceData.card.name}</h3>
            <p className="text-3xl font-bold mb-6 text-gray-800">
              R$ {invoiceData.total.toFixed(2)}
            </p>
            <button 
              onClick={() => setIsPurchaseModalOpen(true)}
              className="w-full py-2.5 rounded-md flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <Plus size={18} /> Lançar Compra
            </button>
          </div>

          <div className="w-full md:w-2/3">
            <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Lançamentos</h3>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {invoiceData.items.length === 0 ? (
                <p className="text-gray-400 text-sm font-light">Nenhuma compra listada para esta fatura.</p>
              ) : (
                invoiceData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${invoiceData.card.color}15`, color: invoiceData.card.color }}>
                        <CreditCard size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{item.description}</p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(item.purchase_date).toLocaleDateString('pt-BR')} 
                          {item.total_installments > 1 && ` • ${item.current_installment}/${item.total_installments}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">R$ {item.installment_amount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Compra */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Nova Compra</h3>
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
                Lançar
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
    </div>
  );
}
