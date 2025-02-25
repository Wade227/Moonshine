const { ethers } = require('ethers');
const { ERC20_ABI } = require('./erc20');

async function startScanning(provider, db) {
  console.log('Starting to scan Ethereum network for ERC-20 transfer events...');

  const transferTopic = ethers.utils.id('Transfer(address,address,uint256)');

  provider.on({
    topics: [transferTopic]
  }, async (log) => {
    try {
      const tokenAddress = log.address;
      const parsedLog = new ethers.utils.Interface(ERC20_ABI).parseLog(log);
      const from = parsedLog.args.from;
      const to = parsedLog.args.to;
      const value = parsedLog.args.value.toString();

      const block = await provider.getBlock(log.blockNumber);

      let token = await db.get('SELECT * FROM tokens WHERE address = ?', [tokenAddress]);

      if (!token) {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [name, symbol, totalSupply] = await Promise.all([
            tokenContract.name().catch(() => 'Unknown'),
            tokenContract.symbol().catch(() => 'UNKNOWN'),
            tokenContract.totalSupply().catch(() => '0')
          ]);

          await db.run(
            'INSERT INTO tokens (address, name, symbol, totalSupply, firstSeen, lastUpdated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(address) DO NOTHING',
            [tokenAddress, name, symbol, totalSupply.toString(), block.timestamp, block.timestamp]
          );

          console.log(`New token discovered: ${name} (${symbol}) at ${tokenAddress}`);
        } catch (err) {
          console.error(`Error adding new token ${tokenAddress}:`, err);
          await db.run(
            'INSERT INTO tokens (address, name, symbol, totalSupply, firstSeen, lastUpdated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(address) DO NOTHING',
            [tokenAddress, 'Unknown', 'UNKNOWN', '0', block.timestamp, block.timestamp]
          );
        }
      } else {
        await db.run('UPDATE tokens SET lastUpdated = ? WHERE address = ?', [block.timestamp, tokenAddress]);
      }

      await db.run(
        'INSERT INTO transfers (tokenAddress, transferFrom, transferTo, amount, timestamp, blockNumber, txHash) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tokenAddress, from, to, value, block.timestamp, log.blockNumber, log.transactionHash]
      );

      if (from !== ethers.constants.AddressZero) {
        await updateHolderBalance(tokenAddress, from, provider, db);
      }

      if (to !== ethers.constants.AddressZero) {
        await updateHolderBalance(tokenAddress, to, provider, db);
      }

      const lastCalculation = await db.get('SELECT lastCalculated FROM trends WHERE tokenAddress = ?', [tokenAddress]);
      const currentTime = Math.floor(Date.now() / 1000);

      if (!lastCalculation || (currentTime - lastCalculation.lastCalculated) > 3600) {
        await calculateTrends(tokenAddress, db, provider);
      }

    } catch (error) {
      console.error('Error processing transfer event:', error);
    }
  });
  
  console.log('Event listener set up successfully.');
  }
  
  // Debounce function to limit calls to updateHolderBalance
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
  
  const debouncedUpdateHolderBalance = debounce(updateHolderBalance, 1000); // Debounce for 1 second
  
  async function updateHolderBalance(tokenAddress, holderAddress, provider, db) {
  try {
    const currentTime = Math.floor(Date.now() / 1000);

    // Check for cached balance
    const cachedBalance = await db.get(
      'SELECT balance, lastUpdated FROM holders WHERE address = ? AND tokenAddress = ?',
      [holderAddress, tokenAddress]
    );

    if (cachedBalance && (currentTime - cachedBalance.lastUpdated) < 60) {
      // Use cached balance if updated within the last 60 seconds
      return cachedBalance.balance;
    }

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await tokenContract.balanceOf(holderAddress);

    await db.run(
      'INSERT INTO holders (address, tokenAddress, balance, lastUpdated) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(address, tokenAddress) DO UPDATE SET balance = ?, lastUpdated = ?',
      [holderAddress, tokenAddress, balance.toString(), currentTime, balance.toString(), currentTime]
    );

    return balance.toString();
  } catch (error) {
    console.error(`Error updating holder balance for ${holderAddress} on token ${tokenAddress}:`, error);
    return '0';
  }
}

