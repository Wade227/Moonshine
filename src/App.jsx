import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './components/Dashboard';
import TokenDetail from './components/TokenDetail';
import Navigation from './components/Navigation';

const App = () => {
  const [view, setView] = useState('dashboard');
  const [selectedToken, setSelectedToken] = useState(null);
  
  const switchToDetail = (token) => {
    setSelectedToken(token);
    setView('tokenDetail');
  };
  
  const switchToDashboard = () => {
    setView('dashboard');
  };
  
  return (
    <div className="min-h-screen">
      <Navigation onNavigate={switchToDashboard} />
      
      <main className="container mx-auto px-4 py-8">
        {view === 'dashboard' ? (
          <Dashboard onSelectToken={switchToDetail} />
        ) : view === 'tokenDetail' ? (
          selectedToken ? <TokenDetail token={selectedToken} onBack={switchToDashboard} /> : <div>No token selected</div>
        ) : (
          <div>Invalid view</div>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

export default App;