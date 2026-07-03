const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function clean() {
  const db = await open({
    filename: path.resolve(__dirname, '../../database.sqlite'),
    driver: sqlite3.Database
  });

  // Apagar as duplicatas, mantendo apenas o menor id para cada (fixa_id, mes_referencia)
  await db.run(`
    DELETE FROM despesas 
    WHERE id NOT IN (
      SELECT MIN(id) 
      FROM despesas 
      WHERE fixa_id IS NOT NULL 
      GROUP BY fixa_id, mes_referencia
    ) 
    AND fixa_id IS NOT NULL
  `);
  console.log('Duplicatas limpas!');

  // Criar indice unico para prevenir futuras duplicatas
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_despesas_fixa_mes ON despesas(fixa_id, mes_referencia)`);
  console.log('Índice único criado!');
}

clean().catch(console.error);
