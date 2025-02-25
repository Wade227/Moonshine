import React from 'react';

const Navigation = ({ onNavigate }) => {
  return (
    <nav className="bg-gray-800 shadow-lg py-4">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-white cursor-pointer" onClick={onNavigate}>
            Ethereum Token Tracker
          </div>
          <div className="text-sm text-gray-300">
            Scanning in real-time
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;