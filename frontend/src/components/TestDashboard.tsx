import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, FileText, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

const TestDashboard = () => {
  const [activeTests, setActiveTests] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [testConfig, setTestConfig] = useState({
    numberOfConversations: 10,
    personaType: 'frustrated_customer',
    maxTurnsPerConversation: 15,
    delayBetweenTurns: 2000,
    delayBetweenConversations: 5000
  });

  const personas = [
    { value: 'frustrated_customer', label: 'Frustrated Customer' },
    { value: 'confused_elderly', label: 'Confused Elderly' },
    { value: 'angry_billing', label: 'Angry Billing' },
    { value: 'new_user', label: 'New User' },
    { value: 'technical_expert', label: 'Technical Expert' },
    { value: 'happy_customer', label: 'Happy Customer' }
  ];

  useEffect(() => {
    fetchActiveTests();
    fetchReports();
    const interval = setInterval(() => {
      fetchActiveTests();
      fetchReports();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTests = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tests/active');
      const data = await response.json();
      if (data.success) {
        setActiveTests(data.activeTests);
      }
    } catch (error) {
      console.error('Failed to fetch active tests:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tests/reports');
      const data = await response.json();
      if (data.success) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const startTestCycle = async () => {
    setIsStartingTest(true);
    try {
      const response = await fetch('http://localhost:3001/api/tests/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testConfig)
      });
      const data = await response.json();
      if (data.success) {
        alert(`Test cycle started with ID: ${data.testId}`);
        fetchActiveTests();
      }
    } catch (error) {
      console.error('Failed to start test cycle:', error);
      alert('Failed to start test cycle');
    } finally {
      setIsStartingTest(false);
    }
  };

  const viewReport = async (reportId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tests/reports/${reportId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedReport(data.report);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
  };

  const formatDuration = (start, end) => {
    const duration = new Date(end) - new Date(start);
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Autonomous Test Dashboard</h1>
        
        {/* Test Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Conversations
              </label>
              <input
                type="number"
                value={testConfig.numberOfConversations}
                onChange={(e) => setTestConfig({...testConfig, numberOfConversations: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persona Type
              </label>
              <select
                value={testConfig.personaType}
                onChange={(e) => setTestConfig({...testConfig, personaType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {personas.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Turns per Conversation
              </label>
              <input
                type="number"
                value={testConfig.maxTurnsPerConversation}
                onChange={(e) => setTestConfig({...testConfig, maxTurnsPerConversation: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delay Between Turns (ms)
              </label>
              <input
                type="number"
                value={testConfig.delayBetweenTurns}
                onChange={(e) => setTestConfig({...testConfig, delayBetweenTurns: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <button
            onClick={startTestCycle}
            disabled={isStartingTest}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isStartingTest ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Starting Test...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Test Cycle
              </>
            )}
          </button>
        </div>

        {/* Active Tests */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Active Tests ({activeTests.length})
          </h2>
          {activeTests.length === 0 ? (
            <p className="text-gray-500">No active tests running</p>
          ) : (
            <div className="space-y-2">
              {activeTests.map(test => (
                <div key={test.testId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">Test #{test.testId}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      {test.config.numberOfConversations} conversations • {test.config.personaType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    Started {new Date(test.startTime).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Reports */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Test Reports
          </h2>
          {reports.length === 0 ? (
            <p className="text-gray-500">No reports available</p>
          ) : (
            <div className="space-y-2">
              {reports.map(report => (
                <div key={report.testId} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                     onClick={() => viewReport(report.filename.replace('.json', ''))}>
                  <div className="flex items-center gap-3">
                    {report.successRate >= 0.8 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <span className="font-medium">Test #{report.testId}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {report.totalConversations} conversations • {(report.successRate * 100).toFixed(1)}% success
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(report.startTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto p-6">
              <h3 className="text-2xl font-bold mb-4">Test Report #{selectedReport.testId}</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Success Rate</div>
                  <div className="text-2xl font-bold">{(selectedReport.successRate * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Duration</div>
                  <div className="text-2xl font-bold">
                    {formatDuration(selectedReport.startTime, selectedReport.endTime)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Total Conversations</div>
                  <div className="text-2xl font-bold">{selectedReport.totalConversations}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                  <div className="text-2xl font-bold">{selectedReport.averageResponseTime.toFixed(0)}ms</div>
                </div>
              </div>

              {/* Common Intents */}
              {selectedReport.commonIntents && selectedReport.commonIntents.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Common Intents</h4>
                  <div className="space-y-1">
                    {selectedReport.commonIntents.slice(0, 5).map(intent => (
                      <div key={intent.intent} className="flex justify-between text-sm">
                        <span>{intent.intent}</span>
                        <span className="text-gray-500">{intent.count} occurrences</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversations Summary */}
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Conversations</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedReport.conversations.map((conv, idx) => (
                    <div key={conv.conversationId} className="p-3 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Conversation #{idx + 1}</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          conv.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {conv.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {conv.totalTurns} turns • {conv.metrics.averageResponseTime.toFixed(0)}ms avg response
                      </div>
                      {conv.errors && conv.errors.length > 0 && (
                        <div className="text-sm text-red-600 mt-1">
                          Error: {conv.errors[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestDashboard;