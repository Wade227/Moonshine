# Ethereum ERC-20 Token Tracker

A real-time dashboard for monitoring ERC-20 token activity on the Ethereum network. This application scans the blockchain for token transfer events, tracks holder data, and identifies trending tokens based on various metrics.

## Features

- **Real-time Token Scanning**: Monitors the Ethereum network for all ERC-20 transfer events
- **Trend Analysis**: Identifies trending tokens based on velocity, holder growth, and transaction patterns
- **Intelligent Metrics**:
  - Token Velocity (movement of tokens relative to supply)
  - Holder Distribution and Concentration
  - Transaction Size Distribution
  - Network Growth Rate (new holder acquisition)
  - Whale Activity Monitoring
- **Interactive Dashboard**: Visualizes key metrics with charts and tables
- **Token Details**: Provides deep insights into individual token activity and metrics
- **Local Hosting**: Self-contained application that can be run locally

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/eth-token-tracker.git
   cd eth-token-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your Ethereum provider:
   Open `app.js` and replace `YOUR_INFURA_KEY` with your Infura project ID or set up another provider.

4. Build the frontend:
   ```bash
   npm run build
   ```

5. Start the application:
   ```bash
   npm start
   ```

6. Access the dashboard:
   Open your browser and navigate to `http://localhost:3000`

## Architecture

The application consists of:

1. **Backend (`app.js`)**:
   - Express server for API endpoints
   - Ethers.js for interacting with Ethereum
   - SQLite database for storing token and transaction data
   - Real-time event listeners for token transfers

2. **Frontend (React)**:
   - Dashboard with trending tokens
   - Token metrics visualizations using Chart.js
   - Recent activity monitor
   - Detailed token analysis page

3. **Database Schema**:
   - Tokens table: Basic token information
   - Transfers table: All token transfer events
   - Holders table: Current token balances for addresses
   - Trends table: Calculated metrics for trend analysis

## Usage

### Finding Trending Tokens

The dashboard automatically displays tokens ranked by a custom trend score that combines:
- Token velocity (high transfer rate relative to supply)
- Holder growth (new addresses acquiring the token)
- Large transaction activity (significant purchases)
- Holder distribution (lower whale concentration is better)

### Trading Strategies

The application supports several trading strategies:

1. **Early Trend Detection**:
   - Tokens with rapidly increasing velocity and network growth
   - New tokens gaining holders quickly with balanced distribution

2. **Whale Tracking**:
   - Monitor large transactions to identify tokens with institutional interest
   - Alert system for significant holder changes

3. **Distribution Analysis**:
   - Identify tokens transitioning from concentrated to distributed ownership
   - Spot tokens with healthy, growing communities

## Extending the MVP

To expand the application beyond the MVP:

1. **Add Price Data Integration**:
   - Connect to DEX APIs to get real-time price information
   - Track price correlation with on-chain metrics

2. **Implement Alerts and Notifications**:
   - Set up customizable alerts for specific metric thresholds
   - Email or push notifications for trending tokens

3. **Advanced Analytics**:
   - Add machine learning models to predict potential breakout tokens
   - Implement social sentiment analysis integration

4. **Multi-chain Support**:
   - Expand tracking to other EVM-compatible chains
   - Cross-chain analytics for comprehensive market view

## License

MIT