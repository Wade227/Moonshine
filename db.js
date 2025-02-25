const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function setupDatabase() {
  const db = await open({
    filename: './tokentracker.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      address TEXT PRIMARY KEY,
      name TEXT,
      symbol TEXT,
      totalSupply TEXT,
      firstSeen INTEGER,
      lastUpdated INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tokenAddress TEXT,
      transferFrom TEXT,
      transferTo TEXT,
      amount TEXT,
      timestamp INTEGER,
      blockNumber INTEGER,
      txHash TEXT,
      FOREIGN KEY (tokenAddress) REFERENCES tokens(address)
    );
    
    CREATE TABLE IF NOT EXISTS holders (
      address TEXT,
      tokenAddress TEXT,
      balance TEXT,
      lastUpdated INTEGER,
      PRIMARY KEY (address, tokenAddress),
      FOREIGN KEY (tokenAddress) REFERENCES tokens(address)
    );
    
    CREATE TABLE IF NOT EXISTS trends (
      tokenAddress TEXT PRIMARY KEY,
      velocity REAL,
      uniqueHolders INTEGER,
      largeTransactions INTEGER,
      growthRate REAL,
      whaleConcentration REAL,
      trendScore REAL,
      lastCalculated INTEGER,
      FOREIGN KEY (tokenAddress) REFERENCES tokens(address)
    );
  `);
  return db;
}

module.exports = { setupDatabase };