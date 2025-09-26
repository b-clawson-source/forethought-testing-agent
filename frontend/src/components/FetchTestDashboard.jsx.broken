import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, FileText, Activity, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, Users, Package, CreditCard, Receipt, Mail, Share2, Download, Eye, Wifi, WifiOff, MessageSquare, Send, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const FetchTestDashboard = () => {
  const [activeTests, setActiveTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [testConfig, setTestConfig] = useState({
    conversationsPerCategory: 3,
    maxTurns: 10,
    useRealWidget: false,
    delayBetweenTurns: 2000,
    delayBetweenConversations: 3000
  });
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');
  const [logs, setLogs] = useState([]);
  const [currentTestId, setCurrentTestId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [freeformQuery, setFreeformQuery] = useState('');
  const [isFreeformRunning, setIsFreeformRunning] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [expandedTests, setExpandedTests] = useState(new Set());
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Category icons mapping
  const categoryIcons = {
    'missing_points': TrendingUp,
    'account_management': Users,
    'fetch_play': Package,
    'rewards_gift_cards': CreditCard,
    'receipt_issues': Receipt,
    'ereceipt_scanning': Mail,
    'referral_issues': Share2
  };

  useEffect(() => {
    fetchCategories();
    fetchActiveTests();
    fetchReports();
    const interval = setInterval(() => {
      fetchActiveTests();
      fetchReports();
    }, 5000);
    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll logs
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Connect to SSE for real-time logs
  const connectToLogs = (testId) => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    setLogs([]); // Clear previous logs
    setCurrentTestId(testId);

    const eventSource = new EventSource(`http://localhost:3001/api/tests/logs/${testId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('SSE connection established for test:', testId);
    };

    eventSource.onmessage = (event) => {
      const log = JSON.parse(event.data);
      
      if (log.type === 'connected') {
        console.log('Connected to log stream');
      } else {
        // Add log to display
        setLogs(prev => [...prev, {
          timestamp: new Date(log.timestamp).toLocaleTimeString(),
          level: log.level,
          message: log.message,
          metadata: log.metadata
        }]);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setConnectionStatus('error');
      
      // Reconnect after 5 seconds if test is still active
      setTimeout(() => {
        const stillActive = activeTests.find(t => t.id === testId && t.status === 'running');
        if (stillActive) {
          connectToLogs(testId);
        }
      }, 5000);
    };

    return eventSource;
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/fetch/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
        setSelectedCategories(data.categories.slice(0, 3).map(c => c.id));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchActiveTests = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tests/active');
      const data = await response.json();
      if (data.success) {
        setActiveTests(data.activeTests);
        
        // Auto-connect to logs if there's a running test and we're not connected
        if (data.activeTests.length > 0 && !currentTestId) {
          const runningTest = data.activeTests.find(t => t.status === 'running');
          if (runningTest) {
            connectToLogs(runningTest.id);
          }
        }
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

  const startTest = async () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one category to test');
      return;
    }

    setIsStartingTest(true);
    setLogs([]); // Clear previous logs
    
    try {
      const response = await fetch('http://localhost:3001/api/fetch/test/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testConfig,
          categories: selectedCategories
        })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Test started:', data.testId);
        
        // Connect to real-time logs
        connectToLogs(data.testId);
        
        fetchActiveTests();
        setActiveTab('monitor');
      }
    } catch (error) {
      console.error('Failed to start test:', error);
      alert('Failed to start test');
    } finally {
      setIsStartingTest(false);
    }
  };

  const startFreeformConversation = async () => {
    if (!freeformQuery.trim()) {
      alert('Please enter a query');
      return;
    }

    setIsFreeformRunning(true);
    setLogs([]); // Clear previous logs
    
    try {
      const response = await fetch('http://localhost:3001/api/fetch/freeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: freeformQuery,
          maxTurns: 10
        })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Freeform conversation started:', data.conversationId);
        
        // Connect to real-time logs
        connectToLogs(data.conversationId);
        
        fetchActiveTests();
        setActiveTab('monitor');
      }
    } catch (error) {
      console.error('Failed to start freeform conversation:', error);
      alert('Failed to start conversation');
    } finally {
      setIsFreeformRunning(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories.map(c => c.id));
  };

  const clearCategories = () => {
    setSelectedCategories([]);
  };

  const downloadLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_${currentTestId}_logs.json`;
    a.click();
  };

  const toggleTestExpansion = (testId) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  const getLogColor = (level) => {
    switch(level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'info': 
      default: return 'text-blue-400';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.level === logFilter;
  });

  const totalConversations = selectedCategories.length * testConfig.conversationsPerCategory;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="w-8 h-8 text-purple-600" />
                </div>
                Fetch Testing Agent
              </h1>
              <p className="text-gray-600 mt-2">AI-powered autonomous testing with real-time logging</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Widget API Key</p>
              <p className="font-mono text-xs text-gray-600">f633608a-e999-442a-8f94-312ec5ff33ae</p>
              <div className="flex items-center gap-2 mt-2 justify-end">
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">Live logs connected</span>
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
                    <span className="text-xs text-yellow-600">Connecting...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Not connected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('configure')}
              className={`px-6 py-3 font-semibold ${
                activeTab === 'configure' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Configure Test
            </button>
            <button
              onClick={() => setActiveTab('freeform')}
              className={`px-6 py-3 font-semibold ${
                activeTab === 'freeform' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Freeform Testing
            </button>
            <button
              onClick={() => setActiveTab('monitor')}
              className={`px-6 py-3 font-semibold ${
                activeTab === 'monitor' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monitor & Logs
              {activeTests.filter(t => t.status === 'running').length > 0 && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  {activeTests.filter(t => t.status === 'running').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 font-semibold ${
                activeTab === 'reports' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Reports
              {reports.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {reports.length}
                </span>
              )}
            </button>
          </div>

          {/* Configure Tab */}
          {activeTab === 'configure' && (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select Categories to Test</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllCategories}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearCategories}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map(category => {
                    const Icon = categoryIcons[category.id] || AlertCircle;
                    return (
                      <div
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCategories.includes(category.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded ${
                            selectedCategories.includes(category.id)
                              ? 'bg-purple-200'
                              : 'bg-gray-100'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{category.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Conversations per Category
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={testConfig.conversationsPerCategory}
                    onChange={(e) => setTestConfig({
                      ...testConfig,
                      conversationsPerCategory: parseInt(e.target.value) || 1
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Turns per Conversation
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={testConfig.maxTurns}
                    onChange={(e) => setTestConfig({
                      ...testConfig,
                      maxTurns: parseInt(e.target.value) || 1
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <button
                onClick={startTest}
                disabled={isStartingTest || selectedCategories.length === 0}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                  selectedCategories.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {isStartingTest ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Starting Test...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Test Suite ({totalConversations} conversations)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Freeform Tab */}
          {activeTab === 'freeform' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Test Custom Conversations</h3>
                <p className="text-gray-600 mb-4">
                  Enter any customer query to test how the system handles it. The AI will simulate a complete conversation.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <label className="block text-sm font-medium mb-2">Customer Query</label>
                  <textarea
                    value={freeformQuery}
                    onChange={(e) => setFreeformQuery(e.target.value)}
                    placeholder="e.g., 'I scanned a receipt 3 days ago but still haven't received my points'"
                    className="w-full px-4 py-3 border rounded-lg resize-none h-24"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <button
                    onClick={() => setFreeformQuery("I can't find my referral code")}
                    className="p-3 bg-white border rounded-lg hover:bg-gray-50 text-left"
                  >
                    <p className="font-medium text-sm">Referral Issue</p>
                    <p className="text-xs text-gray-600 mt-1">Can't find referral code</p>
                  </button>
                  <button
                    onClick={() => setFreeformQuery("My points disappeared from my account")}
                    className="p-3 bg-white border rounded-lg hover:bg-gray-50 text-left"
                  >
                    <p className="font-medium text-sm">Missing Points</p>
                    <p className="text-xs text-gray-600 mt-1">Points disappeared</p>
                  </button>
                  <button
                    onClick={() => setFreeformQuery("How do I connect my email for eReceipts?")}
                    className="p-3 bg-white border rounded-lg hover:bg-gray-50 text-left"
                  >
                    <p className="font-medium text-sm">eReceipt Help</p>
                    <p className="text-xs text-gray-600 mt-1">Email connection</p>
                  </button>
                </div>

                <button
                  onClick={startFreeformConversation}
                  disabled={isFreeformRunning || !freeformQuery.trim()}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                    !freeformQuery.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isFreeformRunning ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Running Conversation...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5" />
                      Start Freeform Conversation
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Monitor Tab */}
          {activeTab === 'monitor' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Active Tests</h3>
              {activeTests.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg mb-6">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No active tests running</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {activeTests.map(test => (
                    <div key={test.id} className="border rounded-lg bg-white">
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleTestExpansion(test.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              test.status === 'completed' ? 'bg-green-100' :
                              test.status === 'running' ? 'bg-yellow-100' :
                              'bg-gray-100'
                            }`}>
                              {test.status === 'completed' ? 
                                <CheckCircle className="w-5 h-5 text-green-600" /> :
                                test.status === 'running' ?
                                <Activity className="w-5 h-5 text-yellow-600 animate-pulse" /> :
                                <Clock className="w-5 h-5 text-gray-600" />
                              }
                            </div>
                            <div>
                              <p className="font-semibold">{test.id}</p>
                              <p className="text-xs text-gray-600">
                                Type: {test.type} | Started: {new Date(test.startTime).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {test.results && (
                              <div className="flex gap-4">
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Success Rate</p>
                                  <p className="font-bold text-lg">
                                    {test.type === 'freeform' ? 
                                      (test.results.resolved ? '100%' : '0%') :
                                      `${(test.results.successRate * 100).toFixed(0)}%`
                                    }
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">
                                    {test.type === 'freeform' ? 'Turns' : 'Conversations'}
                                  </p>
                                  <p className="font-bold text-lg">
                                    {test.type === 'freeform' ? test.results.totalTurns : 
                                     `${test.results.successful}/${test.results.totalConversations}`}
                                  </p>
                                </div>
                              </div>
                            )}
                            {expandedTests.has(test.id) ? 
                              <ChevronUp className="w-5 h-5 text-gray-400" /> :
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            }
                          </div>
                        </div>
                      </div>
                      
                      {expandedTests.has(test.id) && (
                        <div className="px-4 pb-4 border-t">
                          <div className="mt-4">
                            {test.config && (
                              <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Mode</p>
                                  <p className="font-medium">{test.config.useOpenAI ? 'AI-Powered' : 'Mock'}</p>
                                </div>
                                {test.type === 'fetch' && (
                                  <>
                                    <div className="bg-gray-50 p-3 rounded">
                                      <p className="text-xs text-gray-500">Categories</p>
                                      <p className="font-medium">{test.config.categories?.length || 0}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded">
                                      <p className="text-xs text-gray-500">Max Turns</p>
                                      <p className="font-medium">{test.config.maxTurns}</p>
                                    </div>
                                  </>
                                )}
                                {test.type === 'freeform' && test.initialQuery && (
                                  <div className="col-span-2 bg-gray-50 p-3 rounded">
                                    <p className="text-xs text-gray-500">Initial Query</p>
                                    <p className="font-medium text-sm">{test.initialQuery}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {test.status === 'running' && test.id !== currentTestId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  connectToLogs(test.id);
                                }}
                                className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium"
                              >
                                View Live Logs
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Live Test Logs
                  {currentTestId && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({currentTestId})
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="px-3 py-1 text-sm border rounded"
                  >
                    <option value="all">All Logs</option>
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                  {logs.length > 0 && (
                    <button
                      onClick={downloadLogs}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Activity className="w-8 h-8 mb-2" />
                    <p>No logs to display</p>
                    {logFilter !== 'all' && (
                      <p className="text-xs mt-1">Try changing the filter</p>
                    )}
                  </div>
                ) : (
                  filteredLogs.map((log, index) => (
                    <div key={index} className="mb-1 hover:bg-gray-800 px-1 rounded">
                      <span className="text-gray-500">[{log.timestamp}]</span>
                      <span className={`ml-2 font-semibold ${getLogColor(log.level)}`}>
                        [{log.level.toUpperCase().padEnd(7)}]
                      </span>
                      <span className="ml-2 text-gray-100">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
              
              {logs.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-blue-600 font-medium">Info</p>
                    <p className="text-xl font-bold text-blue-900">
                      {logs.filter(l => l.level === 'info').length}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600 font-medium">Success</p>
                    <p className="text-xl font-bold text-green-900">
                      {logs.filter(l => l.level === 'success').length}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded">
                    <p className="text-xs text-yellow-600 font-medium">Warning</p>
                    <p className="text-xl font-bold text-yellow-900">
                      {logs.filter(l => l.level === 'warning').length}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <p className="text-xs text-red-600 font-medium">Error</p>
                    <p className="text-xl font-bold text-red-900">
                      {logs.filter(l => l.level === 'error').length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Test Reports</h3>
              
              {reports.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No reports available</p>
                  <p className="text-sm text-gray-400 mt-1">Run tests to generate reports</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report, index) => (
                    <div 
                      key={index} 
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedReport(selectedReport?.testId === report.testId ? null : report)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{report.testId || report.conversationId}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(report.startTime).toLocaleString()}
                          </p>
                          <div className="flex gap-4 mt-2">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              Type: {report.type || 'fetch'}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Duration: {report.duration}s
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {report.summary ? (
                            <>
                              <p className="text-2xl font-bold text-green-600">
                                {report.summary.successRate}
                              </p>
                              <p className="text-xs text-gray-500">Success Rate</p>
                            </>
                          ) : report.resolved !== undefined ? (
                            <div className="flex flex-col items-center">
                              {report.resolved ? 
                                <CheckCircle className="w-8 h-8 text-green-600" /> :
                                <XCircle className="w-8 h-8 text-red-600" />
                              }
                              <p className="text-xs text-gray-500 mt-1">
                                {report.turnCount} turns
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      
                      {selectedReport?.testId === report.testId && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {report.summary ? (
                              <>
                                <div>
                                  <p className="text-xs text-gray-500">Total Tests</p>
                                  <p className="font-bold text-lg">{report.summary.totalTests}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Passed</p>
                                  <p className="font-bold text-lg text-green-600">{report.summary.passed}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Failed</p>
                                  <p className="font-bold text-lg text-red-600">{report.summary.failed}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Log Count</p>
                                  <p className="font-bold text-lg">{report.logCount}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <p className="text-xs text-gray-500">Type</p>
                                  <p className="font-bold">{report.type || 'Freeform'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Turns</p>
                                  <p className="font-bold">{report.turnCount}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Status</p>
                                  <p className="font-bold">{report.resolved ? 'Resolved' : 'Unresolved'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Duration</p>
                                  <p className="font-bold">{report.duration}s</p>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {report.configuration && (
                            <div className="bg-gray-50 p-3 rounded mb-4">
                              <p className="text-sm font-medium mb-2">Configuration</p>
                              <div className="text-xs space-y-1">
                                <p>Mode: {report.configuration.useOpenAI ? 'AI-Powered' : 'Mock'}</p>
                                {report.configuration.categories && (
                                  <p>Categories: {report.configuration.categories.join(', ')}</p>
                                )}
                                <p>Max Turns: {report.configuration.maxTurns}</p>
                              </div>
                            </div>
                          )}
                          
                          {report.initialQuery && (
                            <div className="bg-blue-50 p-3 rounded">
                              <p className="text-sm font-medium mb-1">Initial Query</p>
                              <p className="text-sm">{report.initialQuery}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FetchTestDashboard;