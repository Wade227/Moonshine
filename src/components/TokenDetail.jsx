import { ethers } from 'ethers';
import React, { useState, useEffect, useRef } from 'react';

const TokenDetail = ({ token, onBack }) => {
  const [tokenData, setTokenData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const holderDistributionChartRef = useRef(null);
  const priceHistoryChartRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const fetchTokenDetail = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/token/${token.address}`);

        if (!response.ok) {
          throw new Error('Failed to fetch token details');
        }

        const data = await response.json();
        setTokenData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenDetail();
  }, [token]);

  useEffect(() => {
    if (!tokenData || !holderDistributionChartRef.current || !priceHistoryChartRef.current) return;

    // Clear previous charts
    if (holderDistributionChartRef.current?.chart) {
      holderDistributionChartRef.current.chart.destroy();
    }
    if (priceHistoryChartRef.current?.chart) {
      priceHistoryChartRef.current.chart.destroy();
    }

    // Mock data for holder distribution
    const holderCtx = holderDistributionChartRef.current.getContext('2d');
    holderDistributionChartRef.current.chart = new Chart(holderCtx, {
      type: 'doughnut',
      data: {
        labels: ['Whales (>1%)', 'Large Holders (0.1-1%)', 'Medium Holders (0.01-0.1%)', 'Small Holders (<0.01%)'],
        datasets: [{
          data: [
            tokenData.trends.whaleConcentration,
            100 - tokenData.trends.whaleConcentration - 30 - 15,
            30,
            15
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)'
          ],
          borderColor: 'rgba(30, 30, 30, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'white',
            },
          },
          title: {
            display: true,
            text: 'Holder Distribution',
            color: 'white',
          },
        },
      },
    });

    // Mock data for transaction size distribution
    const days = [
      '7d ago',
      '6d ago',
      '5d ago',
      '4d ago',
      '3d ago',
      '2d ago',
      '1d ago',
      'Today',
    ];
    const mockPrices = [];
    let lastPrice = 1.0;

    for (let i = 0; i < 8; i++) {
      // Random price movement between -10% and +15%
      const change = Math.random() * 0.25 - 0.1;
      lastPrice = Math.max(0.1, lastPrice * (1 + change));
      mockPrices.push(lastPrice);
    }

    const priceCtx = priceHistoryChartRef.current.getContext('2d');
    priceHistoryChartRef.current.chart = new Chart(priceCtx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Relative Price',
            data: mockPrices,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            tension: 0.2,
            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: 'Relative Price (7 Days)',
            color: 'white',
          },
          scales: {
            y: {
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)',
                callback: function (value) {
                  return value.toFixed(2);
                },
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)',
              },
            },
            x: {
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)',
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)',
              },
            },
          },
        },
      }
    })}, [tokenData]);

  if (!token) return <></>;

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center text-blue-400 hover:text-blue-300 mb-4"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 16l-4-4m0 0l4-4m-4 4h18"
          ></path>
        </svg>
        Back to Dashboard
      </button>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{token.name} ({token.symbol})</h1>
            <p className="text-gray-400 text-sm mt-1">
              Token Address: {token.address}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">
              Trend Score: {parseFloat(token.trendScore).toFixed(2)}
            </div>
            <div
              className={`text-sm mt-1 ${
                token.growthRate > 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {parseFloat(token.growthRate).toFixed(2)}% growth (24h)
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading token details...</div>
      ) : error ? (
        <div className="bg-red-900 text-white p-4 rounded mb-6">
          Error: {error}
        </div>
      ) : tokenData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-700 rounded-lg shadow-md p-5">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Token Velocity
              </h3>
              <div className="text-3xl font-bold text-white">
                {parseFloat(tokenData.trends.velocity).toFixed(2)}%
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Transfers / Total Supply (24h)
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg shadow-md p-5">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Unique Holders
              </h3>
              <div className="text-3xl font-bold text-white">
                {tokenData.holders}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Addresses with non-zero balance
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg shadow-md p-5">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Large Transactions
              </h3>
              <div className="text-3xl font-bold text-white">
                {tokenData.trends.largeTransactions}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Top 10% by value (24h)
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg shadow-md p-5">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Whale Concentration
              </h3>
              <div className="text-3xl font-bold text-white">
                {parseFloat(tokenData.trends.whaleConcentration).toFixed(2)}%
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Top 10 holders percentage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <canvas ref={holderDistributionChartRef} height="250"></canvas>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <canvas ref={priceHistoryChartRef} height="250"></canvas>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Recent Transfers</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600 border border-gray-600 rounded-md">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                  {tokenData.recentTransfers.map((transfer, index) => (
                    <tr key={index} className="hover:bg-gray-700 transition duration-150 ease-in-out">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={`https://etherscan.io/tx/${transfer.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {transfer.txHash.slice(0, 8)}...{transfer.txHash.slice(-6)}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transfer.transferFrom === ethers.constants.AddressZero ? (
                          <span className="text-green-400">Mint</span>
                        ) : (
                          <a
                            href={`https://etherscan.io/address/${transfer.transferFrom}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 hover:text-white"
                          >
                            {transfer.transferFrom.slice(0, 6)}...{transfer.transferFrom.slice(-4)}
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transfer.transferTo === ethers.constants.AddressZero ? (
                          <span className="text-red-400">Burn</span>
                        ) : (
                          <a
                            href={`https://etherscan.io/address/${transfer.transferTo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 hover:text-white"
                          >
                            {transfer.transferTo.slice(0, 6)}...{transfer.transferTo.slice(-4)}
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {ethers.utils.formatUnits(transfer.amount, 18)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(transfer.timestamp * 1000).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TokenDetail;