import React from 'react';

const TestDashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Fetch Testing Agent - Test Version
          </h1>
          <p className="text-gray-600 mt-2">Testing if the component loads correctly</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-blue-600 font-medium">Info</p>
              <p className="text-xl font-bold text-blue-900">10</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-green-600 font-medium">Success</p>
              <p className="text-xl font-bold text-green-900">5</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <p className="text-xs text-yellow-600 font-medium">Warning</p>
              <p className="text-xl font-bold text-yellow-900">2</p>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <p className="text-xs text-red-600 font-medium">Error</p>
              <p className="text-xl font-bold text-red-900">1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;