import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = 'G:\\Meu Drive\\FINANÇAS PRO DATABASE\\database.sqlite';

let dbInstance = null;

export async function openDb() {
  if (dbInstance) return dbInstance;
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  return dbInstance;
}

export async function setupDb() {
  const db = await openDb();

  // 1. Receitas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS receitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'recebido'
    )
  `);

  // 2. Despesas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS despesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      vencimento TEXT NOT NULL,
      categoria TEXT NOT NULL,
      status TEXT DEFAULT 'pendente', 
      forma_pagamento TEXT DEFAULT 'Dinheiro',
      fixa_id INTEGER DEFAULT NULL,
      mes_referencia TEXT DEFAULT NULL
    )
  `);

  // 3. Contas Fixas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contas_fixas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor_estimado REAL NOT NULL,
      dia_vencimento INTEGER NOT NULL,
      tipo_valor TEXT DEFAULT 'FIXO', -- 'FIXO' ou 'VARIAVEL'
      categoria TEXT DEFAULT 'Outros'
    )
  `);

  // 4. Uber Logs
  await db.exec(`
    CREATE TABLE IF NOT EXISTS uber_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      aplicativo TEXT NOT NULL,
      corridas INTEGER NOT NULL,
      km REAL NOT NULL,
      tempo_online TEXT NOT NULL,
      valor_bruto REAL NOT NULL,
      combustivel REAL NOT NULL,
      manutencao REAL NOT NULL,
      bonus REAL NOT NULL,
      gorjeta REAL NOT NULL,
      lucro_liquido REAL NOT NULL
    )
  `);

  // 5. Cartões de Crédito
  await db.exec(`
    CREATE TABLE IF NOT EXISTS credit_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      closing_day INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      color TEXT DEFAULT '#C87941'
    )
  `);

  // 6. Dívidas (Empréstimos/Financiamentos)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open'
    )
  `);

  // 7. Configurações
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Configurações padrão se não existirem
  await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('meta_faturamento_pessoal', '5000')");
  await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('meta_mes_uber', '2500')");
  await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('meta_hora_uber', '35')");
  await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('meta_km_uber', '2')");
  await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('responsaveis', 'Davi, Larissa')");

  // Migrations seguras
  try { await db.exec("ALTER TABLE receitas ADD COLUMN responsavel TEXT DEFAULT 'Davi'"); } catch(e) { /* ignore if exists */ }
  try { await db.exec("ALTER TABLE contas_fixas ADD COLUMN parcelas_totais INTEGER DEFAULT NULL"); } catch(e) { /* ignore if exists */ }
  try { await db.exec("ALTER TABLE contas_fixas ADD COLUMN mes_inicio TEXT DEFAULT NULL"); } catch(e) { /* ignore if exists */ }
  try { await db.exec("ALTER TABLE contas_fixas ADD COLUMN categoria TEXT DEFAULT 'Outros'"); } catch(e) { /* ignore if exists */ }
  try { await db.exec("ALTER TABLE despesas ADD COLUMN data_pagamento TEXT DEFAULT NULL"); } catch(e) { /* ignore if exists */ }
}
