import { marked } from 'marked';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { LoggerService } from './loggerService';
import { DatabaseService } from './databaseService';
import { ConversationMessage, AnalysisIssue } from '../../shared/types/conversation';

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
  field: string; // 'content', 'intent', 'confidence', 'actions', etc.
  operator: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'regex' | 'custom';
  value: any;
  caseSensitive?: boolean;
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  field: string;
  actualValue: any;
  expectedValue: any;
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
      keywords: this.contentKeywords.size
    });
  }

  private async loadWikiContent(): Promise<void> {
    try {
      const wikiPath = process.env.WIKI_CONTENT_PATH || './policies/wiki-content';
      const files = await fs.readdir(wikiPath, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
          const filePath = path.join(wikiPath, file.name);
          const content = await fs.readFile(filePath, 'utf-8');
          
          const wikiItem = this.parseWikiContent(file.name, content);
          this.wikiContent.set(wikiItem.id, wikiItem);
          
          // Extract keywords for policy matching
          wikiItem.keywords.forEach(keyword => this.contentKeywords.add(keyword.toLowerCase()));
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load wiki content', error);
    }
  }

  private parseWikiContent(filename: string, content: string): WikiContent {
    const id = filename.replace(/\.(md|txt)$/, '');
    
    // Parse markdown content
    const htmlContent = marked(content);
    const $ = cheerio.load(htmlContent);
    
    // Extract title (first h1 or use filename)
    const title = $('h1').first().text() || id.replace(/[-_]/g, ' ');
    
    // Extract text content
    const textContent = $.text();
    
    // Extract keywords (simple approach - can be enhanced)
    const keywords = this.extractKeywords(textContent);
    
    // Determine category from filename or content
    const category = this.determineCategory(filename, textContent);
    
    return {
      id,
      title,
      content: textContent,
      category,
      lastModified: new Date(),
      keywords
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    // Get unique words and their frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    return stopWords.includes(word);
  }

  private determineCategory(filename: string, content: string): string {
    const lowerFilename = filename.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    if (lowerFilename.includes('billing') || lowerContent.includes('payment')) return 'billing';
    if (lowerFilename.includes('support') || lowerContent.includes('technical')) return 'technical_support';
    if (lowerFilename.includes('account') || lowerContent.includes('login')) return 'account_management';
    if (lowerFilename.includes('product') || lowerContent.includes('feature')) return 'product_information';
    if (lowerFilename.includes('policy') || lowerContent.includes('terms')) return 'policies';
    
    return 'general';
  }

  private async loadPolicyRules(): Promise<void> {
    try {
      const db = await DatabaseService.getInstance().getDatabase();
      const rows = await db.all('SELECT * FROM policy_rules WHERE enabled = 1');
      
      rows.forEach(row => {
        const rule: PolicyRule = {
          id: row.id,
          name: row.name,
          description: row.description,
          ruleType: row.rule_type,
          conditions: JSON.parse(row.conditions),
          severity: row.severity,
          enabled: row.enabled === 1,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };
        
        this.policyRules.set(rule.id, rule);
      });
    } catch (error) {
      this.logger.error('Failed to load policy rules from database', error);
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
            caseSensitive: false
          }
        ],
        severity: 'critical',
        enabled: true
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
            caseSensitive: false
          }
        ],
        severity: 'high',
        enabled: true
      },
      {
        id: 'intent_confidence_threshold',
        name: 'Intent Confidence Threshold',
        description: 'Intent recognition confidence should be above threshold',
        ruleType: 'intent',
        conditions: [
          {
            field: 'confidence',
            operator: 'greater_than',
            value: 0.6
          }
        ],
        severity: 'medium',
        enabled: true
      },
      {
        id: 'response_time_limit',
        name: 'Response Time Limit',
        description: 'Response time should be under 5 seconds',
        ruleType: 'response_time',
        conditions: [
          {
            field: 'processingTime',
            operator: 'less_than',
            value: 5000
          }
        ],
        severity: 'medium',
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      const fullRule = {
        ...rule,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.policyRules.set(rule.id, fullRule);
    });
  }

  public async validateMessage(message: ConversationMessage): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    
    for (const [ruleId, rule] of this.policyRules) {
      if (!rule.enabled) continue;
      
      const violation = await this.checkRule(message, rule);
      if (violation) {
        violations.push(violation);
      }
    }
    
    return violations;
  }

  private async checkRule(message: ConversationMessage, rule: PolicyRule): Promise<PolicyViolation | null> {
    for (const condition of rule.conditions) {
      const violation = this.evaluateCondition(message, condition, rule);
      if (violation) {
        return violation;
      }
    }
    
    return null;
  }

  private evaluateCondition(message: ConversationMessage, condition: PolicyCondition, rule: PolicyRule): PolicyViolation | null {
    let fieldValue: any;
    
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
        expectedValue: condition.value
      };
    }
    
    return null;
  }

  private checkCondition(fieldValue: any, condition: PolicyCondition): boolean {
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }
    
    switch (condition.operator) {
      case 'contains':
        return this.checkContains(fieldValue, condition.value, condition.caseSensitive);
      
      case 'not_contains':
        return !this.checkContains(fieldValue, condition.value, condition.caseSensitive);
      
      case 'equals':
        return fieldValue === condition.value;
      
      case 'not_equals':
        return fieldValue !== condition.value;
      
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      
      case 'regex':
        const regex = new RegExp(condition.value);
        return regex.test(String(fieldValue));
      
      default:
        return false;
    }
  }

  private checkContains(fieldValue: any, searchValues: any, caseSensitive = false): boolean {
    const text = String(fieldValue);
    const searchText = caseSensitive ? text : text.toLowerCase();
    
    const values = Array.isArray(searchValues) ? searchValues : [searchValues];
    
    return values.some(value => {
      const searchValue = caseSensitive ? String(value) : String(value).toLowerCase();
      return searchText.includes(searchValue);
    });
  }

  // Policy management methods
  public async createRule(rule: Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PolicyRule> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newRule: PolicyRule = {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    // Save to database
    const db = await DatabaseService.getInstance().getDatabase();
    await db.run(`
      INSERT INTO policy_rules (
        id, name, description, rule_type, conditions, severity, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      newRule.id,
      newRule.name,
      newRule.description,
      newRule.ruleType,
      JSON.stringify(newRule.conditions),
      newRule.severity,
      newRule.enabled ? 1 : 0
    ]);
    
    // Add to memory
    this.policyRules.set(id, newRule);
    
    this.logger.info(`Created policy rule: ${newRule.name}`, { ruleId: id });
    return newRule;
  }

  public async updateRule(id: string, updates: Partial<PolicyRule>): Promise<PolicyRule | null> {
    const existingRule = this.policyRules.get(id);
    if (!existingRule) {
      return null;
    }
    
    const updatedRule = {
      ...existingRule,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };
    
    // Update in database
    const db = await DatabaseService.getInstance().getDatabase();
    await db.run(`
      UPDATE policy_rules 
      SET name = ?, description = ?, rule_type = ?, conditions = ?, 
          severity = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      updatedRule.name,
      updatedRule.description,
      updatedRule.ruleType,
      JSON.stringify(updatedRule.conditions),
      updatedRule.severity,
      updatedRule.enabled ? 1 : 0,
      id
    ]);
    
    // Update in memory
    this.policyRules.set(id, updatedRule);
    
    this.logger.info(`Updated policy rule: ${updatedRule.name}`, { ruleId: id });
    return updatedRule;
  }

  public async deleteRule(id: string): Promise<boolean> {
    const rule = this.policyRules.get(id);
    if (!rule) {
      return false;
    }
    
    // Delete from database
    const db = await DatabaseService.getInstance().getDatabase();
    await db.run('DELETE FROM policy_rules WHERE id = ?', [id]);
    
    // Remove from memory
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
    const queryWords = query.toLowerCase().split(/\s+/);
    const results: { content: WikiContent; score: number }[] = [];
    
    this.wikiContent.forEach(content => {
      let score = 0;
      
      // Check title match
      queryWords.forEach(word => {
        if (content.title.toLowerCase().includes(word)) {
          score += 3;
        }
      });
      
      // Check keyword match
      queryWords.forEach(word => {
        if (content.keywords.includes(word)) {
          score += 2;
        }
      });
      
      // Check content match
      queryWords.forEach(word => {
        if (content.content.toLowerCase().includes(word)) {
          score += 1;
        }
      });
      
      if (score > 0) {
        results.push({ content, score });
      }
    });
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(result => result.content);
  }

  public async refreshWikiContent(): Promise<void> {
    this.wikiContent.clear();
    this.contentKeywords.clear();
    await this.loadWikiContent();
    this.logger.info('Wiki content refreshed');
  }
}