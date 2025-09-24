export type Tier1Category =
  | 'Missing Points'
  | 'Account Management'
  | 'Fetch Play Apps and Fetch Play Games'
  | 'Rewards and Gift Cards'
  | 'Receipt Issues'
  | 'eReceipt Scanning'
  | 'Referral Issues';

export function mapTier1ToWidgetContext(category: Tier1Category): Record<string, string> {
  switch (category) {
    case 'Missing Points':
      return {
        'data-ft-Intent-Category': 'Missing Points / Offers',
        'data-ft-Workflow-Tag': 'missing_points_receipts'
      };

    case 'Account Management':
      return {
        'data-ft-Intent-Category': 'Account',
        'data-ft-Workflow-Tag': 'account'
      };

    case 'Fetch Play Apps and Fetch Play Games':
      return {
        'data-ft-Intent-Category': 'Fetch Play',
        'data-ft-Workflow-Tag': 'fetch_play'
      };

    case 'Rewards and Gift Cards':
      return {
        'data-ft-Intent-Category': 'Rewards',
        'data-ft-Workflow-Tag': 'rewards'
      };

    case 'Receipt Issues':
      return {
        'data-ft-Intent-Category': 'Rejected Receipt',
        'data-ft-Workflow-Tag': 'rejected_receipt'
      };

    case 'eReceipt Scanning':
      return {
        'data-ft-Intent-Category': 'eReceipts',
        'data-ft-Workflow-Tag': 'ereceipts'
      };

    case 'Referral Issues':
      return {
        'data-ft-Intent-Category': 'Referrals',
        'data-ft-Workflow-Tag': 'referrals'
      };

    default:
      return {
        'data-ft-Intent-Category': 'Other',
        'data-ft-Workflow-Tag': 'other'
      };
  }
}