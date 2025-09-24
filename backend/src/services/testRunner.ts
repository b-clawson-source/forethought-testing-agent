import { v4 as uuidv4 } from 'uuid';
import { ForethoughtService } from './forethoughtService';
import { LLMService } from './llmService';
import {
  TestConfiguration,
  TestReport,
  ConversationTestResult,
  ConversationTurn
} from '../../../shared/types/testing';

type Tier1Category =
  | 'Missing Points'
  | 'Account Management'
  | 'Fetch Play Apps and Fetch Play Games'
  | 'Rewards and Gift Cards'
  | 'Receipt Issues'
  | 'eReceipt Scanning'
  | 'Referral Issues';

function mapTier1ToWidgetContext(category: Tier1Category): Record<string, string> {
  switch (category) {
    case 'Missing Points':
      return { 'data-ft-Intent-Category': 'Missing Points / Offers', 'data-ft-Workflow-Tag': 'missing_points_receipts' };
    case 'Account Management':
      return { 'data-ft-Intent-Category': 'Account', 'data-ft-Workflow-Tag': 'account' };
    case 'Fetch Play Apps and Fetch Play Games':
      return { 'data-ft-Intent-Category': 'Fetch Play', 'data-ft-Workflow-Tag': 'fetch_play', 'data-ft-is_fetch_play_related': 'true' };
    case 'Rewards and Gift Cards':
      return { 'data-ft-Intent-Category': 'Rewards', 'data-ft-Workflow-Tag': 'rewards' };
    case 'Receipt Issues':
      return { 'data-ft-Intent-Category': 'Rejected Receipt', 'data-ft-Workflow-Tag': 'rejected_receipt' };
    case 'eReceipt Scanning':
      return { 'data-ft-Intent-Category': 'eReceipts', 'data-ft-Workflow-Tag': 'ereceipts' };
    case 'Referral Issues':
      return { 'data-ft-Intent-Category': 'Referrals', 'data-ft-Workflow-Tag': 'referrals' };
    default:
      return { 'data-ft-Intent-Category': 'Other', 'data-ft-Workflow-Tag': 'other' };
  }
}

function buildSampleContext(category: Tier1Category) {
  const now = new Date();
  const iso = now.toISOString();
  const shortId = uuidv4().split('-')[0];
  const stores = ['Walmart', 'CVS', 'Target', 'Kroger', 'Walgreens'];
  const store = stores[Math.floor(Math.random() * stores.length)];
  const total = (Math.random() * 40 + 5).toFixed(2);

  const base: Record<string, string> = {
    'data-ft-UserId': `test-user-${shortId}`,
    'data-ft-ReceiptID': `RCPT-${shortId.toUpperCase()}`,
    'data-ft-Receipt-Date': iso,
    'data-ft-Store-Name': store,
    'data-ft-Total': total
  };

  switch (category) {
    case 'Missing Points':
      return {
        ...base,
        'data-ft-Items-Missing-Points': '1',
        'data-ft-OfferID': 'OFR-PEPSI-BOGO',
        'data-ft-OfferID-Status': 'expected',
        'data-ft-point_pass_category': 'receipt',
        'data-ft-is_receipt_offer_related': 'true',
        'data-ft-Pepsi': 'true',
        'data-ft-Pepsi-Offer-Details': 'Buy 2 Pepsi 12pk, get 1000 points'
      };
    case 'Receipt Issues':
      return { ...base, 'data-ft-ReceiptRejectReason': 'Image too blurry', 'data-ft-Multiple': 'true', 'data-ft-FauxShopIDPresent': 'false' };
    case 'Fetch Play Apps and Fetch Play Games':
      return {
        ...base,
        'data-ft-Game-Name': 'Word Quest',
        'data-ft-Number-of-Game-Tasks-Completed': '2',
        'data-ft-PlaytimeAppName': 'Raid of Realms',
        'data-ft-PlaytimeAppID': 'play-12345',
        'data-ft-is_fetch_play_related': 'true',
        'data-ft-fetch_play_confidence': '0.92'
      };
    case 'eReceipt Scanning':
      return {
        ...base,
        'data-ft-Email': `test${shortId}@gmail.com`,
        'data-ft-Email-Domain': 'Gmail',
        'data-ft-eReceipt-Type': 'Gmail',
        'data-ft-EncodedData': 'ZXhhbXBsZSBiYXNlNjQ=',
        'data-ft-Confirmation-Email-Received': 'true'
      };
    case 'Account Management':
      return { ...base, 'data-ft-Phone': '(555) 555-1212', 'data-ft-Phone-Number-Changed': 'true', 'data-ft-AppVersion': '3.22.4', 'data-ft-Mobile-Platform': 'iOS' };
    case 'Rewards and Gift Cards':
      return { ...base, 'data-ft-UsingReward': 'true', 'data-ft-Redemption-Details': 'Attempted $10 Amazon gift card; PIN not delivered' };
    case 'Referral Issues':
      return { ...base, 'data-ft-Referral-Code': `FR-${shortId.toUpperCase()}`, 'data-ft-Referee-Email-Address': `friend${shortId}@outlook.com`, 'data-ft-Referee-Phone-Number': '555-867-5309' };
    default:
      return base;
  }
}

