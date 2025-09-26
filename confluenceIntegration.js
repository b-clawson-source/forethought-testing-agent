// confluenceIntegration.js - Pull wiki content from Confluence

const axios = require('axios');

class ConfluenceWikiIntegration {
  constructor(config) {
    this.baseUrl = config.baseUrl; // e.g., 'https://your-domain.atlassian.net'
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.spaceKey = config.spaceKey; // Your wiki space key
    
    // Create auth header
    this.auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    
    // Cache for wiki content
    this.wikiCache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  // Get all pages in the support wiki space
  async getAllWikiPages() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/wiki/rest/api/content`,
        {
          params: {
            spaceKey: this.spaceKey,
            type: 'page',
            expand: 'body.storage,metadata.labels',
            limit: 100
          },
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );
      
      return response.data.results;
    } catch (error) {
      console.error('Failed to fetch wiki pages:', error.message);
      throw error;
    }
  }

  // Get specific page by title
  async getPageByTitle(title) {
    // Check cache first
    if (this.wikiCache.has(title)) {
      const cached = this.wikiCache.get(title);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.content;
      }
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/wiki/rest/api/content`,
        {
          params: {
            spaceKey: this.spaceKey,
            title: title,
            expand: 'body.storage,body.view'
          },
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );

      if (response.data.results.length > 0) {
        const content = response.data.results[0];
        
        // Cache the content
        this.wikiCache.set(title, {
          content: content,
          timestamp: Date.now()
        });
        
        return content;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to fetch page "${title}":`, error.message);
      return null;
    }
  }

  // Search wiki for relevant content
  async searchWiki(query) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/wiki/rest/api/content/search`,
        {
          params: {
            cql: `space="${this.spaceKey}" AND text ~ "${query}"`,
            expand: 'body.storage',
            limit: 10
          },
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );
      
      return response.data.results;
    } catch (error) {
      console.error('Wiki search failed:', error.message);
      return [];
    }
  }

  // Parse Confluence storage format to extract policies
  parseConfluenceContent(content) {
    if (!content.body || !content.body.storage) {
      return null;
    }

    const htmlContent = content.body.storage.value;
    
    // Extract different sections (customize based on your wiki structure)
    return {
      title: content.title,
      policies: this.extractPolicies(htmlContent),
      procedures: this.extractProcedures(htmlContent),
      templates: this.extractTemplates(htmlContent),
      escalation: this.extractEscalation(htmlContent)
    };
  }

  // Extract policy sections from HTML
  extractPolicies(html) {
    const policies = {};
    
    // Extract points policies
    const pointsMatch = html.match(/<h2[^>]*>Points.*?<\/h2>(.*?)(?=<h2|$)/si);
    if (pointsMatch) {
      policies.points = this.cleanHtml(pointsMatch[1]);
    }
    
    // Extract receipt policies  
    const receiptMatch = html.match(/<h2[^>]*>Receipt.*?<\/h2>(.*?)(?=<h2|$)/si);
    if (receiptMatch) {
      policies.receipts = this.cleanHtml(receiptMatch[1]);
    }
    
    // Extract account policies
    const accountMatch = html.match(/<h2[^>]*>Account.*?<\/h2>(.*?)(?=<h2|$)/si);
    if (accountMatch) {
      policies.account = this.cleanHtml(accountMatch[1]);
    }
    
    return policies;
  }

  // Extract procedures/workflows
  extractProcedures(html) {
    const procedures = {};
    
    // Look for numbered lists or procedure sections
    const procedureMatches = html.match(/<h3[^>]*>(.*?procedure.*?)<\/h3>(.*?)(?=<h[2-3]|$)/gsi) || [];
    
    procedureMatches.forEach(match => {
      const titleMatch = match.match(/<h3[^>]*>(.*?)<\/h3>/i);
      if (titleMatch) {
        const title = this.cleanHtml(titleMatch[1]).toLowerCase().replace(/\s+/g, '_');
        procedures[title] = this.extractSteps(match);
      }
    });
    
    return procedures;
  }

  // Extract response templates
  extractTemplates(html) {
    const templates = {};
    
    // Look for template sections or quoted text
    const templateMatches = html.match(/<h3[^>]*>.*?template.*?<\/h3>(.*?)(?=<h[2-3]|$)/gsi) || [];
    
    templateMatches.forEach(match => {
      // Extract template name and content
      const nameMatch = match.match(/<h3[^>]*>(.*?)<\/h3>/i);
      if (nameMatch) {
        const name = this.cleanHtml(nameMatch[1]);
        const content = this.cleanHtml(match.replace(/<h3[^>]*>.*?<\/h3>/i, ''));
        templates[name] = content;
      }
    });
    
    // Also look for macro-based templates (Confluence specific)
    const macroTemplates = html.match(/<ac:structured-macro[^>]*ac:name="code"[^>]*>.*?<ac:plain-text-body><!\[CDATA\[(.*?)\]\]><\/ac:plain-text-body>.*?<\/ac:structured-macro>/gs) || [];
    
    macroTemplates.forEach((macro, index) => {
      const content = macro.match(/CDATA\[(.*?)\]\]/s);
      if (content) {
        templates[`template_${index + 1}`] = content[1];
      }
    });
    
