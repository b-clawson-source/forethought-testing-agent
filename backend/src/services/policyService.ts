import { marked } from 'marked';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import * as path from 'path';
import { LoggerService } from './loggerService';
import { DatabaseService } from './databaseService';
import { ConversationMessage } from '../../shared/types/conversation';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  ruleType: 'content' | 'intent' | 'action' | 'response_time' | 'custom';
  conditions: PolicyCondition[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyCondition {
  // 'content', 'intent', 'confidence', 'actions', 'processingTime'
  field: string;
  operator:
    | 'contains'
    | 'not_contains'
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'regex'
    | 'custom';
  value: unknown;
  caseSensitive?: boolean;
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  field: string;
  actualValue: unknown;
  expectedValue: unknown;
}

export interface WikiContent {
  id: string;
  title: string;
  content: string;
  category: string;
  lastModified: Date;
  keywords: string[];
}

export class PolicyService {
  private static instance: PolicyService;
  private logger = LoggerService.getInstance();
  private wikiContent: Map<string, WikiContent> = new Map();
  private policyRules: Map<string, PolicyRule> = new Map();
  private contentKeywords = new Set<string>();

  private constructor() {
    this.initializeDefaultRules();
  }

  public static getInstance(): PolicyService {
    if (!PolicyService.instance) {
      PolicyService.instance = new PolicyService();
    }
    return PolicyService.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadWikiContent();
    await this.loadPolicyRules();
    this.logger.info('Policy service initialized', {
      wikiPages: this.wikiContent.size,
      policyRules: this.policyRules.size,
      keywords: this.contentKeywords.size,
    });
  }

  private async loadWikiContent(): Promise<void> {
    try {
      const wikiPath = process.env.WIKI_CONTENT_PATH ?? './policies/wiki-content';
      const files = await fs.readdir(wikiPath, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile() && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
          const filePath = path.join(wikiPath, file.name);
          const content = await fs.readFile(filePath, 'utf-8');

          const wikiItem = this.parseWikiContent(file.name, content);
          this.wikiContent.set(wikiItem.id, wikiItem);

          // Extract keywords for policy matching
          wikiItem.keywords.forEach((kw) => this.contentKeywords.add(kw.toLowerCase()));
        }
      }
    } catch (error: unknown) {
      this.logger.warn('Failed to load wiki content', { error });
    }
  }

  private parseWikiContent(filename: string, content: string): WikiContent {
    const id = filename.replace(/\.(md|txt)$/i, '');

    // Parse markdown -> HTML -> text
    const htmlContent = marked.parse(content) as string; // marked returns string in sync mode
    const $ = cheerio.load(htmlContent);

    // Title (first h1) or derive from filename
    const title = $('h1').first().text() || id.replace(/[-_]/g, ' ');

    // Extract plain text
    const textContent = $.text();

    // Keywords & category
    const keywords = this.extractKeywords(textContent);
    const category = this.determineCategory(filename, textContent);

    return {
      id,
      title,
      content: textContent,
      category,
      lastModified: new Date(),
      keywords,
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !this.isStopWord(w));

    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([w]) => w);
  }

  private isStopWord(word: string): boolean {
    // Convert to Set for O(1) lookups
    const stopWords = new Set([
      'the','and','for','are','but','not','you','all','can','had','her','was','one','our','out','day','get','has','him','his','how','man','new','now','old','see','two','way','who','boy','did','its','let','put','say','she','too','use',
    ]);
    return stopWords.has(word);
  }

  private determineCategory(filename: string, content: string): string {
    const lf = filename.toLowerCase();
    const lc = content.toLowerCase();

    if (lf.includes('billing') || lc.includes('payment')) return 'billing';
    if (lf.includes('support') || lc.includes('technical')) return 'technical_support';
    if (lf.includes('account') || lc.includes('login')) return 'account_management';
    if (lf.includes('product') || lc.includes('feature')) return 'product_information';
    if (lf.includes('policy') || lc.includes('terms')) return 'policies';
    return 'general';
  }

  private async loadPolicyRules(): Promise<void> {
    try {
      const db = await DatabaseService.getInstance().getDatabase();
      const rows = await db.all('SELECT * FROM policy_rules WHERE enabled = 1');

      rows.forEach((row: any) => {
        const rule: PolicyRule = {
          id: row.id,
          name: row.name,
          description: row.description,
          ruleType: row.rule_type,
          conditions: JSON.parse(row.conditions),
          severity: row.severity,
          enabled: row.enabled === 1,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
        this.policyRules.set(rule.id, rule);
      });
    } catch (error: unknown) {
      this.logger.error('Failed to load policy rules from database', { error });
    }
  }

  private initializeDefaultRules(): void {
    const defaultRules: Omit<PolicyRule, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'no_personal_info_request',
        name: 'No Personal Information Requests',
        description: 'Assistant should not ask for sensitive personal information',
        ruleType: 'content',
        conditions: [
          {
            field: 'content',
            operator: 'contains',
            value: ['social security', 'ssn', 'credit card', 'password'],
            caseSensitive: false,
          },
        ],
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'professional_tone',
        name: 'Maintain Professional Tone',
        description: 'Responses should maintain a professional, helpful tone',
        ruleType: 'content',
        conditions: [
          {
            field: 'content',
            operator: 'not_contains',
            value: ['stupid', 'dumb', 'idiot', 'shut up'],
            caseSensitive: false,
          },
        ],
        severity: 'high',
        enabled: true,
      },
      {
        id: 'intent_confidence_threshold',
        name: 'Intent Confidence Threshold',
        description: 'Intent recognition confidence should be above threshold',
        ruleType: 'intent',
        conditions: [
          { field: 'confidence', operator: 'greater_than', value: 0.6 },
        ],
        severity: 'medium',
        enabled: true,
      },
      {
        id: 'response_time_limit',
        name: 'Response Time Limit',
        description: 'Response time should be under 5 seconds',
        ruleType: 'response_time',
        conditions: [
          { field: 'processingTime', operator: 'less_than', value: 5000 },
        ],
        severity: 'medium',
        enabled: true,
      },
    ];

    defaultRules.forEach((rule) => {
      this.policyRules.set(rule.id, {
        ...rule,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  public async validateMessage(message: ConversationMessage): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    for (const [, rule] of this.policyRules) {
      if (!rule.enabled) continue;
      const v = await this.checkRule(message, rule);
      if (v) violations.push(v);
    }

    return violations;
  }

  private async checkRule(
    message: ConversationMessage,
    rule: PolicyRule
  ): Promise<PolicyViolation | null> {
    for (const condition of rule.conditions) {
      const v = this.evaluateCondition(message, condition, rule);
      if (v) return v;
    }
    return null;
  }

  private evaluateCondition(
    message: ConversationMessage,
    condition: PolicyCondition,
    rule: PolicyRule
  ): PolicyViolation | null {
    let fieldValue: unknown;

    // Extract the field value from the message
    switch (condition.field) {
      case 'content':
        fieldValue = message.content;
        break;
      case 'intent':
        fieldValue = message.metadata?.intent;
        break;
      case 'confidence':
        fieldValue = message.metadata?.confidence;
        break;
      case 'actions':
        fieldValue = message.metadata?.actions;
        break;
      case 'processingTime':
        fieldValue = message.metadata?.processingTime;
        break;
      default:
        return null;
    }

    const violates = this.checkCondition(fieldValue, condition);

    if (violates) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `Policy violation: ${rule.description}`,
        field: condition.field,
        actualValue: fieldValue,
        expectedValue: condition.value,
      };
    }

    return null;
  }

  private checkCondition(fieldValue: unknown, condition: PolicyCondition): boolean {
    if (fieldValue === undefined || fieldValue === null) return false;

    switch (condition.operator) {
      case 'contains':
        return this.checkContains(fieldValue, condition.value, condition.caseSensitive);

      case 'not_contains':
        return !this.checkContains(fieldValue, condition.value, condition.caseSensitive);

      case 'equals':
        // shallow equality
        return fieldValue === condition.value;

      case 'not_equals':
        return fieldValue !== condition.value;

      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);

      case 'less_than':
        return Number(fieldValue) < Number(condition.value);

      case 'regex': {
        const pattern = String(condition.value ?? '');
        const flags = condition.caseSensitive ? undefined : 'i';
        const regex = new RegExp(pattern, flags);
        return regex.test(String(fieldValue));
      }

      // 'custom' not implemented here—return false by default
      default:
        return false;
    }
  }

  private checkContains(fieldValue: unknown, searchValues: unknown, caseSensitive = false): boolean {
    const text = String(fieldValue);
    const haystack = caseSensitive ? text : text.toLowerCase();
    const values = Array.isArray(searchValues) ? searchValues : [searchValues];

    return values.some((v) => {
      const needleRaw = String(v);
      const needle = caseSensitive ? needleRaw : needleRaw.toLowerCase();
      return haystack.includes(needle);
    });
  }

  // Policy management methods
  public async createRule(
    rule: Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PolicyRule> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date();

    const newRule: PolicyRule = { ...rule, id, createdAt: now, updatedAt: now };

    const db = await DatabaseService.getInstance().getDatabase();
    await db.run(
      `
      INSERT INTO policy_rules (
        id, name, description, rule_type, conditions, severity, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        newRule.id,
        newRule.name,
        newRule.description,
        newRule.ruleType,
        JSON.stringify(newRule.conditions),
        newRule.severity,
        newRule.enabled ? 1 : 0,
      ]
    );

    this.policyRules.set(id, newRule);
    this.logger.info(`Created policy rule: ${newRule.name}`, { ruleId: id });
    return newRule;
  }

  public async updateRule(id: string, updates: Partial<PolicyRule>): Promise<PolicyRule | null> {
    const existingRule = this.policyRules.get(id);
    if (!existingRule) return null;

    const updatedRule: PolicyRule = {
      ...existingRule,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    const db = await DatabaseService.getInstance().getDatabase();
    await db.run(
      `
      UPDATE policy_rules 
      SET name = ?, description = ?, rule_type = ?, conditions = ?, 
          severity = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [
        updatedRule.name,
        updatedRule.description,
        updatedRule.ruleType,
        JSON.stringify(updatedRule.conditions),
        updatedRule.severity,
        updatedRule.enabled ? 1 : 0,
        id,
      ]
    );

    this.policyRules.set(id, updatedRule);
    this.logger.info(`Updated policy rule: ${updatedRule.name}`, { ruleId: id });
    return updatedRule;
  }

  public async deleteRule(id: string): Promise<boolean> {
    const rule = this.policyRules.get(id);
    if (!rule) return false;

    const db = await DatabaseService.getInstance().getDatabase();
    await db.run('DELETE FROM policy_rules WHERE id = ?', [id]);

    this.policyRules.delete(id);
    this.logger.info(`Deleted policy rule: ${rule.name}`, { ruleId: id });
    return true;
  }

  public getAllRules(): PolicyRule[] {
    return Array.from(this.policyRules.values());
  }

  public getRule(id: string): PolicyRule | undefined {
    return this.policyRules.get(id);
  }

  public getWikiContent(): WikiContent[] {
    return Array.from(this.wikiContent.values());
  }

  public findRelevantWikiContent(query: string): WikiContent[] {
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results: { content: WikiContent; score: number }[] = [];

    this.wikiContent.forEach((content) => {
      let score = 0;

      // title
      for (const w of queryWords) if (content.title.toLowerCase().includes(w)) score += 3;
      // keywords
      for (const w of queryWords) if (content.keywords.includes(w)) score += 2;
      // body
      const body = content.content.toLowerCase();
      for (const w of queryWords) if (body.includes(w)) score += 1;

      if (score > 0) results.push({ content, score });
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((r) => r.content);
  }

  public async refreshWikiContent(): Promise<void> {
    this.wikiContent.clear();
    this.contentKeywords.clear();
    await this.loadWikiContent();
    this.logger.info('Wiki content refreshed');
  }
}