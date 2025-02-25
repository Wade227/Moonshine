const express = require('express');
const router = express.Router();

function setupRoutes(db) {
  router.get('/api/trending', async (req, res) => {
    try {
      const limit = req.query.limit || 10;

      const trendingTokens = await db.all(`
        SELECT t.*, tr.*
        FROM tokens t
        JOIN trends tr ON t.address = tr.tokenAddress
        ORDER BY tr.trendScore DESC
        LIMIT ?
      `, [limit]);

      res.json(trendingTokens);
    } catch (error) {
      console.error('Error fetching trending tokens:', error);
      res.status(500).json({ error: 'Failed to fetch trending tokens' });
    }
  });

  router.get('/api/token/:address', async (req, res) => {
    try {
      const { address } = req.params;

      const token = await db.get('SELECT * FROM tokens WHERE address = ?', [address]);
      if (!token) {
        return res.status(404).json({ error: 'Token not found' });
      }

      const trends = await db.get('SELECT * FROM trends WHERE tokenAddress = ?', [address]);
      const holders = await db.all('SELECT COUNT(*) as count FROM holders WHERE tokenAddress = ? AND balance > 0', [address]);
      const recentTransfers = await db.all(
        'SELECT * FROM transfers WHERE tokenAddress = ? ORDER BY timestamp DESC LIMIT 50',
        [address]
      );

      res.json({
        token,
        trends,
        holders: holders[0].count,
        recentTransfers
      });
    } catch (error) {
      console.error('Error fetching token details:', error);
      res.status(500).json({ error: 'Failed to fetch token details' });
    }
  });

  router.get('/api/recent-transactions', async (req, res) => {
    try {
      const recentTransactions = await db.all(`
        SELECT * FROM transfers ORDER BY timestamp DESC LIMIT 50
      `);
      res.json(recentTransactions);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
  });

  return router;
}

module.exports = { setupRoutes };