// Define MSD global interface type for the entire application
declare global {
  interface Window {
    MSD?: {
      getUser: () => { 
        id: string;
        subscription?: string | boolean;
        subscription_type?: string;
        is_subscription_cancelled?: boolean;
        subscription_valid_until?: string;
        has_paid?: boolean;
        [key: string]: any; // Allow for other properties we might not know about
      } | null;
      getToken: () => Promise<{ token: string }>;
      getMsdId: () => Promise<{ msdId: string }>;
      getMsdVisitId: () => Promise<{ msdVisitId: string }>;
      sendAmpEvent: (event: string, data?: any) => void;
      historyReplace: (url: string, options?: { preferAppRouter?: boolean } | { scroll?: boolean }) => void;
      openAuthDialog: (options: {
        isClosable?: boolean;
        shouldVerifyAuth?: boolean;
        shouldVerifyAuthRetrieval?: boolean;
        type?: string;
        onClose?: () => void;
      }) => Promise<void>;
      openSubscriptionDialog: (options: {
        isClosable: boolean;
        shouldVerifySubscriptionRetrieval: boolean;
        type: string;
      }) => Promise<void>;
      historyPush: (url: string, options?: { preferAppRouter?: boolean }) => Promise<void>;
    };
    // Debug utilities
    show_limits_as_for_unsubscribed?: () => void;
    restore_subscription_state?: () => void;
  }
}

// Export empty object to make TypeScript treat this as a module
export {} 