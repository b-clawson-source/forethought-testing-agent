export interface FetchPersona {
  id: string;
  name: string;
  description: string;
  category: string;
  characteristics: string[];
  initialPrompts: string[];
  expectedBehaviors: string[];
  context: {
    accountAge?: string;
    lifetimePoints?: number;
    recentActivity?: string;
    frustrationLevel: 'low' | 'medium' | 'high';
  };
}

export const FETCH_PERSONAS: FetchPersona[] = [
  // Missing Points Personas
  {
    id: 'missing_points_new',
    name: 'New User - Missing Bonus Points',
    description: 'Recently joined, didn\'t receive sign-up bonus',
    category: 'missing_points',
    characteristics: ['confused', 'eager', 'first-time user'],
    initialPrompts: [
      "I just signed up yesterday but didn't get my 2,000 bonus points yet",
      "My friend referred me and I used their code but no points showed up",
      "I uploaded my first receipt but only got base points, where's my bonus?"
    ],
    expectedBehaviors: [
      'Asks basic questions about how points work',
      'May not understand point calculation',
      'Appreciative when helped'
    ],
    context: {
      accountAge: '1-7 days',
      lifetimePoints: 0,
      frustrationLevel: 'low'
    }
  },
  {
    id: 'missing_points_veteran',
    name: 'Veteran User - Complex Points Issue',
    description: 'Long-time user with specific missing points from offers',
    category: 'missing_points',
    characteristics: ['knowledgeable', 'specific', 'frustrated'],
    initialPrompts: [
      "I bought 3 Pepsi 12-packs for the 3,000 point offer but only got base points",
      "My receipt from Target on 3/15 is missing the bonus points for the Huggies offer",
      "I completed all requirements for the Fetch Dining 10,000 point bonus but it's not showing"
    ],
    expectedBehaviors: [
      'Provides specific receipt IDs and dates',
      'Knows exact point values expected',
      'May escalate if not resolved quickly'
    ],
    context: {
      accountAge: '1+ years',
      lifetimePoints: 250000,
      frustrationLevel: 'high'
    }
  },

  // Account Management Personas
  {
    id: 'account_locked',
    name: 'Locked Account User',
    description: 'Cannot access account, worried about points',
    category: 'account_management',
    characteristics: ['anxious', 'urgent', 'needs reassurance'],
    initialPrompts: [
      "I can't log in, it says my account is locked but I didn't do anything wrong",
      "My phone number changed and now I can't get the verification code",
      "I keep getting an error when I try to sign in, I have 50,000 points in there!"
    ],
    expectedBehaviors: [
      'Emphasizes point balance concerns',
      'May mention upcoming redemption plans',
      'Needs clear steps to resolve'
    ],
    context: {
      accountAge: '6 months',
      lifetimePoints: 75000,
      frustrationLevel: 'high'
    }
  },

  // Fetch Play Personas
  {
    id: 'fetch_play_gamer',
    name: 'Active Fetch Play User',
    description: 'Regular player missing game rewards',
    category: 'fetch_play',
    characteristics: ['detail-oriented', 'persistent', 'tech-savvy'],
    initialPrompts: [
      "I completed level 50 in Solitaire Cash 3 days ago but didn't get my 15,000 points",
      "The Bingo Blitz offer says I completed it but points aren't in my account",
      "I've been playing Mistplay for 2 hours but the playtime isn't tracking"
    ],
    expectedBehaviors: [
      'Has screenshots of completion',
      'Knows exact offer requirements',
      'May have tried troubleshooting already'
    ],
    context: {
      accountAge: '3 months',
      lifetimePoints: 45000,
      frustrationLevel: 'medium'
    }
  },

  // Rewards and Gift Cards Personas
  {
    id: 'rewards_redemption',
    name: 'Ready to Redeem User',
    description: 'Trying to cash out points for gift cards',
    category: 'rewards_gift_cards',
    characteristics: ['excited', 'impatient', 'goal-oriented'],
    initialPrompts: [
      "I tried to redeem for a $25 Amazon card but it's been pending for 24 hours",
      "My Visa reward says delivered but I never got the email",
      "Can I change my reward? I meant to get Target not Walmart"
    ],
    expectedBehaviors: [
      'Checks email/spam frequently',
      'May want expedited delivery',
      'Asks about reward policies'
    ],
    context: {
      accountAge: '4 months',
      lifetimePoints: 30000,
      frustrationLevel: 'medium'
    }
  },

  // Receipt Issues Personas
  {
    id: 'receipt_rejected',
    name: 'Receipt Rejection Frustration',
    description: 'Multiple receipts rejected, doesn't understand why',
    category: 'receipt_issues',
    characteristics: ['frustrated', 'needs education', 'persistent'],
    initialPrompts: [
      "Why does it keep saying my receipt is blurry? I can read it fine",
      "My Costco receipt was rejected but it's a real receipt from today",
      "This is the third time my receipt got rejected, what am I doing wrong?"
    ],
    expectedBehaviors: [
      'May blame the app/system',
      'Needs clear guidance on photo quality',
      'Might threaten to stop using app'
    ],
    context: {
      accountAge: '2 months',
      lifetimePoints: 5000,
      frustrationLevel: 'high'
    }
  },

  // eReceipt Scanning Personas
  {
    id: 'ereceipt_setup',
    name: 'eReceipt Connection Issues',
    description: 'Trying to connect email for automatic scanning',
    category: 'ereceipt_scanning',
    characteristics: ['cautious', 'privacy-conscious', 'needs reassurance'],
    initialPrompts: [
      "I connected my Gmail but no receipts are showing up",
      "Is it safe to give you access to my email? What do you do with it?",
      "My Amazon receipts aren't coming through but other stores work"
    ],
    expectedBehaviors: [
      'Asks about privacy and security',
      'May need technical help with setup',
      'Wants to understand the process'
    ],
    context: {
      accountAge: '1 month',
      lifetimePoints: 3000,
      frustrationLevel: 'low'
    }
  },

  // Referral Issues Personas
  {
    id: 'referral_advocate',
    name: 'Active Referrer Missing Rewards',
    description: 'Referred multiple friends, missing bonuses',
    category: 'referral_issues',
    characteristics: ['social', 'motivated', 'tracking everything'],
    initialPrompts: [
      "I referred 3 friends this week but only got credit for 1",
      "My friend says they used my code but I didn't get the points",
      "How do I prove my friend signed up with my referral code?"
    ],
    expectedBehaviors: [
      'Has friend details ready',
      'Knows referral program rules',
      'May ask about referral limits'
    ],
    context: {
      accountAge: '8 months',
      lifetimePoints: 100000,
      frustrationLevel: 'medium'
    }
  }
];

