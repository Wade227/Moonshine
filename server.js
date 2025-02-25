const http = require('http');
const express = require('express');
const path = require('path');
const { setupRoutes } = require('./routes');
const { setupDatabase } = require('./db');
const { setupProvider } = require('./provider');
const { startScanning } = require('./scanner');

async function startServer() {
  try {
    const db = await setupDatabase();
    const provider = setupProvider();
    const app = express();

    app.use(express.json());
    app.use(require('cors')());
    app.use(express.static(path.join(__dirname, 'public')));

    const routes = setupRoutes(db);
    app.use('/', routes);

    app.locals.db = db; // Make db available to routes

    // await startScanning(provider, db);

    const PORT = process.env.PORT || 3000;
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on('SIGINT', async () => {
      console.log('Shutting down gracefully...');
      provider.removeAllListeners();
      await db.close();
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

module.exports = { startServer };