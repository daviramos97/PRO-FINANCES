const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../database.sqlite');

function parseCurrency(str) {
  if (!str) return 0;
  return parseFloat(str.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0;
}

function parseKm(str) {
  if (!str) return 0;
  return parseFloat(str.replace(' Km', '').replace(',', '.')) || 0;
}

function parseDate(str) {
  if (!str) return '2025-01-01';
  const parts = str.split('/');
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

const csv = fs.readFileSync('CONTROLE UBER.csv', 'utf-8');
const lines = csv.split('\n').filter(l => l.trim() !== '');

db.serialize(() => {
  db.run("DELETE FROM uber_logs", function(err) {
    if (err) return console.error(err);
    
    const stmt = db.prepare(`INSERT INTO uber_logs 
      (data, aplicativo, corridas, km, tempo_online, valor_bruto, combustivel, manutencao, bonus, gorjeta, lucro_liquido) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    // Skip header line (i=1)
    let inserted = 0;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(';');
      if (parts.length < 18) continue;

      const data = parseDate(parts[0]);
      const aplicativo = parts[5];
      const corridas = parseInt(parts[6]) || 0;
      const km = parseKm(parts[7]);
      const tempo_online = parts[8] || '00:00:00';
      const valor_bruto = parseCurrency(parts[9]);
      const combustivel = parseCurrency(parts[12]);
      const manutencao = parseCurrency(parts[14]);
      const bonus = parseCurrency(parts[15]);
      const gorjeta = parseCurrency(parts[16]);
      const lucro_liquido = parseCurrency(parts[17]);

      stmt.run(data, aplicativo, corridas, km, tempo_online, valor_bruto, combustivel, manutencao, bonus, gorjeta, lucro_liquido);
      inserted++;
    }

    stmt.finalize();
    console.log(`Inserted ${inserted} rows successfully!`);
  });
});
