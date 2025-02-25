const { ethers } = require('ethers');
require('dotenv').config();

function setupProvider() {
  // Use a WebSocket provider for real-time events
  // Replace with your own Infura/Alchemy key or use a local node
    const providerUrl = process.env.PROVIDER_URL;

    if (!providerUrl) {
        throw new Error("PROVIDER_URL environment variable not set.");
    }

  return new ethers.providers.WebSocketProvider(providerUrl);
}

module.exports = { setupProvider };