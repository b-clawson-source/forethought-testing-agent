import React, { useState, useEffect } from 'react';

const AutonomousTestingDashboard = () => {
  const [initialPrompt, setInitialPrompt] = useState('');
  const [conversationCount, setConversationCount] = useState(10);
  const [maxTurns, setMaxTurns] = useState(15);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [logs, setLogs] = useState([]);

  // Sample prompts for quick testing
  const samplePrompts = [
    "I'm missing points from my last receipt and need help getting them added to my account",
    "My app keeps crashing when I try to scan receipts, can you help me fix this?",
    "I forgot my password and can't log into my account",
    "My receipt was rejected but I think it should have been accepted",
    "I want to redeem my points but don't know how to do it",
    "I referred my friend but haven't received my referral bonus yet"
  ];

  const customerPersonas = [
    {
      type: 'frustrated',
      description: 'Frustrated customer who has been dealing with this issue for a while',
      responseStyle: 'Impatient, direct, uses phrases like "this is ridiculous" or "I need this fixed NOW"'
    },
    {
      type: 'confused',
      description: 'Customer who doesn\'t understand technical terms and needs clear explanations',
      responseStyle: 'Asks clarifying questions, says things like "I don\'t understand" or "what does that mean?"'
    },
    {
      type: 'polite',
      description: 'Courteous customer who is patient and cooperative',
      responseStyle: 'Uses please/thank you, stays calm, expresses appreciation for help'
    },
    {
      type: 'technical',
      description: 'Tech-savvy customer who understands technical details and wants specific information',
      responseStyle: 'Uses technical terminology, asks for specific details, wants root cause explanations'
    },
    {
      type: 'impatient',
      description: 'Busy customer who wants quick solutions and doesn\'t want long explanations',
      responseStyle: 'Short responses, says things like "just tell me how to fix it" or "I don\'t have time for this"'
    }
  ];

  // Start autonomous test
  const startTest = async () => {
    if (!initialPrompt.trim()) {
      alert('Please enter an initial prompt');
      return;
    }

    setIsRunning(true);
    setTestResults(null);
    setLogs([]);

    try {
      const response = await fetch('/api/autonomous-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialPrompt,
          conversationCount,
          maxTurns,
          personas: customerPersonas
        }),
      });

      const data = await response.json();
      
      if (data.testId) {
        setCurrentTest(data.testId);
        addLog(`🚀 Started test ${data.testId} with ${conversationCount} conversations`);
        
        // Poll for results
        pollForResults(data.testId);
      } else {
        throw new Error(data.error || 'Failed to start test');
      }
    } catch (error) {
      console.error('Error starting test:', error);
      addLog(`❌ Error starting test: ${error.message}`);
      setIsRunning(false);
    }
  };

  // Poll for test results
  const pollForResults = async (testId) => {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/autonomous-tests/${testId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setTestResults(data.report);
          setIsRunning(false);
          addLog(`✅ Test completed successfully!`);
          
          // Get detailed report
          const reportResponse = await fetch(`/api/autonomous-tests/${testId}/report`);
          const reportData = await reportResponse.json();
          setTestResults(reportData);
          
        } else if (data.status === 'failed') {
          addLog(`❌ Test failed: ${data.error}`);
          setIsRunning(false);
        } else if (data.status === 'running') {
          attempts++;
          if (attempts < maxAttempts) {
            addLog(`⏳ Test running... (${attempts * 5}s elapsed)`);
            setTimeout(checkStatus, 5000); // Check every 5 seconds
          } else {
            addLog(`⏰ Test timed out after ${maxAttempts * 5} seconds`);
            setIsRunning(false);
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
        addLog(`❌ Error checking status: ${error.message}`);
        setIsRunning(false);
      }
    };

    checkStatus();
  };

  // Add log entry
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message }]);
  };

  // Stop current test
  const stopTest = async () => {
    if (currentTest) {
      try {
        await fetch(`/api/autonomous-tests/${currentTest}`, {
          method: 'DELETE'
        });
        setIsRunning(false);
        addLog(`🛑 Test ${currentTest} stopped`);
      } catch (error) {
        console.error('Error stopping test:', error);
      }
    }
  };

  return (
    <div className="autonomous-testing-dashboard">
      <div className="header">
        <h1>🤖 Autonomous Conversation Testing</h1>
        <p>Generate and run complete conversation cycles automatically using your Forethought database and OpenAI</p>
      </div>

      {/* Configuration Panel */}
      <div className="config-panel">
        <h2>Test Configuration</h2>
        
        <div className="form-group">
          <label htmlFor="initialPrompt">Initial Customer Prompt:</label>
          <textarea
            id="initialPrompt"
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            placeholder="Enter the initial customer message that will be used to generate variations..."
            rows="3"
            disabled={isRunning}
          />
        </div>

        <div className="quick-prompts">
          <label>Quick Sample Prompts:</label>
          <div className="prompt-buttons">
            {samplePrompts.map((prompt, index) => (
              <button
                key={index}
                className="sample-prompt-btn"
                onClick={() => setInitialPrompt(prompt)}
                disabled={isRunning}
              >
                {prompt.substring(0, 50)}...
              </button>
            ))}
          </div>
        </div>

        <div className="config-row">
          <div className="form-group">
            <label htmlFor="conversationCount">Number of Conversations:</label>
            <input
              type="number"
              id="conversationCount"
              value={conversationCount}
              onChange={(e) => setConversationCount(parseInt(e.target.value))}
              min="1"
              max="50"
              disabled={isRunning}
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxTurns">Max Turns per Conversation:</label>
            <input
              type="number"
              id="maxTurns"
              value={maxTurns}
              onChange={(e) => setMaxTurns(parseInt(e.target.value))}
              min="5"
              max="30"
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="personas-info">
          <h3>Customer Personas (Automatically Applied)</h3>
          <div className="personas-grid">
            {customerPersonas.map((persona, index) => (
              <div key={index} className="persona-card">
                <h4>{persona.type.charAt(0).toUpperCase() + persona.type.slice(1)}</h4>
                <p>{persona.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="control-buttons">
          {!isRunning ? (
            <button className="start-btn" onClick={startTest} disabled={!initialPrompt.trim()}>
              🚀 Start Autonomous Test
            </button>
          ) : (
            <button className="stop-btn" onClick={stopTest}>
              🛑 Stop Test
            </button>
          )}
        </div>
      </div>

      {/* Live Logs */}
      <div className="logs-panel">
        <h2>Test Logs</h2>
        <div className="logs-container">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="timestamp">[{log.timestamp}]</span>
              <span className="message">{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="no-logs">No logs yet. Start a test to see live updates.</div>
          )}
        </div>
      </div>

      {/* Results Panel */}
      {testResults && (
        <div className="results-panel">
          <h2>📊 Test Results</h2>
          
          {/* Summary Stats */}
          <div className="summary-stats">
            <div className="stat-card success">
              <h3>Success Rate</h3>
              <div className="stat-value">{testResults.analysis?.summary?.successRate || '0'}%</div>
            </div>
            <div className="stat-card conversations">
              <h3>Total Conversations</h3>
              <div className="stat-value">{testResults.report?.totalConversations || 0}</div>
            </div>
            <div className="stat-card turns">
              <h3>Avg Turns</h3>
              <div className="stat-value">{testResults.analysis?.summary?.averageTurns || '0'}</div>
            </div>
            <div className="stat-card duration">
              <h3>Total Duration</h3>
              <div className="stat-value">{testResults.analysis?.summary?.totalDuration || '0'}s</div>
            </div>
          </div>

          {/* Persona Breakdown */}
          <div className="persona-breakdown">
            <h3>Performance by Persona</h3>
            <div className="persona-stats">
              {Object.entries(testResults.analysis?.personaBreakdown || {}).map(([persona, stats]) => (
                <div key={persona} className="persona-stat">
                  <h4>{persona.charAt(0).toUpperCase() + persona.slice(1)}</h4>
                  <div className="stats">
                    <span>Success: {stats.successRate}%</span>
                    <span>Avg Turns: {stats.averageTurns}</span>
                    <span>Total: {stats.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {testResults.analysis?.recommendations && (
            <div className="recommendations">
              <h3>💡 Recommendations</h3>
              <ul>
                {testResults.analysis.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Conversation Samples */}
          <div className="conversation-samples">
            <h3>📝 Sample Conversations</h3>
            {testResults.report?.conversationLogs?.slice(0, 3).map((log, index) => (
              <div key={index} className="conversation-log">
                <h4>Conversation {index + 1} - {log.persona} ({log.resolved ? '✅ Resolved' : '❌ Unresolved'})</h4>
                <div className="turns">
                  {log.turns.slice(0, 6).map((turn, turnIndex) => (
                    <div key={turnIndex} className={`turn ${turn.speaker}`}>
                      <strong>{turn.speaker === 'customer' ? '👤' : '🤖'}</strong>
                      <span>{turn.message}</span>
                      {turn.metadata?.intent && (
                        <small>Intent: {turn.metadata.intent} ({turn.metadata.confidence}%)</small>
                      )}
                    </div>
                  ))}
                  {log.turns.length > 6 && (
                    <div className="more-turns">... and {log.turns.length - 6} more turns</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .autonomous-testing-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .header h1 {
          color: #2563eb;
          margin-bottom: 10px;
        }

        .config-panel, .logs-panel, .results-panel {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
        }

        .form-group textarea, .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group textarea:focus, .form-group input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .quick-prompts {
          margin-bottom: 20px;
        }

        .prompt-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }

        .sample-prompt-btn {
          padding: 10px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          font-size: 12px;
          transition: background-color 0.2s;
        }

        .sample-prompt-btn:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .config-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .personas-info {
          margin-bottom: 20px;
        }

        .personas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .persona-card {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .persona-card h4 {
          margin: 0 0 8px 0;
          color: #1e40af;
        }

        .persona-card p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }

        .control-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .start-btn, .stop-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .start-btn {
          background: #10b981;
          color: white;
        }

        .start-btn:hover:not(:disabled) {
          background: #059669;
        }

        .start-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .stop-btn {
          background: #ef4444;
          color: white;
        }

        .stop-btn:hover {
          background: #dc2626;
        }

        .logs-container {
          background: #1f2937;
          color: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          max-height: 300px;
          overflow-y: auto;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
        }

        .log-entry {
          margin-bottom: 4px;
        }

        .timestamp {
          color: #9ca3af;
          margin-right: 8px;
        }

        .no-logs {
          color: #6b7280;
          text-align: center;
          padding: 20px;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-card.success {
          background: #dcfce7;
          border: 1px solid #bbf7d0;
        }

        .stat-card.conversations {
          background: #dbeafe;
          border: 1px solid #bfdbfe;
        }

        .stat-card.turns {
          background: #fef3c7;
          border: 1px solid #fed7aa;
        }

        .stat-card.duration {
          background: #f3e8ff;
          border: 1px solid #e9d5ff;
        }

        .stat-card h3 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #374151;
        }

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #111827;
        }

        .persona-breakdown {
          margin-bottom: 24px;
        }

        .persona-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .persona-stat {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .persona-stat h4 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .persona-stat .stats {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .persona-stat .stats span {
          font-size: 13px;
          color: #6b7280;
        }

        .recommendations {
          margin-bottom: 24px;
        }

        .recommendations ul {
          list-style: none;
          padding: 0;
        }

        .recommendations li {
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          color: #991b1b;
        }

        .conversation-samples {
          margin-top: 24px;
        }

        .conversation-log {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .conversation-log h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
        }

        .turns {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .turn {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          border-radius: 6px;
        }

        .turn.customer {
          background: #eff6ff;
          border-left: 3px solid #3b82f6;
        }

        .turn.agent {
          background: #f0fdf4;
          border-left: 3px solid #10b981;
        }

        .turn strong {
          min-width: 20px;
        }

        .turn span {
          flex: 1;
          line-height: 1.5;
        }

        .turn small {
          color: #6b7280;
          font-size: 11px;
          margin-left: 8px;
        }

        .more-turns {
          text-align: center;
          color: #6b7280;
          font-style: italic;
          padding: 8px;
        }

        @media (max-width: 768px) {
          .config-row {
            grid-template-columns: 1fr;
          }
          
          .prompt-buttons {
            grid-template-columns: 1fr;
          }
          
          .summary-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .persona-stats {
            grid-template-columns: 1fr;
          }
        }