function maybeSeedInitialUtterance(category: Tier1Category): string | null {
  const useSeed = Math.random() < 0.5;
  if (!useSeed) return null;

  const seeds: Record<Tier1Category, string[]> = {
    'Missing Points': [
      'I purchased four things today but I only got credit for three.',
      'My last receipt from Walmart has two bags on it but points didn’t post for both.',
      'I used an offer but the bonus points never showed up.'
    ],
    'Receipt Issues': [
      'I previously submitted the receipt but was told it was too blurry, I rescanned and now it says duplicate.',
      'The app says my receipt is a duplicate but this is a different trip.',
      'I’m getting an error when I try to scan my receipt.'
    ],
    'Fetch Play Apps and Fetch Play Games': [
      'I’ve downloaded 2 games from the game page but they won’t show up in my game feed or give me rewards.',
      'I completed tasks in a game but the points didn’t track.',
      'My game progress isn’t syncing with Fetch Play.'
    ],
    'eReceipt Scanning': [
      'My eReceipts from Gmail aren’t importing.',
      'I connected email but it still doesn’t scan my online orders.',
      'The app says connected, but no eReceipts show.'
    ],
    'Account Management': [
      'I changed my phone number and can’t get verification codes.',
      'I can’t log in after updating my email.',
      'My account looks locked—can you help?'
    ],
    'Rewards and Gift Cards': [
      'I redeemed a $10 gift card but didn’t receive the code.',
      'The reward link says expired right after I claimed it.',
      'I can’t use my gift card—pin not working.'
    ],
    'Referral Issues': [
      'I referred my friend but neither of us got points.',
      'Where do I enter my referral code?',
      'My friend signed up with my code but it didn’t track.'
    ]
  };

  const list = seeds[category] ?? [];
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

function safeAvg(n: number, d: number): number { return d > 0 ? n / d : 0; }
function last<T>(arr: T[]): T | undefined { return arr[arr.length - 1]; }

export class AutonomousTestRunner {
  private llmService: LLMService;
  private currentTestReport?: TestReport;

  constructor() {
    this.llmService = new LLMService();
  }

  async runTestCycle(config: TestConfiguration): Promise<TestReport> {
    console.log(`Starting test cycle with ${config.numberOfConversations} conversations`);

    const testReport: TestReport = {
      testId: uuidv4(),
      startTime: new Date(),
      endTime: new Date(),
      configuration: config,
      totalConversations: config.numberOfConversations,
      successfulConversations: 0,
      failedConversations: 0,
      successRate: 0,
      averageConversationLength: 0,
      averageResponseTime: 0,
      commonIntents: [],
      errorSummary: [],
      conversations: []
    };

    this.currentTestReport = testReport;

    for (let i = 0; i < config.numberOfConversations; i++) {
      console.log(`\nStarting conversation ${i + 1}/${config.numberOfConversations}`);

      const initialPrompt = await this.generateInitialPrompt(
        config.personaType as Tier1Category,
        i > 0 ? testReport.conversations[i - 1] : undefined
      );

      const widgetContext = {
        ...mapTier1ToWidgetContext(config.personaType as Tier1Category),
        ...buildSampleContext(config.personaType as Tier1Category)
      };

      const result = await this.runSingleConversation(
        initialPrompt,
        config.personaType as Tier1Category,
        config.maxTurnsPerConversation,
        config.delayBetweenTurns,
        widgetContext
      );

      testReport.conversations.push(result);
      if (result.success) testReport.successfulConversations++; else testReport.failedConversations++;

      if (i < config.numberOfConversations - 1) {
        await this.delay(config.delayBetweenConversations);
      }
    }

    testReport.endTime = new Date();
    testReport.successRate = safeAvg(testReport.successfulConversations, testReport.totalConversations);
    testReport.averageConversationLength = this.calculateAverageLength(testReport.conversations);
    testReport.averageResponseTime = this.calculateAverageResponseTime(testReport.conversations);
    testReport.commonIntents = this.extractCommonIntents(testReport.conversations);
    testReport.errorSummary = this.summarizeErrors(testReport.conversations);

    await this.saveTestReport(testReport);
    console.log(`\nTest cycle completed. Success rate: ${(testReport.successRate * 100).toFixed(2)}%`);
    return testReport;
  }

  private async runSingleConversation(
    initialPrompt: string,
    personaType: Tier1Category,
    maxTurns: number,
    delayBetweenTurns: number,
    widgetContext: Record<string, string>
  ): Promise<ConversationTestResult> {
    const sessionId = uuidv4();
    const forethoughtService = new ForethoughtService({ baseContext: widgetContext });

    const result: ConversationTestResult = {
      conversationId: sessionId,
      startTime: new Date(),
      endTime: new Date(),
      totalTurns: 0,
      success: true,
      errors: [],
      metrics: {
        averageResponseTime: 0,
        intentRecognitionAccuracy: 0,
        resolutionAchieved: false
      },
      conversationLog: []
    };

    let currentMessage = initialPrompt;
    let conversationComplete = false;
    let turnCount = 0;
    let totalResponseTime = 0;
    let intentsWithConfidence = 0;
    let intentsCorrectHeuristic = 0;

    while (!conversationComplete && turnCount < maxTurns) {
      const turnStartTime = Date.now();

      try {
        const forethoughtResponse = await forethoughtService.queryKnowledgeBase({
          message: currentMessage,
          sessionId
        });

        const llmResponse = await this.llmService.generateResponse(
          currentMessage,
          forethoughtResponse.response,
          personaType,
          result.conversationLog
        );

        const responseTime = Date.now() - turnStartTime;
        totalResponseTime += responseTime;

        if (forethoughtResponse.intent && (forethoughtResponse.response || '').length > 10) {
          intentsWithConfidence++;
          const expected = (mapTier1ToWidgetContext(personaType)['data-ft-Intent-Category'] || '').toLowerCase();
          if (forethoughtResponse.intent.toLowerCase().includes(expected.split(' ')[0])) {
            intentsCorrectHeuristic++;
          }
        }

        const turn: ConversationTurn = {
          turnNumber: turnCount + 1,
          timestamp: new Date(),
          userMessage: currentMessage,
          forethoughtResponse: forethoughtResponse.response,
          llmResponse: llmResponse.message,
          intent: forethoughtResponse.intent,
          confidence: forethoughtResponse.confidence,
          responseTime
        };

        result.conversationLog.push(turn);
        turnCount++;

        conversationComplete =
          llmResponse.shouldEndConversation ||
          turnCount >= maxTurns ||
          this.isResolutionAchieved(llmResponse.message);

        if (!conversationComplete) {
          currentMessage = await this.llmService.generateNextUserMessage(personaType, result.conversationLog);
          await this.delay(delayBetweenTurns);
        }
      } catch (error: any) {
        const errMsg = error?.message ?? String(error);
        console.error(`Error in turn ${turnCount + 1}:`, errMsg);
        result.errors.push(`Turn ${turnCount + 1}: ${errMsg}`);
        result.success = false;
        conversationComplete = true;
      }
    }

    result.endTime = new Date();
    result.totalTurns = turnCount;
    result.metrics.averageResponseTime = safeAvg(totalResponseTime, turnCount);
    result.metrics.resolutionAchieved = this.isResolutionAchieved(last(result.conversationLog)?.llmResponse);
    result.metrics.intentRecognitionAccuracy = safeAvg(intentsCorrectHeuristic, intentsWithConfidence);

    return result;
  }

  private async generateInitialPrompt(
    personaType: Tier1Category,
    previousConversation?: ConversationTestResult
  ): Promise<string> {
    const prev = previousConversation
      ? `Previous conversation ended with: "${last(previousConversation.conversationLog)?.llmResponse ?? ''}"`
      : '';

    const seeded = maybeSeedInitialUtterance(personaType);
    if (seeded) return seeded;

    return this.llmService.generateInitialPrompt(personaType, prev);
  }

  private isResolutionAchieved(lastMessage?: string): boolean {
    if (!lastMessage) return false;
    const phrases = [
      'resolved', 'thank you', 'that helps', 'problem solved', 'issue fixed',
      'goodbye', 'have a nice day', 'that answers my question', 'all set'
    ];
    const lower = lastMessage.toLowerCase();
    return phrases.some(p => lower.includes(p));
  }

  private calculateAverageLength(conversations: ConversationTestResult[]): number {
    if (!conversations.length) return 0;
    const total = conversations.reduce((sum, c) => sum + (c.totalTurns || 0), 0);
    return safeAvg(total, conversations.length);
  }

  private calculateAverageResponseTime(conversations: ConversationTestResult[]): number {
    if (!conversations.length) return 0;
    const total = conversations.reduce((sum, c) => sum + (c.metrics.averageResponseTime || 0), 0);
    return safeAvg(total, conversations.length);
  }

  private extractCommonIntents(conversations: ConversationTestResult[]): { intent: string; count: number }[] {
    const intentMap = new Map<string, number>();
    conversations.forEach(conv => {
      conv.conversationLog.forEach(turn => {
        const key = (turn.intent || '').trim();
        if (key) intentMap.set(key, (intentMap.get(key) || 0) + 1);
      });
    });
    return Array.from(intentMap.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);
  }

  private summarizeErrors(conversations: ConversationTestResult[]): { error: string; count: number }[] {
    const errorMap = new Map<string, number>();
    conversations.forEach(conv => {
      conv.errors.forEach(e => {
        const key = (e || '').trim();
        if (key) errorMap.set(key, (errorMap.get(key) || 0) + 1);
      });
    });
    return Array.from(errorMap.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);
  }

  private async saveTestReport(report: TestReport): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    const reportsDir = path.join(process.cwd(), 'test-reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const filename = `test-report-${report.testId}-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`Test report saved to: ${filepath}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}