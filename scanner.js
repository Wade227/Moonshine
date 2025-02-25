const { ethers } = require('ethers');
const { ERC20_ABI } = require('./erc20');
const EventEmitter = require('events');

// Create token scanner event system
class TokenScannerEvents extends EventEmitter {}
const scannerEvents = new TokenScannerEvents();

// In-memory buffers for high performance
const transferBuffer = [];
const tokenCache = new Map();
const holderBalanceCache = new Map();
const trendCalculationTimestamps = new Map();
const pendingBalanceUpdates = new Set();

// Batch sizes and intervals
const TRANSFER_BATCH_SIZE = 100;
const BALANCE_BATCH_SIZE = 50;
const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds
const TREND_CALCULATION_INTERVAL = 600000; // 10 minutes

async function startScanning(provider, db) {
  console.log('Starting high-performance scan of Ethereum network for ERC-20 transfers...');

  // Initialize system and load caches
  await initializeSystem(db);
  
  // Set up buffer flush timers
  setupBufferFlushers(db, provider);

  // Listen for Transfer events
  const transferTopic = ethers.utils.id('Transfer(address,address,uint256)');
  provider.on({ topics: [transferTopic] }, async (log) => {
    try {
      // Extract basic information without any DB or RPC calls
      const transferData = extractTransferData(log);
      
      // Push to buffer - no awaits, ultra fast
      transferBuffer.push(transferData);
      
      // Signal that balances need updating - just sets flags, doesn't process yet
      flagBalanceUpdates(transferData.tokenAddress, transferData.from, transferData.to);
      
      // Process buffer immediately if it reaches threshold
      if (transferBuffer.length >= TRANSFER_BATCH_SIZE) {
        scannerEvents.emit('processTransferBuffer');
      }
    } catch (error) {
      console.error('Error handling transfer event:', error);
    }
  });
  
  console.log('Event listener set up successfully. High-performance mode activated.');
}

async function initializeSystem(db) {
  // Load token cache to avoid DB lookups
  const tokens = await db.all('SELECT * FROM tokens');
  tokens.forEach(token => {
    tokenCache.set(token.address, token);
  });
  
  // Load trend calculation timestamps
  const trends = await db.all('SELECT tokenAddress, lastCalculated FROM trends');
  trends.forEach(trend => {
    trendCalculationTimestamps.set(trend.tokenAddress, trend.lastCalculated);
  });
  
  console.log(`Initialized with ${tokenCache.size} tokens in cache`);
}

function setupBufferFlushers(db, provider) {
  // Process transfer buffer
  scannerEvents.on('processTransferBuffer', async () => {
    if (transferBuffer.length === 0) return;
    
    // Capture current buffer and reset
    const transfers = [...transferBuffer];
    transferBuffer.length = 0;
    
    // Process the captured transfers
    processTransferBatch(transfers, db, provider);
  });
  
  // Set up timers for regular flushing
  setInterval(() => {
    if (transferBuffer.length > 0) {
      scannerEvents.emit('processTransferBuffer');
    }
  }, BUFFER_FLUSH_INTERVAL);
  
  // Set up timer for balance updates
  setInterval(() => {
    if (pendingBalanceUpdates.size > 0) {
      processBalanceUpdates(db, provider);
    }
  }, BUFFER_FLUSH_INTERVAL);
  
  // Set up timer for trend calculations
  setInterval(() => {
    processTrendCalculations(db, provider);
  }, TREND_CALCULATION_INTERVAL);
}

function extractTransferData(log) {
  const tokenAddress = log.address;
  const parsedLog = new ethers.utils.Interface(ERC20_ABI).parseLog(log);
  
  return {
    tokenAddress,
    from: parsedLog.args.from,
    to: parsedLog.args.to,
    value: parsedLog.args.value.toString(),
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    // Don't fetch block details here for speed - will get later in batch
    blockTimestamp: null
  };
}

function flagBalanceUpdates(tokenAddress, from, to) {
  if (from !== ethers.constants.AddressZero) {
    pendingBalanceUpdates.add(`${tokenAddress}:${from}`);
  }
  
  if (to !== ethers.constants.AddressZero) {
    pendingBalanceUpdates.add(`${tokenAddress}:${to}`);
  }
}

