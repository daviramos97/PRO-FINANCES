import express from 'express';
import cors from 'cors';
import { setupDb, openDb } from './db.js';

const app = express();
const PORT = 4006;

app.use(cors());
app.use(express.json());

// Iniciar banco de dados
setupDb().then(() => console.log('SQLite OK (Versão Definitiva)')).catch(console.error);

// ==========================================
// PROJEÇÃO DE CONTAS FIXAS NO MÊS
// ==========================================
async function projectFixedBillsForMonth(mesAno) {
  const db = await openDb();
  const [ano, mes] = mesAno.split('-'); // ex: '2026-07'
  
  // Pegar todas as contas fixas
  const fixas = await db.all('SELECT * FROM contas_fixas');
  
  for (const fixa of fixas) {
    if (fixa.tipo_valor === 'PARCELAMENTO') {
      if (!fixa.mes_inicio || !fixa.parcelas_totais) continue;
      
      const [startAno, startMes] = fixa.mes_inicio.split('-').map(Number);
      const [currAno, currMes] = mesAno.split('-').map(Number);
      
      const monthDiff = (currAno - startAno) * 12 + (currMes - startMes);
      const parcelaAtual = monthDiff + 1;
      
      if (parcelaAtual <= 0 || parcelaAtual > fixa.parcelas_totais) continue;
      
      const jaGerou = await db.get('SELECT id FROM despesas WHERE fixa_id = ? AND mes_referencia = ?', [fixa.id, mesAno]);
      if (!jaGerou) {
        const vencimentoStr = `${currAno}-${String(currMes).padStart(2, '0')}-${fixa.dia_vencimento.toString().padStart(2, '0')}`;
        await db.run(
          `INSERT OR IGNORE INTO despesas (nome, valor, vencimento, categoria, status, forma_pagamento, fixa_id, mes_referencia) VALUES (?, ?, ?, ?, 'pendente', 'Dinheiro', ?, ?)`,
          [`${fixa.nome} (Parcela ${parcelaAtual}/${fixa.parcelas_totais})`, fixa.valor_estimado, vencimentoStr, fixa.categoria || 'Outros', fixa.id, mesAno]
        );
      }
    } else {
      if (fixa.mes_inicio) {
        const [startAno, startMes] = fixa.mes_inicio.split('-').map(Number);
        const [currAno, currMes] = mesAno.split('-').map(Number);
        if ((currAno - startAno) * 12 + (currMes - startMes) < 0) continue;
      }
      
      const jaGerou = await db.get('SELECT id FROM despesas WHERE fixa_id = ? AND mes_referencia = ?', [fixa.id, mesAno]);
      if (!jaGerou) {
        const vencimentoStr = `${ano}-${mes}-${fixa.dia_vencimento.toString().padStart(2, '0')}`;
        await db.run(
          `INSERT OR IGNORE INTO despesas (nome, valor, vencimento, categoria, status, forma_pagamento, fixa_id, mes_referencia) VALUES (?, ?, ?, ?, 'pendente', 'Dinheiro', ?, ?)`,
          [`${fixa.nome} (${mes}/${ano})`, fixa.valor_estimado, vencimentoStr, fixa.categoria || 'Outros', fixa.id, mesAno]
        );
      }
    }
  }
}

// ==========================================
// FUNÇÕES DE FATURA DE CARTÃO
// ==========================================
function getInvoiceMonth(dataCompra, numParcela, diaFechamento, diaVencimento) {
  const [y, m, d] = dataCompra.split('-').map(Number);
  let baseM = m;
  let baseY = y;
  
  if (diaVencimento < diaFechamento) {
    if (d >= diaFechamento) {
      baseM += 2;
    } else {
      baseM += 1;
    }
  } else {
    if (d >= diaFechamento) {
      baseM += 1;
    } else {
      baseM += 0;
    }
  }
  
  baseM += numParcela;
  while (baseM > 12) { baseM -= 12; baseY += 1; }
  return `${baseY}-${String(baseM).padStart(2, '0')}`;
}