async function calculateTrends(tokenAddress, db, provider) {
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    const oneDayAgo = currentTime - 86400;

    const token = await db.get('SELECT * FROM tokens WHERE address = ?', [tokenAddress]);
    if (!token) return;

    const holdersCount = await db.get(
      'SELECT COUNT(*) as count FROM holders WHERE tokenAddress = ? AND balance > 0',
      [tokenAddress]
    );

    const transfersCount = await db.get(
      'SELECT COUNT(*) as count FROM transfers WHERE tokenAddress = ? AND timestamp > ?',
      [tokenAddress, oneDayAgo]
    );

    let velocity = 0;
    if (token.totalSupply && token.totalSupply !== '0') {
      velocity = (transfersCount.count / ethers.utils.formatUnits(token.totalSupply, 18)) * 100;
    }

    const largeTransactionsThreshold = await db.get(
      'SELECT amount FROM transfers WHERE tokenAddress = ? AND timestamp > ? ORDER BY CAST(amount AS REAL) DESC LIMIT 1 OFFSET (SELECT COUNT(*)/10 FROM transfers WHERE tokenAddress = ? AND timestamp > ?)',
      [tokenAddress, oneDayAgo, tokenAddress, oneDayAgo]
    );

    let largeTransactions = 0;
    if (largeTransactionsThreshold) {
      const largeTransactionsCount = await db.get(
        'SELECT COUNT(*) as count FROM transfers WHERE tokenAddress = ? AND timestamp > ? AND CAST(amount AS REAL) >= ?',
        [tokenAddress, oneDayAgo, largeTransactionsThreshold.amount]
      );
      largeTransactions = largeTransactionsCount.count;
    }

    const previousHolders = await db.get(
      'SELECT COUNT(*) as count FROM holders WHERE tokenAddress = ? AND lastUpdated < ? AND balance > 0',
      [tokenAddress, oneDayAgo]
    );

    let growthRate = 0;
    if (previousHolders.count > 0) {
      growthRate = ((holdersCount.count - previousHolders.count) / previousHolders.count) * 100;
    }

    const topHolders = await db.all(
      'SELECT SUM(CAST(balance AS REAL)) as totalBalance FROM holders WHERE tokenAddress = ? AND balance > 0 ORDER BY CAST(balance AS REAL) DESC LIMIT 10',
      [tokenAddress]
    );

    let whaleConcentration = 0;
    if (token.totalSupply && token.totalSupply !== '0' && topHolders[0]) {
      whaleConcentration = (topHolders[0].totalBalance / ethers.utils.formatUnits(token.totalSupply, 18)) * 100;
    }

    const trendScore = (
      (velocity * 0.3) +
      (holdersCount.count / 100 * 0.2) +
      (growthRate * 0.3) +
      (largeTransactions * 0.2) -
      (whaleConcentration > 80 ? (whaleConcentration - 80) * 0.05 : 0)
    );

    await db.run(
      'INSERT INTO trends (tokenAddress, velocity, uniqueHolders, largeTransactions, growthRate, whaleConcentration, trendScore, lastCalculated) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(tokenAddress) DO UPDATE SET ' +
      'velocity = ?, uniqueHolders = ?, largeTransactions = ?, growthRate = ?, whaleConcentration = ?, trendScore = ?, lastCalculated = ?',
      [
        tokenAddress, velocity, holdersCount.count, largeTransactions, growthRate, whaleConcentration, trendScore, currentTime,
        velocity, holdersCount.count, largeTransactions, growthRate, whaleConcentration, trendScore, currentTime
      ]
    );

    console.log(`Updated trends for ${token.symbol} (${tokenAddress}), trend score: ${trendScore.toFixed(2)}`);
  } catch (error) {
    console.error(`Error calculating trends for ${tokenAddress}:`, error);
  }
}

module.exports = { startScanning };