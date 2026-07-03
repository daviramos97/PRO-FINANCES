const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
});

db.serialize(() => {
  db.all('SELECT * FROM contas_fixas', (err, rows) => {
    if (err) {
      console.error("Error on contas_fixas:", err);
    } else {
      console.log("CONTAS FIXAS:", rows);
    }
  });

  db.all('SELECT * FROM despesas', (err, rows) => {
    if (err) {
      console.error("Error on despesas:", err);
    } else {
      console.log("DESPESAS (todas):", rows.length);
    }
  });
});

db.close();
