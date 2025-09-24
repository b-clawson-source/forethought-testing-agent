import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

export default function Header() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    apiClient.health()
      .then(res => setHealth(res.data))
      .catch(err => console.error('Health check failed:', err));
  }, []);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">FT</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Forethought Testing Agent</h1>
              <p className="text-sm text-gray-500">AI-Powered Conversation Testing</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {health && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {health.status === 'healthy' ? 'System Healthy' : 'System Issue'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