async function getFaturasForMonth(db, mesAno) {
  const faturas = [];
  const cards = await db.all("SELECT * FROM credit_cards");
  for (const card of cards) {
    const purchases = await db.all("SELECT * FROM card_purchases WHERE card_id = ?", [card.id]);
    let totalInvoice = 0;
    purchases.forEach(p => {
      const valorParcela = p.amount / p.installments;
      for (let i = 0; i < p.installments; i++) {
        if (getInvoiceMonth(p.purchase_date, i, card.closing_day, card.due_day) === mesAno) {
          totalInvoice += valorParcela;
        }
      }
    });
    if (totalInvoice > 0) {
      const invoiceRecord = await db.get("SELECT * FROM card_invoices WHERE card_id = ? AND month_year = ?", [card.id, mesAno]);
      const statusFatura = invoiceRecord?.status === 'paga' ? 'pago' : 'pendente';
      const dataPagamentoFatura = invoiceRecord?.payment_date || null;
      
      const vencimentoStr = `${mesAno}-${String(card.due_day).padStart(2, '0')}`;
      
      faturas.push({
        id: `fatura-${card.id}-${mesAno}`,
        nome: `Fatura ${card.name}`,
        valor: totalInvoice,
        vencimento: vencimentoStr,
        categoria: 'Cartão de Crédito',
        status: statusFatura,
        forma_pagamento: 'Cartão',
        data_pagamento: dataPagamentoFatura,
        is_fatura: true,
        card_id: card.id
      });
    }
  }
  return faturas;
}