    return templates;
  }

  // Extract escalation rules
  extractEscalation(html) {
    const escalation = {
      triggers: [],
      procedures: [],
      contacts: []
    };
    
    // Look for escalation section
    const escalationMatch = html.match(/<h2[^>]*>.*?escalation.*?<\/h2>(.*?)(?=<h2|$)/si);
    
    if (escalationMatch) {
      const content = escalationMatch[1];
      
      // Extract trigger keywords
      const triggerMatch = content.match(/trigger.*?:(.*?)(?=<\/p>|<br|$)/si);
      if (triggerMatch) {
        escalation.triggers = triggerMatch[1].split(',').map(t => t.trim());
      }
      
      // Extract procedures
      escalation.procedures = this.extractSteps(content);
    }
    
    return escalation;
  }

  // Extract numbered steps from HTML
  extractSteps(html) {
    const steps = [];
    
    // Match ordered lists
    const listMatches = html.match(/<ol>(.*?)<\/ol>/gs) || [];
    listMatches.forEach(list => {
      const items = list.match(/<li>(.*?)<\/li>/gs) || [];
      items.forEach(item => {
        steps.push(this.cleanHtml(item));
      });
    });
    
    // Also match numbered paragraphs (1. 2. 3. etc)
    const numberedMatches = html.match(/\d+\.\s*([^<\n]+)/g) || [];
    numberedMatches.forEach(match => {
      steps.push(match.replace(/^\d+\.\s*/, ''));
    });
    
    return steps;
  }

  // Clean HTML tags and entities
  cleanHtml(html) {
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&')  // Replace ampersands
      .replace(/&lt;/g, '<')   // Replace less than
      .replace(/&gt;/g, '>')   // Replace greater than
      .replace(/&quot;/g, '"') // Replace quotes
      .replace(/&#39;/g, "'")  // Replace apostrophes
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  // Load all support policies
  async loadSupportPolicies() {
    console.log('Loading support policies from Confluence...');
    
    const policyPages = [
      'Points and Rewards Policy',
      'Receipt Scanning Guidelines',
      'Account Management Procedures',
      'Customer Response Templates',
      'Escalation Procedures',
      'Troubleshooting Guide',
      'Referral Program Rules'
    ];
    
    const policies = {};
    
    for (const pageTitle of policyPages) {
      const page = await this.getPageByTitle(pageTitle);
      if (page) {
        policies[pageTitle] = this.parseConfluenceContent(page);
        console.log(`✓ Loaded: ${pageTitle}`);
      } else {
        console.log(`✗ Not found: ${pageTitle}`);
      }
    }
    
    return policies;
  }

  // Find relevant policy for a customer issue
  async findRelevantPolicy(customerIssue) {
    // Search wiki for relevant content
    const searchResults = await this.searchWiki(customerIssue);
    
    if (searchResults.length > 0) {
      // Return the most relevant result
      return this.parseConfluenceContent(searchResults[0]);
    }
    
    // Fallback to keyword matching
    const keywords = customerIssue.toLowerCase().split(' ');
    const pages = await this.getAllWikiPages();
    
    for (const page of pages) {
      const title = page.title.toLowerCase();
      if (keywords.some(keyword => title.includes(keyword))) {
        return this.parseConfluenceContent(page);
      }
    }
    
    return null;
  }
}

// Integration with the testing agent
class WikiPoweredTestAgent {
  constructor(confluenceConfig) {
    this.wiki = new ConfluenceWikiIntegration(confluenceConfig);
    this.policies = null;
  }

  async initialize() {
    // Load all policies on startup
    this.policies = await this.wiki.loadSupportPolicies();
    console.log('Wiki policies loaded successfully');
  }

  // Generate response based on wiki content
  async generatePolicyBasedResponse(customerIssue, intent) {
    // Find relevant policy
    const relevantPolicy = await this.wiki.findRelevantPolicy(customerIssue);
    
    if (!relevantPolicy) {
      return "I'm checking our policies to help you with this issue...";
    }
    
    // Use the actual template if available
    if (relevantPolicy.templates && Object.keys(relevantPolicy.templates).length > 0) {
      const template = Object.values(relevantPolicy.templates)[0];
      return this.personalizeTemplate(template, customerIssue);
    }
    
    // Build response from policies
    if (relevantPolicy.policies) {
      const policyText = Object.values(relevantPolicy.policies).join('\n');
      return `Based on our policy: ${policyText.substring(0, 200)}...`;
    }
    
    return "Let me help you with that issue.";
  }

  // Personalize template with customer data
  personalizeTemplate(template, customerIssue) {
    return template
      .replace(/\[CUSTOMER_NAME\]/g, 'valued customer')
      .replace(/\[ISSUE\]/g, customerIssue)
      .replace(/\[DATE\]/g, new Date().toLocaleDateString());
  }

  // Check if escalation is needed based on wiki rules
  shouldEscalate(customerMessage, turnCount) {
    if (!this.policies['Escalation Procedures']) {
      return false;
    }
    
    const escalation = this.policies['Escalation Procedures'].escalation;
    
    // Check for trigger keywords
    const message = customerMessage.toLowerCase();
    for (const trigger of escalation.triggers) {
      if (message.includes(trigger.toLowerCase())) {
        return { escalate: true, reason: `Trigger word: ${trigger}` };
      }
    }
    
    // Check turn count (customize based on your policies)
    if (turnCount > 5) {
      return { escalate: true, reason: 'Maximum turns exceeded' };
    }
    
    return { escalate: false };
  }
}

module.exports = {
  ConfluenceWikiIntegration,
  WikiPoweredTestAgent
};