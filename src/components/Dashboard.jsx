import React, { useState, useEffect, useRef } from 'react';
import TrendingTokens from './TrendingTokens';
import MetricsOverview from './MetricsOverview';
import RecentActivity from './RecentActivity';

const Dashboard = ({ onSelectToken }) => {
  const [trendingTokens, setTrendingTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  useEffect(() => {
    const fetchTrendingTokens = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/trending?limit=20');
        
        if (!response.ok) {
          throw new Error('Failed to fetch trending tokens');
        }
        
        const data = await response.json();
        setTrendingTokens(data);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrendingTokens();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchTrendingTokens, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Token Market Overview</h1>
        {lastUpdated && (
          <div className="text-sm text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
      
      {isLoading && (
        <div className="text-center py-8">
          <svg className="animate-spin h-8 w-8 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2">Loading token data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-800 border border-red-900 text-red-200 p-4 rounded mb-6">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <MetricsOverview tokens={trendingTokens} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendingTokens tokens={trendingTokens} onSelectToken={onSelectToken} />
        </div>
        <div>
          <RecentActivity tokens={trendingTokens} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;