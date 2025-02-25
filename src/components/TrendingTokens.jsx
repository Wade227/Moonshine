import React, { useState } from 'react';

const TrendingTokens = ({ tokens, onSelectToken }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'trendScore', direction: 'descending' });

  const sortedTokens = React.useMemo(() => {
    let sortableTokens = [...tokens];
    if (sortConfig !== null) {
      sortableTokens.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'uniqueHolders') {
          valA = parseInt(valA, 10) || 0;
          valB = parseInt(valB, 10) || 0;
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableTokens;
  }, [tokens, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Trending Tokens</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-600 border border-gray-600">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Token
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('trendScore')}
              >
                Trend Score
                {sortConfig.key === 'trendScore' && (
                  sortConfig.direction === 'ascending' ? (
                    <span className="ml-1 text-sm">▲</span>
                  ) : (
                    <span className="ml-1 text-sm">▼</span>
                  )
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('velocity')}
              >
                Velocity
                {sortConfig.key === 'velocity' && (
                  sortConfig.direction === 'ascending' ? (
                    <span className="ml-1 text-sm">▲</span>
                  ) : (
                    <span className="ml-1 text-sm">▼</span>
                  )
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('uniqueHolders')}
              >
                Holders
                {sortConfig.key === 'uniqueHolders' && (
                  sortConfig.direction === 'ascending' ? (
                    <span className="ml-1 text-sm">▲</span>
                  ) : (
                    <span className="ml-1 text-sm">▼</span>
                  )
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('growthRate')}
              >
                Growth
                {sortConfig.key === 'growthRate' && (
                  sortConfig.direction === 'ascending' ? (
                    <span className="ml-1 text-sm">▲</span>
                  ) : (
                    <span className="ml-1 text-sm">▼</span>
                  )
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('whaleConcentration')}
              >
                Whale %
                {sortConfig.key === 'whaleConcentration' && (
                  sortConfig.direction === 'ascending' ? (
                    <span className="ml-1 text-sm">▲</span>
                  ) : (
                    <span className="ml-1 text-sm">▼</span>
                  )
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            {sortedTokens.length > 0 ? (
              sortedTokens.map((token) => (
                <tr
                  key={token.address}
                  className="hover:bg-gray-700 cursor-pointer transition duration-150 ease-in-out"
                  onClick={() => onSelectToken(token)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-sm text-gray-400">{token.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">
                      {parseFloat(token.trendScore).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {parseFloat(token.velocity).toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {token.uniqueHolders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${
                      token.growthRate > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {parseFloat(token.growthRate).toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {parseFloat(token.whaleConcentration).toFixed(2)}%
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-base text-gray-400">
                  No trending tokens found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrendingTokens;