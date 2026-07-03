const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function clean() {
  const db = await open({
    filename: path.resolve(__dirname, '../../database.sqlite'),
    driver: sqlite3.Database
  });

  await db.run("DELETE FROM despesas WHERE fixa_id IS NOT NULL AND fixa_id NOT IN (SELECT id FROM contas_fixas) AND status = 'pendente'");
  console.log('Cleaned orphans!');
}

clean().catch(console.error);