async function processTransferBatch(transfers, db, provider) {
  try {
    console.log(`Processing batch of ${transfers.length} transfers`);
    
    // Get unique blocks we need to fetch
    const uniqueBlockNumbers = [...new Set(transfers.map(t => t.blockNumber))];
    
    // Fetch all blocks in parallel
    const blockPromises = uniqueBlockNumbers.map(async (blockNumber) => {
      const block = await provider.getBlock(blockNumber);
      return { blockNumber, timestamp: block.timestamp };
    });
    
    const blocks = await Promise.all(blockPromises);
    const blockTimestamps = Object.fromEntries(
      blocks.map(({ blockNumber, timestamp }) => [blockNumber, timestamp])
    );
    
    // Add timestamps to transfers
    transfers.forEach(transfer => {
      transfer.blockTimestamp = blockTimestamps[transfer.blockNumber];
    });
    
    // Get unique token addresses
    const uniqueTokenAddresses = [...new Set(transfers.map(t => t.tokenAddress))];
    
    // Check which tokens we need to fetch info for
    const tokensToFetch = uniqueTokenAddresses.filter(addr => !tokenCache.has(addr));
    
    // Fetch token info in parallel
    if (tokensToFetch.length > 0) {
      await fetchTokenInfo(tokensToFetch, provider, db, transfers[0].blockTimestamp);
    }
    
    // Perform DB operations in a single transaction for better performance
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Insert transfers in a batch
      const transferStmt = await db.prepare(
        'INSERT INTO transfers (tokenAddress, transferFrom, transferTo, amount, timestamp, blockNumber, txHash) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      
      for (const transfer of transfers) {
        await transferStmt.run([
          transfer.tokenAddress,
          transfer.from, 
          transfer.to,
          transfer.value,
          transfer.blockTimestamp,
          transfer.blockNumber,
          transfer.transactionHash
        ]);
      }
      
      await transferStmt.finalize();
      
      // Update last token activity timestamps
      const updateTokenStmt = await db.prepare(
        'UPDATE tokens SET lastUpdated = ? WHERE address = ?'
      );
      
      for (const tokenAddress of uniqueTokenAddresses) {
        const timestamp = Math.max(...transfers
          .filter(t => t.tokenAddress === tokenAddress)
          .map(t => t.blockTimestamp));
          
        await updateTokenStmt.run([timestamp, tokenAddress]);
        
        // Update token cache
        const token = tokenCache.get(tokenAddress);
        if (token) {
          token.lastUpdated = timestamp;
        }
      }
      
      await updateTokenStmt.finalize();
      await db.run('COMMIT');
      
      console.log(`Successfully processed ${transfers.length} transfers for ${uniqueTokenAddresses.length} tokens`);
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error processing transfer batch:', error);
  }
}

async function fetchTokenInfo(tokenAddresses, provider, db, timestamp) {
  try {
    console.log(`Fetching info for ${tokenAddresses.length} new tokens`);
    
    const tokenInfoPromises = tokenAddresses.map(async (tokenAddress) => {
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [name, symbol, totalSupply] = await Promise.all([
          tokenContract.name().catch(() => 'Unknown'),
          tokenContract.symbol().catch(() => 'UNKNOWN'),
          tokenContract.totalSupply().catch(() => '0')
        ]);
        
        return {
          address: tokenAddress,
          name,
          symbol,
          totalSupply: totalSupply.toString(),
          firstSeen: timestamp,
          lastUpdated: timestamp
        };
      } catch (err) {
        console.error(`Error getting token info for ${tokenAddress}:`, err);
        return {
          address: tokenAddress,
          name: 'Unknown',
          symbol: 'UNKNOWN',
          totalSupply: '0',
          firstSeen: timestamp,
          lastUpdated: timestamp
        };
      }
    });
    
    const tokenInfos = await Promise.all(tokenInfoPromises);
    
    // Insert into DB in a single transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      const stmt = await db.prepare(
        'INSERT INTO tokens (address, name, symbol, totalSupply, firstSeen, lastUpdated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(address) DO NOTHING'
      );
      
      for (const tokenInfo of tokenInfos) {
        await stmt.run([
          tokenInfo.address,
          tokenInfo.name,
          tokenInfo.symbol,
          tokenInfo.totalSupply,
          tokenInfo.firstSeen,
          tokenInfo.lastUpdated
        ]);
        
        // Update cache
        tokenCache.set(tokenInfo.address, tokenInfo);
        
        console.log(`Registered new token: ${tokenInfo.name} (${tokenInfo.symbol}) at ${tokenInfo.address}`);
      }
      
      await stmt.finalize();
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error fetching token info:', error);
  }
}