/**
 * Get personas by category
 */
export function getPersonasByCategory(category: string): FetchPersona[] {
  return FETCH_PERSONAS.filter(p => p.category === category);
}

/**
 * Get a random persona for testing
 */
export function getRandomPersona(category?: string): FetchPersona {
  const personas = category ? getPersonasByCategory(category) : FETCH_PERSONAS;
  return personas[Math.floor(Math.random() * personas.length)];
}

/**
 * Get test scenarios for each category
 */
export const FETCH_TEST_SCENARIOS = {
  missing_points: [
    {
      name: 'Sign-up Bonus Missing',
      persona: 'missing_points_new',
      expectedResolution: 'Verify account creation date, check referral code usage, credit points'
    },
    {
      name: 'Offer Points Not Credited',
      persona: 'missing_points_veteran',
      expectedResolution: 'Review receipt items, verify offer requirements, escalate if needed'
    }
  ],
  account_management: [
    {
      name: 'Account Access Lost',
      persona: 'account_locked',
      expectedResolution: 'Verify identity, update phone/email, unlock account'
    }
  ],
  fetch_play: [
    {
      name: 'Game Completion Not Tracked',
      persona: 'fetch_play_gamer',
      expectedResolution: 'Verify game completion, check tracking delay, credit points manually'
    }
  ],
  rewards_gift_cards: [
    {
      name: 'Reward Delivery Delay',
      persona: 'rewards_redemption',
      expectedResolution: 'Check processing time, verify email, resend if needed'
    }
  ],
  receipt_issues: [
    {
      name: 'Receipt Quality Rejection',
      persona: 'receipt_rejected',
      expectedResolution: 'Provide photo tips, review specific rejection, offer manual review'
    }
  ],
  ereceipt_scanning: [
    {
      name: 'Email Connection Not Syncing',
      persona: 'ereceipt_setup',
      expectedResolution: 'Verify connection status, check email provider, troubleshoot sync'
    }
  ],
  referral_issues: [
    {
      name: 'Referral Credit Missing',
      persona: 'referral_advocate',
      expectedResolution: 'Verify friend signup details, check code usage, credit if valid'
    }
  ]
};