import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, FileText, Activity, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, Users, Package, CreditCard, Receipt, Mail, Share2, Download, Eye, Wifi, WifiOff, MessageSquare, Send, X, ChevronDown, ChevronUp, Filter, Settings } from 'lucide-react';

const FetchTestDashboard = () => {
  const [activeTests, setActiveTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [testConfig, setTestConfig] = useState({
    conversationsPerCategory: 3,
    maxTurns: 10,
    useRealWidget: true,
    delayBetweenTurns: 2000,
    delayBetweenConversations: 3000
  });
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');
  const [logs, setLogs] = useState([]);
  const [currentTestId, setCurrentTestId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [freeformQuery, setFreeformQuery] = useState('');
  const [isFreeformRunning, setIsFreeformRunning] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [expandedTests, setExpandedTests] = useState(new Set());
  
  const logsEndRef = useRef(null);
  const logPollingRef = useRef(null);

  // Category icons mapping
  const categoryIcons = {
    'missing_points': TrendingUp,
    'account_management': Users,
    'fetch_play': Package,
    'rewards_gift_cards': CreditCard,
    'receipt_issues': Receipt,
    'ereceipt_scanning': Mail,
    'referral_issues': Share2,
    'timeline_inquiry': Clock
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
      if (logPollingRef.current) {
        clearInterval(logPollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // FIXED: Use mock categories that align with backend conversation intents
  const fetchCategories = async () => {
    try {
      const mockCategories = [
        { 
          id: 'missing_points', 
          name: 'Missing Points', 
          description: 'Issues with missing or incorrect point credits',
          count: 0
        },
        { 
          id: 'receipt_issues', 
          name: 'Receipt Issues', 
          description: 'Problems with receipt scanning and processing',
          count: 0
        },
        { 
          id: 'account_management', 
          name: 'Account Management', 
          description: 'Account access, password, and profile issues',
          count: 0
        },
        { 
          id: 'rewards_gift_cards', 
          name: 'Rewards & Gift Cards', 
          description: 'Redemption and reward-related queries',
          count: 0
        },
        { 
          id: 'timeline_inquiry', 
          name: 'Timeline Questions', 
          description: 'Questions about resolution timeframes',
          count: 0
        },
        {
          id: 'app_issues',
          name: 'App Issues',
          description: 'Technical problems with the mobile app',
          count: 0
        }
      ];
      
      setCategories(mockCategories);
      setSelectedCategories(['missing_points', 'timeline_inquiry', 'account_management']);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setConnectionStatus('disconnected');
    }
  };

  // FIXED: Uses existing /api/tests/active endpoint  
  const fetchActiveTests = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tests/active');
      const data = await response.json();
      setActiveTests(data.tests || []);
    } catch (error) {
      console.error('Failed to fetch active tests:', error);
    }
  };

  // FIXED: Uses existing /api/tests/reports endpoint
  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tests/reports');
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  // FIXED: Uses autonomous tests endpoint with proper logging
  const startCategoryTest = async () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one category');
      return;
    }

    setIsStartingTest(true);
    setLogs([]);
    
    try {
      const testPrompts = selectedCategories.map(categoryId => ({
        categoryId,
        prompt: getPromptForCategory(categoryId)
      }));

      addLog('info', `Starting tests for ${selectedCategories.length} categories`);

      for (const { categoryId, prompt } of testPrompts) {
        addLog('info', `Starting test for category: ${categoryId}`);
        
        const response = await fetch('http://localhost:3001/api/autonomous-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initialPrompt: prompt,
            conversationCount: testConfig.conversationsPerCategory,
            maxTurns: testConfig.maxTurns
          }),
        });

        const data = await response.json();
        if (data.testId) {
          setCurrentTestId(data.testId);
          addLog('success', `Test started successfully: ${data.testId}`);
          
          // Start polling for logs
          startLogPolling(data.testId);
          setActiveTab('monitor');
        } else {
          addLog('error', `Failed to start test for ${categoryId}: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Failed to start test:', error);
      addLog('error', `Failed to start test: ${error.message}`);
    } finally {
      setIsStartingTest(false);
    }
  };

  // FIXED: Uses /api/conversations/freeform endpoint
  const startFreeformConversation = async () => {
    if (!freeformQuery.trim()) {
      alert('Please enter a query');
      return;
    }

    setIsFreeformRunning(true);
    addLog('info', `Starting freeform conversation: "${freeformQuery}"`);
    
    try {
      const response = await fetch('http://localhost:3001/api/conversations/freeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: freeformQuery,
          maxTurns: testConfig.maxTurns,
          persona: 'polite'
        }),
      });

      const data = await response.json();
      if (data.success) {
        addLog('success', `Freeform conversation started: ${data.conversationId}`);
        addLog('info', `Total turns: ${data.totalTurns}, Resolved: ${data.resolved ? 'Yes' : 'No'}`);
        
        // Display conversation turns
        if (data.messages) {
          data.messages.forEach((msg, index) => {
            const logLevel = msg.role === 'user' ? 'user' : 'bot';
            addLog(logLevel, `${msg.role === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`, msg.metadata);
          });
        }
        
        setActiveTab('monitor');
        setFreeformQuery('');
      } else {
        addLog('error', `Failed to start freeform conversation: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to start freeform conversation:', error);
      addLog('error', `Failed to start freeform conversation: ${error.message}`);
    } finally {
      setIsFreeformRunning(false);
    }
  };

  // FIXED: Polls autonomous test logs instead of EventSource
  const startLogPolling = (testId) => {
    if (logPollingRef.current) {
      clearInterval(logPollingRef.current);
    }

    const pollLogs = async () => {
      try {
        // First check test status
        const statusResponse = await fetch(`http://localhost:3001/api/autonomous-tests/${testId}`);
        const statusData = await statusResponse.json();
        
        if (statusData.status === 'completed') {
          // Get detailed logs
          const logsResponse = await fetch(`http://localhost:3001/api/autonomous-tests/${testId}/logs`);
          const logsData = await logsResponse.json();
          
          if (logsData.conversationLogs) {
            // Clear existing logs and add new ones
            setLogs(prev => {
              const existingIds = new Set(prev.map(log => log.id));
              const newLogs = [];
              
              logsData.conversationLogs.forEach((conversation, convIndex) => {
                const convId = `conv-${testId}-${convIndex}`;
                if (!existingIds.has(convId)) {
                  newLogs.push({
                    id: convId,
                    timestamp: conversation.startTime,
                    level: 'info',
                    message: `Conversation ${convIndex + 1}/${logsData.totalConversations} started`,
                    category: 'conversation'
                  });
                  
                  conversation.turns.forEach((turn, turnIndex) => {
                    const turnId = `turn-${testId}-${convIndex}-${turnIndex}`;
                    if (!existingIds.has(turnId)) {
                      newLogs.push({
                        id: turnId,
                        timestamp: turn.timestamp,
                        level: turn.speaker === 'customer' ? 'user' : 'bot',
                        message: turn.message,
                        metadata: turn.metadata,
                        category: 'message'
                      });
                    }
                  });
                  
                  const endId = `end-${testId}-${convIndex}`;
                  if (!existingIds.has(endId)) {
                    newLogs.push({
                      id: endId,
                      timestamp: conversation.endTime,
                      level: conversation.resolved ? 'success' : 'warning',
                      message: `Conversation ${convIndex + 1} ${conversation.resolved ? 'resolved' : 'unresolved'}`,
                      category: 'result'
                    });
                  }
                }
              });
              
              return [...prev, ...newLogs];
            });
          }
          
          // Stop polling when complete
          if (statusData.status === 'completed') {
            clearInterval(logPollingRef.current);
            addLog('success', `Test completed! Success rate: ${statusData.report?.metrics?.resolutionRate || 'N/A'}%`);
          }
        } else if (statusData.status === 'running') {
          addLog('info', `Test ${testId} is still running...`);
        } else if (statusData.status === 'failed') {
          addLog('error', `Test ${testId} failed`);
          clearInterval(logPollingRef.current);
        }
      } catch (error) {
        console.error('Error polling logs:', error);
        addLog('error', `Error fetching logs: ${error.message}`);
      }
    };

    // Poll immediately, then every 3 seconds
    pollLogs();
    logPollingRef.current = setInterval(pollLogs, 3000);
  };

  const addLog = (level, message, metadata = null) => {
    const log = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      category: level === 'user' || level === 'bot' ? 'message' : 'system'
    };
    setLogs(prev => [...prev, log]);
  };

  const getPromptForCategory = (categoryId) => {
    const prompts = {
      missing_points: "I'm missing points from my receipt and need help getting them added to my account",
      receipt_issues: "My receipt was rejected but I think it should have been accepted",
      account_management: "I forgot my password and can't log into my account",
      rewards_gift_cards: "I want to redeem my points but don't know how to do it",
      timeline_inquiry: "How long will this take to resolve?",
      app_issues: "My app keeps crashing when I try to scan receipts"
    };
    return prompts[categoryId] || "I need help with my account";
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'messages') return log.level === 'user' || log.level === 'bot';
    if (logFilter === 'system') return !['user', 'bot'].includes(log.level);
    return log.level === logFilter;
  });

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      case 'warning': return AlertCircle;
      case 'user': return Users;
      case 'bot': return MessageSquare;
      default: return Activity;
    }
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'user': return 'text-blue-600 bg-blue-50';
      case 'bot': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="text-blue-600" />
              Forethought Testing Agent
            </h1>
            <p className="text-gray-600 mt-2">Autonomous conversation testing with intelligent Forethought responses</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {connectionStatus === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span className="text-sm font-medium capitalize">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'configure', name: 'Configure', icon: Settings },
              { id: 'monitor', name: 'Monitor', icon: Activity },
              { id: 'reports', name: 'Reports', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon || Activity;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Configure Tab */}
      {activeTab === 'configure' && (
        <div className="space-y-6">
          {/* Quick Test Section */}
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Quick Message Test</h2>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={freeformQuery}
                onChange={(e) => setFreeformQuery(e.target.value)}
                placeholder="Enter a customer message to test (e.g., 'Where are my points?')"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && startFreeformConversation()}
              />
              <button
                onClick={startFreeformConversation}
                disabled={isFreeformRunning || !freeformQuery.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 font-medium"
              >
                {isFreeformRunning ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                {isFreeformRunning ? 'Testing...' : 'Test Message'}
              </button>
            </div>
            <div className="text-sm text-gray-600">
              This sends a message directly to the conversation system and shows the intelligent response.
            </div>
          </div>

          {/* Test Configuration */}
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversations per Category
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={testConfig.conversationsPerCategory}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    conversationsPerCategory: parseInt(e.target.value) || 1
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Turns per Conversation
                </label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={testConfig.maxTurns}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    maxTurns: parseInt(e.target.value) || 10
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Use Real Forethought
                </label>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={testConfig.useRealWidget}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      useRealWidget: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {testConfig.useRealWidget ? 'Using intelligent responses' : 'Using mock responses'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Test Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {categories.map((category) => {
                const Icon = categoryIcons[category.id] || MessageSquare;
                const isSelected = selectedCategories.includes(category.id);
                
                return (
                  <div
                    key={category.id}
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(category.id)
                          ? prev.filter(id => id !== category.id)
                          : [...prev, category.id]
                      );
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-1 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} size={20} />
                      <div className="flex-1">
                        <h3 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {category.name}
                        </h3>
                        <p className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                          {category.description}
                        </p>
                        <div className="text-xs text-gray-500 mt-2">
                          Sample: "{getPromptForCategory(category.id)}"
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Selected: {selectedCategories.length} categories, {selectedCategories.length * testConfig.conversationsPerCategory} total conversations
              </div>
              <button
                onClick={startCategoryTest}
                disabled={isStartingTest || selectedCategories.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 font-medium"
              >
                {isStartingTest ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
                {isStartingTest ? 'Starting Tests...' : `Start Tests (${selectedCategories.length} selected)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monitor Tab */}
      {activeTab === 'monitor' && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Test Monitor</h2>
              <div className="flex items-center gap-3">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="all">All Logs</option>
                  <option value="messages">Messages Only</option>
                  <option value="system">System Only</option>
                  <option value="success">Success</option>
                  <option value="error">Errors</option>
                </select>
                <button
                  onClick={() => setLogs([])}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
          
          <div className="h-96 overflow-y-auto p-4 bg-gray-50 font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Activity className="mx-auto mb-3 text-gray-400" size={24} />
                <p>No logs yet. Start a test to see real-time results.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const Icon = getLogIcon(log.level);
                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg ${getLogColor(log.level)} border-l-4 ${
                        log.level === 'success' ? 'border-green-400' :
                        log.level === 'error' ? 'border-red-400' :
                        log.level === 'warning' ? 'border-yellow-400' :
                        log.level === 'user' ? 'border-blue-400' :
                        log.level === 'bot' ? 'border-purple-400' :
                        'border-gray-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon size={16} className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.message}</span>
                            <span className="text-xs opacity-75">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                          {log.metadata && (
                            <div className="mt-2 text-xs opacity-75">
                              {log.metadata.intent && (
                                <span className="mr-4">Intent: {log.metadata.intent}</span>
                              )}
                              {log.metadata.confidence && (
                                <span>Confidence: {log.metadata.confidence}%</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg p-6 border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Test Reports</h2>
          {reports.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FileText className="mx-auto mb-3 text-gray-400" size={24} />
              <p>No reports available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium">Report {index + 1}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Generated: {new Date(report.timestamp || Date.now()).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FetchTestDashboard;