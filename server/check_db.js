import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

(async () => {
  const db = await open({
    filename: '../database.sqlite',
    driver: sqlite3.Database
  });
  const despesas = await db.all("SELECT * FROM despesas ORDER BY id DESC LIMIT 5");
  console.log(despesas);
})();
