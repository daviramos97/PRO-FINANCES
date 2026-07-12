import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Calendar, DollarSign, Target, Car, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Line } from 'react-chartjs-2';

const ReportsHub = ({ globalSettings, globalDashboard, globalReliefData }) => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const chartRef = useRef(null);

  // Set default month to current month on load
  useEffect(() => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
  }, []);

  // Fetch preview data when month changes
  useEffect(() => {
    if (!selectedMonth) return;
    const fetchPreview = async () => {
      try {
        const [dashRes, despRes, recRes] = await Promise.all([
          fetch(`/api/dashboard/${selectedMonth}`),
          fetch(`/api/despesas/${selectedMonth}`),
          fetch(`/api/receitas/${selectedMonth}`)
        ]);
        const dash = await dashRes.json();
        const despesas = await despRes.json();
        const receitas = await recRes.json();
        setPreviewData({ dash, despesas, receitas });
      } catch (e) {
        console.error("Erro ao carregar preview", e);
      }
    };
    fetchPreview();
  }, [selectedMonth]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const generatePDF = () => {
    if (!previewData) return;
    setIsGenerating(true);

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        const { dash, despesas, receitas } = previewData;

        const margin = 14;
        let yPos = 20;

        // Formatação do Título do Mês
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const [year, monthStr] = selectedMonth.split('-');
        const monthName = monthNames[parseInt(monthStr, 10) - 1];
        const formattedTitle = `${monthName}/${year}`;

        // Título do Documento com Logo PRO FINANCES
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text('PRO', margin, yPos);
        const proWidth = doc.getTextWidth('PRO ');
        doc.setTextColor(200, 121, 65); // #C87941
        doc.text('FINANCES', margin + proWidth, yPos);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text(`Relatório Financeiro: ${formattedTitle}`, margin, yPos + 8);
        
        yPos += 20;

        // --- BLOCO 1: Panorama Geral ---
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text('Panorama Geral', margin, yPos);
        yPos += 6;

        const totalReceitas = (receitas.receitas?.reduce((a, r) => a + r.valor, 0) || 0) + (receitas.uber_total || 0);
        const totalDespesas = despesas.reduce((a, d) => a + (d.valor || 0), 0);
        const saldo = totalReceitas - totalDespesas;

        autoTable(doc, {
          startY: yPos,
          head: [['Entradas', 'Saídas', 'Saldo do Mês']],
          body: [[
            formatCurrency(totalReceitas),
            formatCurrency(totalDespesas),
            formatCurrency(saldo)
          ]],
          theme: 'grid',
          headStyles: { fillColor: [200, 121, 65] }, // Cor do tema #C87941
          styles: { fontSize: 11, halign: 'center' },
          columnStyles: {
            2: { fontStyle: 'bold', textColor: saldo >= 0 ? [0, 128, 0] : [255, 0, 0] }
          }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // --- BLOCO 1.5: Gráfico de Projeção (Print do Chart.js) ---
        if (chartRef.current) {
          doc.setFontSize(16);
          doc.setTextColor(40, 40, 40);
          doc.text('Projeção de Contas Fixas (Próximos Meses)', margin, yPos);
          yPos += 5;
          
          const chartImage = chartRef.current.toBase64Image('image/png', 1.0);
          // O chart real vai ter proporção de 800x400 (2:1). Vou injetar no pdf como 170x85
          doc.addImage(chartImage, 'PNG', margin, yPos, 170, 85);
          
          yPos += 95;
        }

        // --- BLOCO 2: Despesas por Categoria ---
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text('Despesas por Categoria', margin, yPos);
        yPos += 6;

        const categorias = {};
        despesas.forEach(d => {
          categorias[d.categoria] = (categorias[d.categoria] || 0) + d.valor;
        });
        
        const catArray = Object.keys(categorias).map(c => [c, formatCurrency(categorias[c]), categorias[c]]);
        catArray.sort((a, b) => b[2] - a[2]); // Ordena do maior para o menor

        autoTable(doc, {
          startY: yPos,
          head: [['Categoria', 'Valor Gasto']],
          body: catArray.map(c => [c[0], c[1]]),
          theme: 'striped',
          headStyles: { fillColor: [122, 139, 118] }, // Cor #7A8B76
          styles: { fontSize: 10 }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // --- BLOCO 3: Detalhamento de Entradas (Substitui Uber Hub isolado) ---
        // Verifica se há espaço para as entradas, se não, quebra página
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text('Detalhamento de Entradas', margin, yPos);
        yPos += 6;

        const entradasBody = (receitas.receitas || []).map(r => [r.nome || 'Outra Receita', formatCurrency(r.valor)]);
        if (receitas.uber_total > 0) {
           entradasBody.unshift(['Uber Hub (Faturamento)', formatCurrency(receitas.uber_total)]);
        }

        autoTable(doc, {
          startY: yPos,
          head: [['Fonte de Renda', 'Valor']],
          body: [
            ...entradasBody,
            ['', ''], // Linha em branco
            ['Total de Entradas', formatCurrency(totalReceitas)]
          ],
          theme: 'plain',
          headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
          styles: { fontSize: 10 },
          bodyStyles: { borderBottom: [1, 240, 240, 240] },
          willDrawCell: function(data) {
            if (data.row.index >= entradasBody.length + 1) {
              doc.setFont("helvetica", "bold");
            }
          }
        });
        
        yPos = doc.lastAutoTable.finalY + 15;

        // --- BLOCO 4: Lista Detalhada de Contas ---
        // Verifica se há espaço na página
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text('Extrato Detalhado de Despesas', margin, yPos);
        yPos += 6;

        const tableBody = despesas.map(d => [
          d.nome || 'S/N',
          d.categoria || '-',
          d.vencimento ? d.vencimento.split('-').reverse().join('/') : '-',
          d.status === 'pago' ? 'Pago' : 'Pendente',
          formatCurrency(d.valor || 0)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Descrição', 'Categoria', 'Vencimento', 'Status', 'Valor']],
          body: tableBody,
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 2, borderBottom: [1, 230, 230, 230] },
          headStyles: { fontStyle: 'bold', textColor: [40, 40, 40], borderBottom: [2, 40, 40, 40] }
        });

        // Rodapé em todas as páginas
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `PRO Finances - Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`,
            margin,
            doc.internal.pageSize.height - 10
          );
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - margin - 20,
            doc.internal.pageSize.height - 10
          );
        }

        doc.save(`PRO_Finances_Relatorio_${selectedMonth}.pdf`);
      } catch (e) {
        console.error("Erro ao gerar PDF", e);
        alert("Ocorreu um erro ao gerar o PDF.");
      } finally {
        setIsGenerating(false);
      }
    }, 500); // Simulando carregamento para UX
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-2xl font-light text-gray-800 mb-6 flex items-center">
          <FileText className="w-6 h-6 mr-3 text-[#C87941]" />
          Central de Relatórios
        </h2>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Mês de Referência</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C87941] bg-gray-50" 
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Escolha o mês que deseja gerar o relatório consolidado de fechamento.</p>
          </div>
          
          <div className="flex-1 flex items-end">
            <button 
              onClick={generatePDF}
              disabled={!previewData || isGenerating}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-medium transition-all shadow-md ${
                isGenerating ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-[#C87941] hover:bg-[#b06a39] text-white'
              }`}
            >
              <Download className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-bounce' : ''}`} />
              {isGenerating ? 'Gerando PDF...' : 'Exportar Relatório PDF'}
            </button>
          </div>
        </div>

        {/* PREVIEW SIMPLIFICADO */}
        {previewData && (
          <div className="mt-8 border-t border-gray-100 pt-8 animate-fade-in">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Filter className="w-5 h-5 mr-2 text-gray-400" />
              Preview dos Dados ({selectedMonth.split('-').reverse().join('/')})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-sm text-green-600 font-medium uppercase tracking-wider mb-1">Entradas</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency((previewData.receitas.receitas?.reduce((a, r) => a + r.valor, 0) || 0) + (previewData.receitas.uber_total || 0))}
                </p>
              </div>
              
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm text-red-600 font-medium uppercase tracking-wider mb-1">Saídas Totais</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(previewData.despesas.reduce((a, d) => a + (d.valor || 0), 0))}
                </p>
              </div>
              
              <div className={`rounded-xl p-4 border ${
                  ((previewData.receitas.receitas?.reduce((a, r) => a + r.valor, 0) || 0) + (previewData.receitas.uber_total || 0)) - previewData.despesas.reduce((a, d) => a + (d.valor || 0), 0) >= 0 
                  ? 'bg-[#7A8B76]/10 border-[#7A8B76]/20' : 'bg-red-50 border-red-100'
                }`}>
                <p className="text-sm font-medium uppercase tracking-wider mb-1 text-gray-600">Saldo/Alívio</p>
                <p className={`text-2xl font-bold ${
                  ((previewData.receitas.receitas?.reduce((a, r) => a + r.valor, 0) || 0) + (previewData.receitas.uber_total || 0)) - previewData.despesas.reduce((a, d) => a + (d.valor || 0), 0) >= 0 
                  ? 'text-[#7A8B76]' : 'text-red-600'
                }`}>
                  {formatCurrency(((previewData.receitas.receitas?.reduce((a, r) => a + r.valor, 0) || 0) + (previewData.receitas.uber_total || 0)) - previewData.despesas.reduce((a, d) => a + (d.valor || 0), 0))}
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 mt-6 text-center">O arquivo PDF conterá um detalhamento completo de todas as categorias, Uber Hub e lista individual de cada despesa lançada neste mês.</p>
          </div>
        )}
      </div>

      {/* Gráfico Oculto para Captura no PDF */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', height: '400px', backgroundColor: 'white' }}>
        {globalReliefData && globalReliefData.labels && (
          <Line 
            ref={chartRef}
            data={{
              labels: globalReliefData.labels,
              datasets: [{
                  label: 'Contas Fixas Projetadas (R$)',
                  data: globalReliefData.data,
                  borderColor: '#C87941',
                  backgroundColor: 'rgba(200, 121, 65, 0.1)', // Corrigi pra laranja suave
                  tension: 0.3,
                  fill: true
              }]
            }} 
            options={{ 
              maintainAspectRatio: false, 
              animation: false, // Sem animação para garantir captura imediata
              plugins: { legend: { display: false } }, 
              scales: { y: { beginAtZero: true } } 
            }}
            plugins={[{
              id: 'staticLabels',
              afterDraw: (chart) => {
                const { ctx, data } = chart;
                ctx.save();
                ctx.font = 'bold 14px sans-serif';
                ctx.fillStyle = '#C87941';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                
                chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
                  const value = data.datasets[0].data[index];
                  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
                  ctx.fillText(formatted, datapoint.x, datapoint.y - 12);
                });
                ctx.restore();
              }
            }]}
          />
        )}
      </div>
    </div>
  );
};

export default ReportsHub;
