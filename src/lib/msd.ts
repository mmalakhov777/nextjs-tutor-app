/**
 * MSD (MyStylus Dialog) Client Interface
 * 
 * This file provides a typed interface for the global MSD object and utility functions
 * to interact with the subscription system in a consistent way.
 */

// Define the global MSD interface
declare global {
  interface Window {
    MSD?: {
      getUser: () => Promise<{ 
        user?: { 
          subscription?: boolean | string;
          subscription_type?: string;
          is_subscription_cancelled?: boolean;
          subscription_valid_until?: string;
          has_paid?: boolean;
          [key: string]: any;  // Allow for any other properties
        } 
      }>;
      openSubscriptionDialog: (options: {
        isClosable: boolean;
        shouldVerifySubscriptionRetrieval: boolean;
        type: string;
      }) => Promise<void>;
    };
  }
}

// Subscription info interface
export interface SubscriptionInfo {
  hasSubscription: boolean;
  subscriptionType: string;
  subscriptionName: string;
  isSubscriptionCancelled: boolean;
  subscriptionValidUntil: string;
  hasPaid: boolean;
}

/**
 * Check if the user has an active subscription
 * @returns Promise resolving to a boolean indicating if user has a subscription
 */
export async function checkUserSubscription(): Promise<boolean> {
  try {
    console.log('[MSD] Checking user subscription status');
    
    if (typeof window !== 'undefined' && window.MSD) {
      const user = await window.MSD.getUser();
      const hasSubscription = !!user?.user?.subscription;
      
      console.log('[MSD] User has active subscription:', hasSubscription);
      return hasSubscription;
    }
    
    console.log('[MSD] MSD not available, defaulting to no subscription');
    return false;
  } catch (error) {
    console.error('[MSD] Error checking subscription:', error);
    return false;
  }
}

/**
 * Get detailed subscription information
 * @returns Promise resolving to subscription details or null if error
 */
export async function getSubscriptionDetails(): Promise<SubscriptionInfo | null> {
  try {
    console.log('[MSD] Getting subscription details');
    
    if (typeof window !== 'undefined' && window.MSD) {
      const user = await window.MSD.getUser();
      
      if (!user?.user) {
        console.log('[MSD] User data not available');
        return null;
      }
      
      const subscriptionInfo = {
        hasSubscription: !!user.user.subscription,
        subscriptionType: user.user.subscription_type || 'none',
        subscriptionName: typeof user.user.subscription === 'string' ? user.user.subscription : 'none',
        isSubscriptionCancelled: user.user.is_subscription_cancelled || false,
        subscriptionValidUntil: user.user.subscription_valid_until || 'N/A',
        hasPaid: user.user.has_paid || false
      };
      
      console.log('[MSD] Subscription details:', JSON.stringify(subscriptionInfo, null, 2));
      return subscriptionInfo;
    }
    
    console.log('[MSD] MSD not available');
    return null;
  } catch (error) {
    console.error('[MSD] Error getting subscription details:', error);
    return null;
  }
}

/**
 * Open the subscription dialog
 * @param options Dialog options
 * @returns Promise resolving to a boolean indicating if the subscription was successful
 */
export async function openSubscriptionDialog(options: {
  isClosable?: boolean;
  shouldVerifySubscriptionRetrieval?: boolean;
  type?: string;
} = {}): Promise<boolean> {
  try {
    console.log('[MSD] Opening subscription dialog');
    
    if (typeof window !== 'undefined' && window.MSD) {
      await window.MSD.openSubscriptionDialog({
        isClosable: options.isClosable ?? false,
        shouldVerifySubscriptionRetrieval: options.shouldVerifySubscriptionRetrieval ?? true,
        type: options.type ?? "alt2"
      });
      
      // Check subscription status after dialog closes
      const user = await window.MSD.getUser();
      const hasSubscription = !!user?.user?.subscription;
      
      console.log('[MSD] After dialog, user has subscription:', hasSubscription);
      return hasSubscription;
    }
    
    console.log('[MSD] MSD not available for subscription dialog');
    return false;
  } catch (error) {
    console.error('[MSD] Error in subscription dialog flow:', error);
    return false;
  }
}

/**
 * Check if MSD is available in the current environment
 * @returns Boolean indicating if MSD is available
 */
export function isMSDAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.MSD;
}

/**
 * Log MSD availability details for debugging
 */
export function logMSDAvailability(): void {
  console.log('[MSD] Checking MSD availability');
  
  if (typeof window !== 'undefined') {
    console.log('[MSD] Window object available');
    console.log('[MSD] MSD object exists:', !!window.MSD);
    
    if (window.MSD) {
      console.log('[MSD] MSD methods available:', {
        getUser: typeof window.MSD.getUser === 'function',
        openSubscriptionDialog: typeof window.MSD.openSubscriptionDialog === 'function'
      });
    } else {
      console.log('[MSD] MSD object not defined');
    }
  } else {
    console.log('[MSD] Window object not available (server-side rendering)');
  }
}

// Default export for convenient imports
export default {
  checkUserSubscription,
  getSubscriptionDetails,
  openSubscriptionDialog,
  isMSDAvailable,
  logMSDAvailability
}; 