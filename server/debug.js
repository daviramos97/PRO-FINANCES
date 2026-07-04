import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

(async () => {
  const db = await open({
    filename: 'G:/Meu Drive/FINANÇAS PRO DATABASE/database.sqlite',
    driver: sqlite3.Database
  });
  
  const rec = await db.get("SELECT SUM(valor) as t FROM receitas WHERE data LIKE '2026-07%'");
  const uber = await db.get("SELECT SUM(lucro_liquido) as t FROM uber_logs WHERE data LIKE '2026-07%'");
  const metaUber = await db.get("SELECT value FROM settings WHERE key='meta_mes_uber'");
  const metaPessoal = await db.get("SELECT value FROM settings WHERE key='meta_faturamento_pessoal'");
  
  console.log('Receitas Totais Lançadas:', rec.t);
  console.log('Uber Lançado:', uber.t);
  console.log('Meta Uber:', metaUber?.value);
  console.log('Meta Pessoal Geral:', metaPessoal?.value);
})();
