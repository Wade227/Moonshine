import React, { useState, useEffect } from 'react';

const RecentActivity = ({ tokens }) => {
  // This would ideally be fetched from a real-time endpoint
  // For MVP, we'll just use the trending tokens as placeholder
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      try {
        const response = await fetch('/api/recent-transactions');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRecentTransactions(data);
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        // Optionally, set an error state to display an error message to the user
        setRecentTransactions([]); // Or handle the error in another way
      }
    };

    fetchRecentTransactions();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Recent Activity</h2>

      <div className="space-y-4">
        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx) => (
            <div key={tx.id} className="border-b border-gray-600 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{tx.tokenSymbol}</span>
                  <span className="text-sm text-gray-400 ml-1">
                      ({tx.amount} tokens)
                  </span>
                </div>
                <span
                  className={`text-sm ${
                    tx.isLarge ? 'text-yellow-400' : 'text-gray-400'
                  }`}
                >
                  {tx.isLarge ? '🔥 Large Transfer' : 'Transfer'}
                </span>
              </div>
              <div className="text-sm text-gray-400 mt-1">
                From: {tx.transferFrom}
              </div>
              <div className="text-sm text-gray-400">To: {tx.transferTo}</div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {new Date(tx.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-300 py-4">
            No recent activity.
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;