"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyService = void 0;
const marked_1 = require("marked");
const cheerio = __importStar(require("cheerio"));
const promises_1 = __importDefault(require("fs/promises"));
const path = __importStar(require("path"));
const loggerService_1 = require("./loggerService");
const databaseService_1 = require("./databaseService");
class PolicyService {
    constructor() {
        this.logger = loggerService_1.LoggerService.getInstance();
        this.wikiContent = new Map();
        this.policyRules = new Map();
        this.contentKeywords = new Set();
        this.initializeDefaultRules();
    }
    static getInstance() {
        if (!PolicyService.instance) {
            PolicyService.instance = new PolicyService();
        }
        return PolicyService.instance;
    }
    async initialize() {
        await this.loadWikiContent();
        await this.loadPolicyRules();
        this.logger.info('Policy service initialized', {
            wikiPages: this.wikiContent.size,
            policyRules: this.policyRules.size,
            keywords: this.contentKeywords.size,
        });
    }
    async loadWikiContent() {
        try {
            const wikiPath = process.env.WIKI_CONTENT_PATH ?? './policies/wiki-content';
            const files = await promises_1.default.readdir(wikiPath, { withFileTypes: true });
            for (const file of files) {
                if (file.isFile() && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
                    const filePath = path.join(wikiPath, file.name);
                    const content = await promises_1.default.readFile(filePath, 'utf-8');
                    const wikiItem = this.parseWikiContent(file.name, content);
                    this.wikiContent.set(wikiItem.id, wikiItem);
                    // Extract keywords for policy matching
                    wikiItem.keywords.forEach((kw) => this.contentKeywords.add(kw.toLowerCase()));
                }
            }
        }
        catch (error) {
            this.logger.warn('Failed to load wiki content', { error });
        }
    }
    parseWikiContent(filename, content) {
        const id = filename.replace(/\.(md|txt)$/i, '');
        // Parse markdown -> HTML -> text
        const htmlContent = marked_1.marked.parse(content); // marked returns string in sync mode
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
    extractKeywords(text) {
        // Simple keyword extraction
        const words = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 3 && !this.isStopWord(w));
        const freq = new Map();
        for (const w of words)
            freq.set(w, (freq.get(w) ?? 0) + 1);
        return Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([w]) => w);
    }
    isStopWord(word) {
        // Convert to Set for O(1) lookups
        const stopWords = new Set([
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
        ]);
        return stopWords.has(word);
    }
    determineCategory(filename, content) {
        const lf = filename.toLowerCase();
        const lc = content.toLowerCase();
        if (lf.includes('billing') || lc.includes('payment'))
            return 'billing';
        if (lf.includes('support') || lc.includes('technical'))
            return 'technical_support';
        if (lf.includes('account') || lc.includes('login'))
            return 'account_management';
        if (lf.includes('product') || lc.includes('feature'))
            return 'product_information';
        if (lf.includes('policy') || lc.includes('terms'))
            return 'policies';
        return 'general';
    }
    async loadPolicyRules() {
        try {
            const db = await databaseService_1.DatabaseService.getInstance().getDatabase();
            const rows = await db.all('SELECT * FROM policy_rules WHERE enabled = 1');
            rows.forEach((row) => {
                const rule = {
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
        }
        catch (error) {
            this.logger.error('Failed to load policy rules from database', { error });
        }
    }
    initializeDefaultRules() {
        const defaultRules = [
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
    async validateMessage(message) {
        const violations = [];
        for (const [, rule] of this.policyRules) {
            if (!rule.enabled)
                continue;
            const v = await this.checkRule(message, rule);
            if (v)
                violations.push(v);
        }
        return violations;
    }
    async checkRule(message, rule) {
        for (const condition of rule.conditions) {
            const v = this.evaluateCondition(message, condition, rule);
            if (v)
                return v;
        }
        return null;
    }
    evaluateCondition(message, condition, rule) {
        let fieldValue;
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
    checkCondition(fieldValue, condition) {
        if (fieldValue === undefined || fieldValue === null)
            return false;
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
    checkContains(fieldValue, searchValues, caseSensitive = false) {
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
    async createRule(rule) {
        const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const now = new Date();
        const newRule = { ...rule, id, createdAt: now, updatedAt: now };
        const db = await databaseService_1.DatabaseService.getInstance().getDatabase();
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
            newRule.enabled ? 1 : 0,
        ]);
        this.policyRules.set(id, newRule);
        this.logger.info(`Created policy rule: ${newRule.name}`, { ruleId: id });
        return newRule;
    }
    async updateRule(id, updates) {
        const existingRule = this.policyRules.get(id);
        if (!existingRule)
            return null;
        const updatedRule = {
            ...existingRule,
            ...updates,
            id,
            updatedAt: new Date(),
        };
        const db = await databaseService_1.DatabaseService.getInstance().getDatabase();
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
            id,
        ]);
        this.policyRules.set(id, updatedRule);
        this.logger.info(`Updated policy rule: ${updatedRule.name}`, { ruleId: id });
        return updatedRule;
    }
    async deleteRule(id) {
        const rule = this.policyRules.get(id);
        if (!rule)
            return false;
        const db = await databaseService_1.DatabaseService.getInstance().getDatabase();
        await db.run('DELETE FROM policy_rules WHERE id = ?', [id]);
        this.policyRules.delete(id);
        this.logger.info(`Deleted policy rule: ${rule.name}`, { ruleId: id });
        return true;
    }
    getAllRules() {
        return Array.from(this.policyRules.values());
    }
    getRule(id) {
        return this.policyRules.get(id);
    }
    getWikiContent() {
        return Array.from(this.wikiContent.values());
    }
    findRelevantWikiContent(query) {
        const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
        const results = [];
        this.wikiContent.forEach((content) => {
            let score = 0;
            // title
            for (const w of queryWords)
                if (content.title.toLowerCase().includes(w))
                    score += 3;
            // keywords
            for (const w of queryWords)
                if (content.keywords.includes(w))
                    score += 2;
            // body
            const body = content.content.toLowerCase();
            for (const w of queryWords)
                if (body.includes(w))
                    score += 1;
            if (score > 0)
                results.push({ content, score });
        });
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((r) => r.content);
    }
    async refreshWikiContent() {
        this.wikiContent.clear();
        this.contentKeywords.clear();
        await this.loadWikiContent();
        this.logger.info('Wiki content refreshed');
    }
}
exports.PolicyService = PolicyService;