// ==========================================
// ENDPOINT DE PROJEÇÃO DE ALÍVIO
// ==========================================
app.get('/api/relief/:mes_ano', async (req, res) => {
  try {
    const db = await openDb();
    const mesAno = req.params.mes_ano;
    const [currY, currM] = mesAno.split('-').map(Number);
    const result = [];
    
    const contasFixas = await db.all("SELECT * FROM contas_fixas");
    
    for (let i = 0; i < 6; i++) {
      let targetM = currM + i;
      let targetY = currY;
      if (targetM > 12) { targetM -= 12; targetY += 1; }
      
      const targetMesAno = `${targetY}-${String(targetM).padStart(2, '0')}`;
      let sumForMonth = 0;
      
      // 1. Soma as contas fixas
      contasFixas.forEach(f => {
        if (f.tipo_valor === 'FIXO' || f.tipo_valor === 'VARIAVEL') {
            sumForMonth += f.valor_estimado;
        } else if(f.tipo_valor === 'PARCELAMENTO' && f.mes_inicio && f.parcelas_totais) {
          const [sY, sM] = f.mes_inicio.split('-').map(Number);
          const diff = (targetY - sY)*12 + (targetM - sM);
          if(diff >= 0 && diff < f.parcelas_totais) {
            sumForMonth += f.valor_estimado;
          }
        }
      });
      
      // 2. Soma as faturas de cartão daquele mês projetado
      const faturas = await getFaturasForMonth(db, targetMesAno);
      faturas.forEach(f => {
          sumForMonth += f.valor;
      });
      
      result.push({ month: targetMesAno, total: sumForMonth });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

// ==========================================
// ENDPOINT DE AGREGAÇÃO (DASHBOARD)
// ==========================================
app.get('/api/dashboard/:mes_ano', async (req, res) => {
  try {
    const db = await openDb();
    const mesAno = req.params.mes_ano; // YYYY-MM
    
    // Antes de responder, garante a projeção de fixas pro mês
    await projectFixedBillsForMonth(mesAno);

    // 1. Comprometido (soma de contas a pagar no mes, status = pendente)
    const compRow = await db.get("SELECT SUM(valor) as total FROM despesas WHERE status = 'pendente' AND vencimento LIKE ?", [`${mesAno}%`]);
    let comprometido = compRow.total || 0;

    // Buscas no BD para os novos cálculos
    const despPagasRow = await db.get("SELECT SUM(valor) as total FROM despesas WHERE status = 'pago' AND vencimento LIKE ?", [`${mesAno}%`]);
    const todasDespesasRow = await db.get("SELECT SUM(valor) as total FROM despesas WHERE vencimento LIKE ?", [`${mesAno}%`]);
    
    // Injeta faturas no dashboard
    const faturas = await getFaturasForMonth(db, mesAno);
    let totalFaturas = 0;
    let faturasPagas = 0;
    let faturasPendentes = 0;
    
    faturas.forEach(f => {
      totalFaturas += f.valor;
      if (f.status === 'pago') faturasPagas += f.valor;
      else faturasPendentes += f.valor;
    });

    comprometido += faturasPendentes;
    
    const recRow = await db.get("SELECT SUM(valor) as total FROM receitas WHERE data LIKE ?", [`${mesAno}%`]);
    const recRecebidasRow = await db.get("SELECT SUM(valor) as total FROM receitas WHERE status = 'recebido' AND data LIKE ?", [`${mesAno}%`]);
    
    const uberRow = await db.get("SELECT SUM(lucro_liquido) as total FROM uber_logs WHERE mes_referencia = ?", [mesAno]);
    
    const goalRow = await db.get("SELECT * FROM monthly_goals WHERE mes_ano = ?", [mesAno]);
    let metaUber = goalRow?.meta_uber;
    if (metaUber === undefined) {
      const metaUberRow = await db.get("SELECT value FROM settings WHERE key = 'meta_mes_uber'");
      metaUber = parseFloat(metaUberRow?.value || 0);
    }

    const todasDespesas = (todasDespesasRow.total || 0) + totalFaturas;
    const despesasPagas = (despPagasRow.total || 0) + faturasPagas;
    const receitasRecebidas = (recRecebidasRow.total || 0) + (uberRow.total || 0);

    // 2. Novo card central: Ponto de Equilíbrio (Break-even)
    const breakEven = Math.max(0, todasDespesas - receitasRecebidas);

    // 3. Novo card da direita: Projeção de Sobras
    // Lê a meta histórica do mês ou cai para a meta global padrão
    let metaPessoal = goalRow?.meta_pessoal;
    if (metaPessoal === undefined) {
      const metaPessoalRow = await db.get("SELECT value FROM settings WHERE key = 'meta_faturamento_pessoal'");
      metaPessoal = parseFloat(metaPessoalRow?.value || 0);
    }
    
    // Projeta as receitas como sendo a Meta Global (ou o total já recebido, se ele já bateu a meta)
    const projecaoReceitas = Math.max(receitasRecebidas, metaPessoal);
    const projecaoSobras = projecaoReceitas - todasDespesas;

    // 4. Busca o maior KM registrado para controle de troca de óleo
    const maxKmRow = await db.get("SELECT MAX(km_final) as max_km FROM uber_logs");
    const max_km = maxKmRow?.max_km || 0;

    // 5. Histórico de 6 meses para o gráfico
    const history = [];
    const [cy, cm] = mesAno.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
        let m = cm - i;
        let y = cy;
        if (m <= 0) {
            m += 12;
            y -= 1;
        }
        const targetMes = `${y}-${String(m).padStart(2, '0')}`;
        
        const hDesp = await db.get("SELECT SUM(valor) as total FROM despesas WHERE vencimento LIKE ?", [`${targetMes}%`]);
        const hRec = await db.get("SELECT SUM(valor) as total FROM receitas WHERE data LIKE ?", [`${targetMes}%`]);
        const hUber = await db.get("SELECT SUM(lucro_liquido) as total FROM uber_logs WHERE mes_referencia = ?", [targetMes]);
        
        history.push({
            month: `${String(m).padStart(2, '0')}/${y}`,
            entradas: (hRec?.total || 0) + (hUber?.total || 0),
            saidas: hDesp?.total || 0
        });
    }

    res.json({
      comprometido,
      breakEven,
      projecaoSobras,
      max_km,
      receitasRecebidas,
      despesasPagas,
      history
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no dashboard' });
  }
});

// ==========================================
// DESPESAS E CONTAS A PAGAR
// ==========================================
app.get('/api/despesas/:mes_ano', async (req, res) => {
  try {
    const db = await openDb();
    const mesAno = req.params.mes_ano;
    await projectFixedBillsForMonth(mesAno);
    const despesas = await db.all("SELECT * FROM despesas WHERE vencimento LIKE ? ORDER BY status DESC, vencimento ASC", [`${mesAno}%`]);
    
    const faturas = await getFaturasForMonth(db, mesAno);
    const todas = [...despesas, ...faturas].sort((a, b) => {
      if (a.status === 'pendente' && b.status === 'pago') return -1;
      if (a.status === 'pago' && b.status === 'pendente') return 1;
      if (a.status === 'pago' && b.status === 'pago') {
        return new Date(b.data_pagamento) - new Date(a.data_pagamento);
      }
      return new Date(a.vencimento) - new Date(b.vencimento);
    });

    res.json(todas);
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.get('/api/pending_all', async (req, res) => {
  try {
    const db = await openDb();
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Pega TODAS as despesas pendentes no BD até hoje, independente do mês
    const despesas = await db.all("SELECT * FROM despesas WHERE status = 'pendente' AND vencimento <= ? ORDER BY vencimento ASC", [todayStr]);
    
    // Pega faturas pendentes. Como faturas são dinâmicas, vamos gerar para o mês atual e anterior
    const today = new Date();
    const currMesAno = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let prevM = today.getMonth();
    let prevY = today.getFullYear();
    if (prevM === 0) { prevM = 12; prevY -= 1; }
    const prevMesAno = `${prevY}-${String(prevM).padStart(2, '0')}`;
    
    const faturasCurr = await getFaturasForMonth(db, currMesAno);
    const faturasPrev = await getFaturasForMonth(db, prevMesAno);
    
    const todasFaturas = [...faturasPrev, ...faturasCurr].filter(f => f.status === 'pendente' && f.vencimento <= todayStr);
    
    res.json([...despesas, ...todasFaturas]);
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.post('/api/despesas', async (req, res) => {
  try {
    const { nome, valor, vencimento, categoria, status = 'pendente', forma_pagamento } = req.body;
    const db = await openDb();
    await db.run(
      'INSERT INTO despesas (nome, valor, vencimento, categoria, status, forma_pagamento) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, valor, vencimento, categoria, status, forma_pagamento]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.put('/api/despesas/:id', async (req, res) => {
  try {
    const { status, valor, data_pagamento, nome, vencimento, categoria, forma_pagamento } = req.body;
    const db = await openDb();

    // Verifica se é uma Fatura injetada (começa com fatura-)
    if (String(req.params.id).startsWith('fatura-')) {
      const parts = req.params.id.split('-');
      const cardId = parts[1];
      const mesAno = `${parts[2]}-${parts[3]}`;
      const invStatus = status === 'pago' ? 'paga' : 'aberta';
      
      const existing = await db.get("SELECT id FROM card_invoices WHERE card_id = ? AND month_year = ?", [cardId, mesAno]);
      if (existing) {
        await db.run("UPDATE card_invoices SET status=?, paid_amount=?, payment_date=? WHERE id=?", [invStatus, valor, data_pagamento, existing.id]);
      } else {
        await db.run("INSERT INTO card_invoices (card_id, month_year, status, paid_amount, payment_date) VALUES (?, ?, ?, ?, ?)", [cardId, mesAno, invStatus, valor, data_pagamento]);
      }
      return res.json({ success: true });
    }

    // Check if we are doing a full edit or just a status change
    if (nome !== undefined && vencimento !== undefined) {
      await db.run(
        'UPDATE despesas SET nome = ?, valor = ?, vencimento = ?, categoria = ?, forma_pagamento = ? WHERE id = ?',
        [nome, valor, vencimento, categoria, forma_pagamento, req.params.id]
      );
    } else {
      await db.run(
        'UPDATE despesas SET status = ?, valor = ?, data_pagamento = ? WHERE id = ?',
        [status, valor, data_pagamento, req.params.id]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
});

app.delete('/api/despesas/:id', async (req, res) => {
  try {
    const db = await openDb();
    await db.run('DELETE FROM despesas WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

// ==========================================
// RECEITAS E UBER
// ==========================================
app.get('/api/receitas/:mes_ano', async (req, res) => {
  try {
    const db = await openDb();
    const mesAno = req.params.mes_ano;
    const receitasManuais = await db.all("SELECT * FROM receitas WHERE data LIKE ? ORDER BY data DESC", [`${mesAno}%`]);
    
    // Obter o total do Uber pro mes
    const uberRow = await db.get("SELECT SUM(lucro_liquido) as total FROM uber_logs WHERE mes_referencia = ?", [mesAno]);
    const uberTotal = uberRow.total || 0;

    res.json({
      receitas: receitasManuais,
      uber_total: uberTotal
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.post('/api/receitas', async (req, res) => {
  try {
    const { nome, valor, data, status = 'recebido', responsavel = 'Davi' } = req.body;
    const db = await openDb();
    await db.run('INSERT INTO receitas (nome, valor, data, status, responsavel) VALUES (?, ?, ?, ?, ?)', [nome, valor, data, status, responsavel]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.put('/api/receitas/:id', async (req, res) => {
  try {
    const { nome, valor, data, responsavel = 'Davi' } = req.body;
    const db = await openDb();
    await db.run('UPDATE receitas SET nome = ?, valor = ?, data = ?, responsavel = ? WHERE id = ?', [nome, valor, data, responsavel, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.delete('/api/receitas/:id', async (req, res) => {
  try {
    const db = await openDb();
    await db.run('DELETE FROM receitas WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

// Uber Logs CRUD
app.get('/api/uber_logs', async (req, res) => {
  try {
    const { mes_ano, start, end } = req.query;
    const db = await openDb();
    let logs = [];
    
    if (start && end) {
      logs = await db.all("SELECT * FROM uber_logs WHERE data >= ? AND data <= ? ORDER BY data DESC", [start, end]);
    } else if (mes_ano) {
      logs = await db.all("SELECT * FROM uber_logs WHERE mes_referencia = ? ORDER BY data DESC", [mes_ano]);
    } else {
      logs = await db.all("SELECT * FROM uber_logs ORDER BY data DESC");
    }
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.post('/api/uber_logs', async (req, res) => {
  try {
    const { data, aplicativo, corridas, km, km_inicial, km_final, tempo_online, valor_bruto, combustivel, manutencao, bonus, gorjeta, mes_referencia } = req.body;
    // Cálculo do Lucro Líquido no Backend
    const bruto = parseFloat(valor_bruto) || 0;
    const bns = parseFloat(bonus) || 0;
    const grj = parseFloat(gorjeta) || 0;
    const comb = parseFloat(combustivel) || 0;
    const manu = parseFloat(manutencao) || 0;
    
    const kmIni = parseFloat(km_inicial) || 0;
    const kmFin = parseFloat(km_final) || 0;
    const finalKmCalculated = (km !== undefined && km !== '') ? parseFloat(km) : (kmFin >= kmIni && kmFin > 0 ? kmFin - kmIni : 0);
    
    const lucro_liquido = (bruto + bns + grj) - (comb + manu);

    const db = await openDb();
    await db.run(
      'INSERT INTO uber_logs (data, aplicativo, corridas, km, km_inicial, km_final, tempo_online, valor_bruto, combustivel, manutencao, bonus, gorjeta, lucro_liquido, mes_referencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data, aplicativo, corridas, finalKmCalculated, kmIni, kmFin, tempo_online, bruto, comb, manu, bns, grj, lucro_liquido, mes_referencia || null]
    );
    res.json({ success: true, lucro_liquido });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.put('/api/uber_logs/:id', async (req, res) => {
  try {
    const { data, aplicativo, corridas, km, km_inicial, km_final, tempo_online, valor_bruto, combustivel, manutencao, bonus, gorjeta, mes_referencia } = req.body;
    
    const bruto = parseFloat(valor_bruto) || 0;
    const bns = parseFloat(bonus) || 0;
    const grj = parseFloat(gorjeta) || 0;
    const comb = parseFloat(combustivel) || 0;
    const manu = parseFloat(manutencao) || 0;

    const kmIni = parseFloat(km_inicial) || 0;
    const kmFin = parseFloat(km_final) || 0;
    const finalKmCalculated = (km !== undefined && km !== '') ? parseFloat(km) : (kmFin >= kmIni && kmFin > 0 ? kmFin - kmIni : 0);
    
    const lucro_liquido = (bruto + bns + grj) - (comb + manu);

    const db = await openDb();
    await db.run(
      'UPDATE uber_logs SET data = ?, aplicativo = ?, corridas = ?, km = ?, km_inicial = ?, km_final = ?, tempo_online = ?, valor_bruto = ?, combustivel = ?, manutencao = ?, bonus = ?, gorjeta = ?, lucro_liquido = ?, mes_referencia = ? WHERE id = ?',
      [data, aplicativo, corridas, finalKmCalculated, kmIni, kmFin, tempo_online, bruto, comb, manu, bns, grj, lucro_liquido, mes_referencia || null, req.params.id]
    );
    res.json({ success: true, lucro_liquido });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar jornada' });
  }
});

app.delete('/api/uber_logs/:id', async (req, res) => {
  try {
    const db = await openDb();
    await db.run('DELETE FROM uber_logs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir jornada' });
  }
});

// ==========================================
// CONTAS FIXAS
// ==========================================
app.get('/api/contas_fixas', async (req, res) => {
  try {
    const db = await openDb();
    const fixas = await db.all("SELECT * FROM contas_fixas ORDER BY dia_vencimento ASC");
    res.json(fixas);
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.post('/api/contas_fixas', async (req, res) => {
  try {
    const { nome, valor_estimado, dia_vencimento, tipo_valor = 'FIXO', parcelas_totais = null, mes_inicio = null, categoria = 'Outros', valor_entrada = 0 } = req.body;
    const db = await openDb();
    const result = await db.run(
      'INSERT INTO contas_fixas (nome, valor_estimado, dia_vencimento, tipo_valor, parcelas_totais, mes_inicio, categoria) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome, valor_estimado, dia_vencimento, tipo_valor, parcelas_totais, mes_inicio, categoria]
    );
    const fixaId = result.lastID;

    if (Number(valor_entrada) > 0) {
      const date = new Date();
      const vencimento = date.toISOString().split('T')[0];
      const mesReferencia = vencimento.substring(0, 7);

      await db.run(
        'INSERT INTO despesas (nome, valor, vencimento, categoria, status, forma_pagamento, fixa_id, mes_referencia, data_pagamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`${nome} (Entrada)`, Number(valor_entrada), vencimento, categoria, 'pago', 'Dinheiro', fixaId, mesReferencia, vencimento]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.put('/api/contas_fixas/:id', async (req, res) => {
  try {
    const { nome, valor_estimado, dia_vencimento, tipo_valor, parcelas_totais = null, mes_inicio = null, categoria = 'Outros' } = req.body;
    const db = await openDb();
    await db.run(
      'UPDATE contas_fixas SET nome = ?, valor_estimado = ?, dia_vencimento = ?, tipo_valor = ?, parcelas_totais = ?, mes_inicio = ?, categoria = ? WHERE id = ?',
      [nome, valor_estimado, dia_vencimento, tipo_valor, parcelas_totais, mes_inicio, categoria, req.params.id]
    );
    
    // Atualiza também as despesas vinculadas a essa conta fixa que ainda estão pendentes
    await db.run(
      "UPDATE despesas SET categoria = ?, valor = ? WHERE fixa_id = ? AND status = 'pendente'",
      [categoria, valor_estimado, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.delete('/api/contas_fixas/:id', async (req, res) => {
  try {
    const db = await openDb();
    await db.run("DELETE FROM despesas WHERE fixa_id = ? AND status = 'pendente'", [req.params.id]);
    await db.run('DELETE FROM contas_fixas WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

// ==========================================
// CARTÕES DE CRÉDITO
// ==========================================

// Removido getInvoiceMonth redundante

app.get('/api/cards', async (req, res) => {
  try {
    const db = await openDb();
    const cards = await db.all("SELECT * FROM credit_cards");
    
    // Calcular limite utilizado para cada cartão
    for (let card of cards) {
      const purchases = await db.all("SELECT * FROM card_purchases WHERE card_id = ?", [card.id]);
      const invoices = await db.all("SELECT month_year, status FROM card_invoices WHERE card_id = ?", [card.id]);
      const paidInvoices = new Set(invoices.filter(i => i.status === 'paga').map(i => i.month_year));
      
      let usedLimit = 0;
      purchases.forEach(p => {
        const valorParcela = p.amount / p.installments;
        for (let i = 0; i < p.installments; i++) {
          const invMonth = getInvoiceMonth(p.purchase_date, i, card.closing_day, card.due_day);
          if (!paidInvoices.has(invMonth)) {
            usedLimit += valorParcela;
          }
        }
      });
      card.used_limit = usedLimit;
    }
    
    res.json(cards);
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.post('/api/cards', async (req, res) => {
  try {
    const db = await openDb();
    const { name, limit_amount, closing_day, due_day, color } = req.body;
    await db.run(
      "INSERT INTO credit_cards (name, limit_amount, closing_day, due_day, color) VALUES (?, ?, ?, ?, ?)",
      [name, limit_amount, closing_day, due_day, color || '#C87941']
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.put('/api/cards/:id', async (req, res) => {
  try {
    const db = await openDb();
    const { name, limit_amount, closing_day, due_day, color } = req.body;
    await db.run(
      "UPDATE credit_cards SET name=?, limit_amount=?, closing_day=?, due_day=?, color=? WHERE id=?",
      [name, limit_amount, closing_day, due_day, color, req.params.id]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    const db = await openDb();
    await db.run("DELETE FROM credit_cards WHERE id=?", [req.params.id]);
    await db.run("DELETE FROM card_purchases WHERE card_id=?", [req.params.id]);
    await db.run("DELETE FROM card_invoices WHERE card_id=?", [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.get('/api/cards/:id/invoice/:mes_ano', async (req, res) => {
  try {
    const db = await openDb();
    const cardId = req.params.id;
    const mesAno = req.params.mes_ano;
    
    const card = await db.get("SELECT * FROM credit_cards WHERE id = ?", [cardId]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const purchases = await db.all("SELECT * FROM card_purchases WHERE card_id = ?", [cardId]);
    
    let totalInvoice = 0;
    const invoiceItems = [];

    purchases.forEach(p => {
      const valorParcela = p.amount / p.installments;
      for (let i = 0; i < p.installments; i++) {
        const invMonth = getInvoiceMonth(p.purchase_date, i, card.closing_day, card.due_day);
        if (invMonth === mesAno) {
          totalInvoice += valorParcela;
          invoiceItems.push({
            id: p.id,
            description: p.description,
            purchase_date: p.purchase_date,
            installment_amount: valorParcela,
            current_installment: i + 1,
            total_installments: p.installments
          });
        }
      }
    });
    const invoiceRecord = await db.get("SELECT * FROM card_invoices WHERE card_id = ? AND month_year = ?", [card.id, mesAno]);
    const statusFatura = invoiceRecord?.status === 'paga' ? 'pago' : 'pendente';
    const dataPagamentoFatura = invoiceRecord?.payment_date || null;

    res.json({
      card,
      total: totalInvoice,
      status: statusFatura,
      payment_date: dataPagamentoFatura,
      items: invoiceItems
    });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.get('/api/cards/total_next_month/:mes_ano', async (req, res) => {
  try {
    const db = await openDb();
    const mesAno = req.params.mes_ano;
    const [y, m] = mesAno.split('-').map(Number);
    let targetM = m + 1;
    let targetY = y;
    if (targetM > 12) { targetM -= 12; targetY += 1; }
    const targetMesAno = `${targetY}-${String(targetM).padStart(2, '0')}`;
    
    const cards = await db.all("SELECT * FROM credit_cards");
    let totalAllCards = 0;
    
    for (let card of cards) {
      const purchases = await db.all("SELECT * FROM card_purchases WHERE card_id = ?", [card.id]);
      purchases.forEach(p => {
        const valorParcela = p.amount / p.installments;
        for (let j = 0; j < p.installments; j++) {
          if (getInvoiceMonth(p.purchase_date, j, card.closing_day, card.due_day) === targetMesAno) {
            totalAllCards += valorParcela;
          }
        }
      });
    }
    
    res.json({ target_month: targetMesAno, total: totalAllCards });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.get('/api/cards/:id/projection/:mes_ano', async (req, res) => {
  try {
    const db = await openDb();
    const cardId = req.params.id;
    const mesAno = req.params.mes_ano;
    const [currY, currM] = mesAno.split('-').map(Number);
    const result = [];
    
    const card = await db.get("SELECT * FROM credit_cards WHERE id = ?", [cardId]);
    if (!card) return res.status(404).json({ error: 'Not found' });
    
    const purchases = await db.all("SELECT * FROM card_purchases WHERE card_id = ?", [cardId]);
    
    for (let i = 0; i < 6; i++) {
      let targetM = currM + i;
      let targetY = currY;
      if (targetM > 12) { targetM -= 12; targetY += 1; }
      const targetMesAno = `${targetY}-${String(targetM).padStart(2, '0')}`;
      
      let totalInvoice = 0;
      purchases.forEach(p => {
        const valorParcela = p.amount / p.installments;
        for (let j = 0; j < p.installments; j++) {
          if (getInvoiceMonth(p.purchase_date, j, card.closing_day, card.due_day) === targetMesAno) {
            totalInvoice += valorParcela;
          }
        }
      });
      result.push({ month: targetMesAno, total: totalInvoice });
    }
    res.json(result);
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.post('/api/cards/:id/purchases', async (req, res) => {
  try {
    const cardId = req.params.id;
    const { description, amount, purchase_date, installments } = req.body;
    const db = await openDb();
    await db.run(
      'INSERT INTO card_purchases (card_id, description, amount, purchase_date, installments) VALUES (?, ?, ?, ?, ?)',
      [cardId, description, amount, purchase_date, installments]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.put('/api/cards/purchases/:id', async (req, res) => {
  try {
    const { description, amount, purchase_date, installments } = req.body;
    const db = await openDb();
    await db.run(
      'UPDATE card_purchases SET description = ?, amount = ?, purchase_date = ?, installments = ? WHERE id = ?',
      [description, amount, purchase_date, installments, req.params.id]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.delete('/api/cards/purchases/:id', async (req, res) => {
  try {
    const db = await openDb();
    await db.run('DELETE FROM card_purchases WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro ao excluir compra' }); }
});

// ==========================================
// DÍVIDAS E CONFIGURAÇÕES
// ==========================================
app.get('/api/debts', async (req, res) => {
  try {
    const db = await openDb();
    const debts = await db.all("SELECT * FROM debts ORDER BY status DESC, due_date ASC");
    res.json(debts);
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.post('/api/debts', async (req, res) => {
  try {
    const { name, total_amount, due_date } = req.body;
    const db = await openDb();
    await db.run('INSERT INTO debts (name, total_amount, due_date) VALUES (?, ?, ?)', [name, total_amount, due_date]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.put('/api/debts/:id/pay', async (req, res) => {
  try {
    const { amount } = req.body;
    const db = await openDb();
    const debt = await db.get("SELECT * FROM debts WHERE id = ?", [req.params.id]);
    const newPaid = debt.paid_amount + parseFloat(amount);
    const status = newPaid >= debt.total_amount ? 'paid' : 'open';
    await db.run('UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?', [newPaid, status, req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.get('/api/settings', async (req, res) => {
  try {
    const db = await openDb();
    const rows = await db.all('SELECT * FROM settings');
    const settings = {}; rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    const db = await openDb();
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro' }); }
});

// ==========================================
// METAS MENSAIS (HISTÓRICO)
// ==========================================
app.get('/api/monthly_goals/:mes_ano', async (req, res) => {
  try {
    const db = await openDb();
    const goal = await db.get('SELECT * FROM monthly_goals WHERE mes_ano = ?', [req.params.mes_ano]);
    res.json(goal || {});
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.post('/api/monthly_goals/:mes_ano', async (req, res) => {
  try {
    const { meta_pessoal, meta_uber } = req.body;
    const db = await openDb();
    await db.run(
      'INSERT INTO monthly_goals (mes_ano, meta_pessoal, meta_uber) VALUES (?, ?, ?) ON CONFLICT(mes_ano) DO UPDATE SET meta_pessoal = excluded.meta_pessoal, meta_uber = excluded.meta_uber',
      [req.params.mes_ano, meta_pessoal, meta_uber]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
