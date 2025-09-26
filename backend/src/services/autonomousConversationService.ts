import OpenAI from 'openai';
import { ForethoughtService } from './forethoughtService';
import { ConversationLog, ConversationMetrics, TestReport } from '../types/conversation';

interface ConversationConfig {
  maxTurns: number;
  conversationCount: number;
  customerPersonas: CustomerPersona[];
}

interface CustomerPersona {
  type: 'frustrated' | 'confused' | 'technical' | 'polite' | 'impatient';
  description: string;
  responseStyle: string;
}

interface ConversationTurn {
  speaker: 'customer' | 'agent';
  message: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    responseTime?: number;
  };
}

export class AutonomousConversationService {
  private openai: OpenAI;
  private forethoughtService: ForethoughtService;
  private conversationLogs: Map<string, ConversationLog> = new Map();
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.forethoughtService = new ForethoughtService();
  }

  /**
   * Run autonomous conversation cycles
   */
  async runConversationCycles(initialPrompt: string, config: ConversationConfig): Promise<TestReport> {
    console.log(`🚀 Starting ${config.conversationCount} autonomous conversation cycles...`);
    
    const report: TestReport = {
      id: `test-${Date.now()}`,
      startTime: new Date(),
      endTime: new Date(),
      totalConversations: config.conversationCount,
      successfulConversations: 0,
      failedConversations: 0,
      averageResponseTime: 0,
      averageTurns: 0,
      conversationLogs: [],
      metrics: {
        intentAccuracy: 0,
        resolutionRate: 0,
        customerSatisfactionScore: 0,
        averageConfidence: 0
      }
    };

    // Generate conversation scenarios based on initial prompt
    const scenarios = await this.generateConversationScenarios(initialPrompt, config.conversationCount);

    for (let i = 0; i < config.conversationCount; i++) {
      console.log(`\n💬 Starting conversation ${i + 1}/${config.conversationCount}`);
      
      try {
        const persona = config.customerPersonas[i % config.customerPersonas.length];
        const scenario = scenarios[i];
        
        const conversationLog = await this.runSingleConversation(
          scenario,
          persona,
          config.maxTurns,
          `conv-${i + 1}`
        );

        this.conversationLogs.set(conversationLog.id, conversationLog);
        report.conversationLogs.push(conversationLog);

        if (conversationLog.resolved) {
          report.successfulConversations++;
        } else {
          report.failedConversations++;
        }

        console.log(`✅ Conversation ${i + 1} completed - ${conversationLog.resolved ? 'RESOLVED' : 'UNRESOLVED'}`);
        
        // Brief pause between conversations
        await this.sleep(1000);
        
      } catch (error) {
        console.error(`❌ Conversation ${i + 1} failed:`, error);
        report.failedConversations++;
      }
    }

    report.endTime = new Date();
    report.metrics = this.calculateMetrics(report.conversationLogs);
    
    console.log(`\n📊 Test Complete: ${report.successfulConversations}/${report.totalConversations} successful`);
    
    return report;
  }

  /**
   * Run a single autonomous conversation
   */
  private async runSingleConversation(
    scenario: string,
    persona: CustomerPersona,
    maxTurns: number,
    conversationId: string
  ): Promise<ConversationLog> {
    const log: ConversationLog = {
      id: conversationId,
      startTime: new Date(),
      endTime: new Date(),
      turns: [],
      resolved: false,
      persona: persona.type,
      scenario,
      metrics: {
        totalTurns: 0,
        averageResponseTime: 0,
        intentAccuracy: 0,
        customerSatisfaction: 0
      }
    };

    let currentMessage = scenario;
    let turnCount = 0;
    let conversationContext = '';

    while (turnCount < maxTurns) {
      turnCount++;
      
      // Customer turn
      const customerTurn: ConversationTurn = {
        speaker: 'customer',
        message: currentMessage,
        timestamp: new Date()
      };
      log.turns.push(customerTurn);
      conversationContext += `Customer: ${currentMessage}\n`;

      console.log(`👤 Customer: ${currentMessage}`);

      // Get Forethought response
      const startTime = Date.now();
      const forethoughtResponse = await this.getForethoughtResponse(currentMessage, conversationId);
      const responseTime = Date.now() - startTime;

      const agentTurn: ConversationTurn = {
        speaker: 'agent',
        message: forethoughtResponse.response,
        timestamp: new Date(),
        metadata: {
          intent: forethoughtResponse.intent,
          confidence: forethoughtResponse.confidence,
          responseTime
        }
      };
      log.turns.push(agentTurn);
      conversationContext += `Agent: ${forethoughtResponse.response}\n`;

      console.log(`🤖 Agent: ${forethoughtResponse.response}`);
      if (forethoughtResponse.intent) {
        console.log(`   Intent: ${forethoughtResponse.intent} (${forethoughtResponse.confidence}% confidence)`);
      }

      // Check if conversation should end
      const shouldEnd = await this.shouldEndConversation(conversationContext, persona);
      if (shouldEnd.shouldEnd) {
        log.resolved = shouldEnd.resolved;
        console.log(`🏁 Conversation ending: ${shouldEnd.reason}`);
        break;
      }

      // Generate next customer message using OpenAI
      currentMessage = await this.generateCustomerResponse(
        conversationContext,
        persona,
        forethoughtResponse.response
      );

      if (!currentMessage || currentMessage.toLowerCase().includes('thank') && currentMessage.toLowerCase().includes('resolved')) {
        log.resolved = true;
        break;
      }
    }

    log.endTime = new Date();
    log.metrics.totalTurns = log.turns.length;
    log.metrics.averageResponseTime = this.calculateAverageResponseTime(log.turns);

    return log;
  }

  /**
   * Get response from Forethought widget
   */
  private async getForethoughtResponse(message: string, sessionId: string): Promise<{
    response: string;
    intent?: string;
    confidence?: number;
  }> {
    try {
      // Use your existing Forethought service
      const response = await this.forethoughtService.sendMessage(message, sessionId);
      
      return {
        response: response.message || response.response || 'I understand your concern. Let me help you with that.',
        intent: response.intent,
        confidence: response.confidence
      };
    } catch (error) {
      console.error('Forethought API error:', error);
      
      // Fallback response
      return {
        response: 'I apologize for any inconvenience. Let me connect you with our support team to resolve this issue.',
        confidence: 50
      };
    }
  }

  /**
   * Generate customer response using OpenAI
   */
  private async generateCustomerResponse(
    conversationContext: string,
    persona: CustomerPersona,
    agentResponse: string
  ): Promise<string> {
    const prompt = `
You are a ${persona.type} customer having a support conversation. Based on the conversation so far and the agent's latest response, generate your next realistic customer message.

Persona: ${persona.description}
Response Style: ${persona.responseStyle}

Conversation so far:
${conversationContext}

Agent just said: ${agentResponse}

Generate a realistic customer response that:
1. Stays in character for a ${persona.type} customer
2. Responds appropriately to the agent's message
3. Either continues the conversation if not satisfied or thanks them if resolved
4. Is 1-2 sentences maximum
5. Uses natural language a real customer would use

Customer response:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      return '';
    }
  }

  /**
   * Generate conversation scenarios based on initial prompt
   */
  private async generateConversationScenarios(initialPrompt: string, count: number): Promise<string[]> {
    const prompt = `
Based on this initial customer support prompt: "${initialPrompt}"

Generate ${count} different realistic customer support scenarios that are similar in nature but with different specific details, contexts, or variations. Each should be a complete customer message that would start a support conversation.

Make them diverse but related to the original theme. Include different:
- Specific details (amounts, dates, items, etc.)
- Urgency levels
- Customer backgrounds
- Problem variations

Format as a numbered list:
1. [scenario]
2. [scenario]
...

Scenarios:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.8,
      });

      const scenarios = completion.choices[0]?.message?.content
        ?.split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(scenario => scenario.length > 10) || [];

      // Fallback if generation fails
      if (scenarios.length < count) {
        const fallbackScenarios = Array(count - scenarios.length).fill(initialPrompt);
        scenarios.push(...fallbackScenarios);
      }

      return scenarios.slice(0, count);
    } catch (error) {
      console.error('Scenario generation error:', error);
      return Array(count).fill(initialPrompt);
    }
  }

  /**
   * Determine if conversation should end
   */
  private async shouldEndConversation(conversationContext: string, persona: CustomerPersona): Promise<{
    shouldEnd: boolean;
    resolved: boolean;
    reason: string;
  }> {
    const prompt = `
Analyze this customer support conversation to determine if it should end and whether the issue was resolved.

Conversation:
${conversationContext}

Customer persona: ${persona.type} - ${persona.description}

Respond with JSON:
{
  "shouldEnd": true/false,
  "resolved": true/false,
  "reason": "brief explanation"
}

The conversation should end if:
- Customer expresses satisfaction/thanks
- Issue appears resolved
- Customer says goodbye
- Conversation is going in circles
- Customer is escalating beyond scope

Consider the customer's persona when determining satisfaction.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.1,
      });

      const response = completion.choices[0]?.message?.content;
      const parsed = JSON.parse(response || '{"shouldEnd": false, "resolved": false, "reason": "continuing"}');
      
      return parsed;
    } catch (error) {
      console.error('End conversation analysis error:', error);
      return { shouldEnd: false, resolved: false, reason: 'analysis failed' };
    }
  }

  /**
   * Calculate comprehensive metrics
   */
  private calculateMetrics(logs: ConversationLog[]): ConversationMetrics {
    const totalLogs = logs.length;
    if (totalLogs === 0) return { intentAccuracy: 0, resolutionRate: 0, customerSatisfactionScore: 0, averageConfidence: 0 };

    const resolvedCount = logs.filter(log => log.resolved).length;
    const totalTurns = logs.reduce((sum, log) => sum + log.turns.length, 0);
    const avgTurns = totalTurns / totalLogs;

    // Calculate confidence scores
    const confidenceScores = logs
      .flatMap(log => log.turns)
      .filter(turn => turn.metadata?.confidence)
      .map(turn => turn.metadata!.confidence!);
    
    const avgConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
      : 0;

    return {
      intentAccuracy: avgConfidence,
      resolutionRate: (resolvedCount / totalLogs) * 100,
      customerSatisfactionScore: (resolvedCount / totalLogs) * 100, // Simplified metric
      averageConfidence: avgConfidence
    };
  }

  private calculateAverageResponseTime(turns: ConversationTurn[]): number {
    const responseTimes = turns
      .filter(turn => turn.metadata?.responseTime)
      .map(turn => turn.metadata!.responseTime!);
    
    return responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get conversation log by ID
   */
  getConversationLog(id: string): ConversationLog | undefined {
    return this.conversationLogs.get(id);
  }

  /**
   * Get all conversation logs
   */
  getAllConversationLogs(): ConversationLog[] {
    return Array.from(this.conversationLogs.values());
  }
}