async function processBalanceUpdates(db, provider) {
  try {
    if (pendingBalanceUpdates.size === 0) return;
    
    console.log(`Processing ${pendingBalanceUpdates.size} balance updates`);
    
    // Group by token address for batch efficiency
    const updatesByToken = {};
    pendingBalanceUpdates.forEach(key => {
      const [tokenAddress, holderAddress] = key.split(':');
      if (!updatesByToken[tokenAddress]) {
        updatesByToken[tokenAddress] = [];
      }
      updatesByToken[tokenAddress].push(holderAddress);
    });
    
    // Clear pending updates
    pendingBalanceUpdates.clear();
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const holderUpdates = [];
    
    // Process each token's holders
    for (const [tokenAddress, holders] of Object.entries(updatesByToken)) {
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        
        // Process in smaller batches to avoid RPC overload
        for (let i = 0; i < holders.length; i += BALANCE_BATCH_SIZE) {
          const batchHolders = holders.slice(i, i + BALANCE_BATCH_SIZE);
          
          // Get balances in parallel
          const balancePromises = batchHolders.map(async (holder) => {
            try {
              const balance = await tokenContract.balanceOf(holder);
              return { holder, balance: balance.toString() };
            } catch (err) {
              console.error(`Error getting balance for ${holder}:`, err);
              return { holder, balance: '0' };
            }
          });
          
          const balances = await Promise.all(balancePromises);
          
          // Add to holder updates
          balances.forEach(({ holder, balance }) => {
            holderUpdates.push({
              address: holder,
              tokenAddress,
              balance,
              lastUpdated: currentTimestamp
            });
            
            // Update cache
            holderBalanceCache.set(`${tokenAddress}:${holder}`, {
              balance,
              lastUpdated: currentTimestamp
            });
          });
        }
      } catch (error) {
        console.error(`Error processing balances for token ${tokenAddress}:`, error);
      }
    }
    
    // Batch insert/update into DB
    if (holderUpdates.length > 0) {
      await db.run('BEGIN TRANSACTION');
      
      try {
        const stmt = await db.prepare(
          'INSERT INTO holders (address, tokenAddress, balance, lastUpdated) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(address, tokenAddress) DO UPDATE SET balance = ?, lastUpdated = ?'
        );
        
        for (const update of holderUpdates) {
          await stmt.run([
            update.address,
            update.tokenAddress,
            update.balance,
            update.lastUpdated,
            update.balance,
            update.lastUpdated
          ]);
        }
        
        await stmt.finalize();
        await db.run('COMMIT');
        console.log(`Updated ${holderUpdates.length} holder balances`);
      } catch (error) {
        await db.run('ROLLBACK');
        console.error('Error updating holder balances:', error);
      }
    }
    
  } catch (error) {
    console.error('Error processing balance updates:', error);
  }
}

async function processTrendCalculations(db, provider) {
  try {
    console.log('Processing trend calculations');
    const currentTime = Math.floor(Date.now() / 1000);
    const oneDayAgo = currentTime - 86400;
    
    // Get active tokens that need trend updates
    const activeTokenAddresses = [...tokenCache.keys()];
    const tokensToUpdate = activeTokenAddresses.filter(addr => {
      const lastCalculated = trendCalculationTimestamps.get(addr) || 0;
      return (currentTime - lastCalculated) > 3600; // 1 hour threshold
    });
    
    if (tokensToUpdate.length === 0) {
      console.log('No tokens need trend updates at this time');
      return;
    }
    
    console.log(`Calculating trends for ${tokensToUpdate.length} tokens`);
    
    // Update trends in smaller batches to avoid overwhelming the DB
    for (let i = 0; i < tokensToUpdate.length; i += 10) {
      const batch = tokensToUpdate.slice(i, i + 10);
      
      // Process each token in the batch in parallel
      await Promise.all(batch.map(async (tokenAddress) => {
        try {
          // Get token from cache
          const token = tokenCache.get(tokenAddress);
          if (!token) return;
          
          // Run trend calculations
          const trend = await calculateTokenTrend(tokenAddress, token, db, currentTime, oneDayAgo);
          
          // Save trend data
          await db.run(
            'INSERT INTO trends (tokenAddress, velocity, uniqueHolders, largeTransactions, growthRate, whaleConcentration, trendScore, lastCalculated) ' +
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(tokenAddress) DO UPDATE SET ' +
            'velocity = ?, uniqueHolders = ?, largeTransactions = ?, growthRate = ?, whaleConcentration = ?, trendScore = ?, lastCalculated = ?',
            [
              tokenAddress, trend.velocity, trend.uniqueHolders, trend.largeTransactions, 
              trend.growthRate, trend.whaleConcentration, trend.trendScore, currentTime,
              trend.velocity, trend.uniqueHolders, trend.largeTransactions, 
              trend.growthRate, trend.whaleConcentration, trend.trendScore, currentTime
            ]
          );
          
          // Update cache
          trendCalculationTimestamps.set(tokenAddress, currentTime);
          
          console.log(`Updated trends for ${token.symbol} (${tokenAddress}), score: ${trend.trendScore.toFixed(2)}`);
        } catch (error) {
          console.error(`Error calculating trends for ${tokenAddress}:`, error);
        }
      }));
    }
    
  } catch (error) {
    console.error('Error processing trend calculations:', error);
  }
}

