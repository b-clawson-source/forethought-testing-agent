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
export declare const FETCH_PERSONAS: FetchPersona[];
/**
 * Get personas by category
 */
export declare function getPersonasByCategory(category: string): FetchPersona[];
/**
 * Get a random persona for testing
 */
export declare function getRandomPersona(category?: string): FetchPersona;
/**
 * Get test scenarios for each category
 */
export declare const FETCH_TEST_SCENARIOS: {
    missing_points: {
        name: string;
        persona: string;
        expectedResolution: string;
    }[];
    account_management: {
        name: string;
        persona: string;
        expectedResolution: string;
    }[];
    fetch_play: {
        name: string;
        persona: string;
        expectedResolution: string;
    }[];
    rewards_gift_cards: {
        name: string;
        persona: string;
        expectedResolution: string;
    }[];
    receipt_issues: {
        name: string;
        persona: string;
        expectedResolution: string;
    }[];
    ereceipt_scanning: {
        name: string;
        persona: string;
        expectedResolution: string;
    }[];
    referral_issues: {
        name: string;
        persona: string;
        expectedResolution: string;
    }[];
};
//# sourceMappingURL=fetchPersonas.d.ts.map