async function calculateTokenTrend(tokenAddress, token, db, currentTime, oneDayAgo) {
  // Run queries in parallel for better performance
  const [holdersCount, transfersCount, largeTransactionsThreshold, previousHolders, topHolders] = await Promise.all([
    db.get('SELECT COUNT(*) as count FROM holders WHERE tokenAddress = ? AND balance > 0', [tokenAddress]),
    db.get('SELECT COUNT(*) as count FROM transfers WHERE tokenAddress = ? AND timestamp > ?', [tokenAddress, oneDayAgo]),
    db.get(
      'SELECT amount FROM transfers WHERE tokenAddress = ? AND timestamp > ? ' + 
      'ORDER BY CAST(amount AS REAL) DESC LIMIT 1 OFFSET (SELECT COUNT(*)/10 FROM transfers WHERE tokenAddress = ? AND timestamp > ?)',
      [tokenAddress, oneDayAgo, tokenAddress, oneDayAgo]
    ),
    db.get(
      'SELECT COUNT(*) as count FROM holders WHERE tokenAddress = ? AND lastUpdated < ? AND balance > 0',
      [tokenAddress, oneDayAgo]
    ),
    db.all(
      'SELECT SUM(CAST(balance AS REAL)) as totalBalance FROM holders WHERE tokenAddress = ? AND balance > 0 ORDER BY CAST(balance AS REAL) DESC LIMIT 10',
      [tokenAddress]
    )
  ]);
  
  // Calculate velocity
  let velocity = 0;
  if (token.totalSupply && token.totalSupply !== '0') {
    velocity = (transfersCount.count / ethers.utils.formatUnits(token.totalSupply, 18)) * 100;
  }
  
  // Calculate large transactions
  let largeTransactions = 0;
  if (largeTransactionsThreshold) {
    const largeTransactionsCount = await db.get(
      'SELECT COUNT(*) as count FROM transfers WHERE tokenAddress = ? AND timestamp > ? AND CAST(amount AS REAL) >= ?',
      [tokenAddress, oneDayAgo, largeTransactionsThreshold.amount]
    );
    largeTransactions = largeTransactionsCount.count;
  }
  
  // Calculate growth rate
  let growthRate = 0;
  if (previousHolders.count > 0) {
    growthRate = ((holdersCount.count - previousHolders.count) / previousHolders.count) * 100;
  }
  
  // Calculate whale concentration
  let whaleConcentration = 0;
  if (token.totalSupply && token.totalSupply !== '0' && topHolders[0]) {
    whaleConcentration = (topHolders[0].totalBalance / ethers.utils.formatUnits(token.totalSupply, 18)) * 100;
  }
  
  // Calculate trend score
  const trendScore = (
    (velocity * 0.3) +
    (holdersCount.count / 100 * 0.2) +
    (growthRate * 0.3) +
    (largeTransactions * 0.2) -
    (whaleConcentration > 80 ? (whaleConcentration - 80) * 0.05 : 0)
  );
  
  return {
    velocity,
    uniqueHolders: holdersCount.count,
    largeTransactions,
    growthRate,
    whaleConcentration,
    trendScore
  };
}

module.exports = { startScanning };