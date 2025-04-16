import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Cookie consent categories
export type ConsentCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

// Interface for consent preferences
export interface ConsentPreferences {
  necessary: boolean; // Always true, can't be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  lastUpdated: number | null;
}

// Default consent state - only necessary cookies enabled by default
const defaultConsentState: ConsentPreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  lastUpdated: null,
};

// Context value interface
interface CookieConsentContextValue {
  consentPreferences: ConsentPreferences;
  isConsentGiven: boolean;
  showConsentBanner: boolean;
  setShowConsentBanner: (show: boolean) => void;
  acceptAllCookies: () => void;
  rejectAllCookies: () => void;
  updateConsentPreferences: (preferences: Partial<Omit<ConsentPreferences, 'necessary' | 'lastUpdated'>>) => void;
  hasConsented: (category: ConsentCategory) => boolean;
  resetConsent: () => void;
}

// Create the context
const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

// Props interface for the provider
interface CookieConsentProviderProps {
  children: ReactNode;
}

// Local storage key
const CONSENT_STORAGE_KEY = 'servicefix_cookie_consent';

export const CookieConsentProvider: React.FC<CookieConsentProviderProps> = ({ children }) => {
  // Initialize state from localStorage if available
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences>(() => {
    if (typeof window !== 'undefined') {
      const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (savedConsent) {
        try {
          return JSON.parse(savedConsent);
        } catch (error) {
          console.error('Error parsing saved cookie consent:', error);
        }
      }
    }
    return defaultConsentState;
  });

  // Check if any consent decision has been made
  const isConsentGiven = consentPreferences.lastUpdated !== null;
  
  // Initialize banner visibility directly based on consent status
  const [showConsentBanner, setShowConsentBanner] = useState<boolean>(!isConsentGiven);

  // Update consent preferences in state and localStorage
  const updateConsentPreferences = (
    newPreferences: ConsentPreferences | Partial<Omit<ConsentPreferences, 'necessary' | 'lastUpdated'>>
  ) => {
    const updatedPreferences: ConsentPreferences = {
      ...consentPreferences,
      ...newPreferences,
      necessary: true, // Always keep necessary cookies enabled
      lastUpdated: Date.now(),
    };

    setConsentPreferences(updatedPreferences);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(updatedPreferences));
    }
    
    // Hide banner after preferences are updated
    setShowConsentBanner(false);
  };

  // Function to reset consent for testing/debugging
  const resetConsent = () => {
    setConsentPreferences(defaultConsentState);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    }
    setShowConsentBanner(true);
  };

  // Accept all cookie categories
  const acceptAllCookies = () => {
    updateConsentPreferences({
      functional: true,
      analytics: true,
      marketing: true,
    });
  };

  // Reject all cookie categories except necessary
  const rejectAllCookies = () => {
    updateConsentPreferences({
      functional: false,
      analytics: false,
      marketing: false,
    });
  };

  // Check if consent has been given for a specific category
  const hasConsented = (category: ConsentCategory): boolean => {
    if (category === 'necessary') return true; // Necessary cookies are always allowed
    return consentPreferences[category];
  };

  // Context value
  const value: CookieConsentContextValue = {
    consentPreferences,
    isConsentGiven,
    showConsentBanner,
    setShowConsentBanner,
    acceptAllCookies,
    rejectAllCookies,
    updateConsentPreferences,
    hasConsented,
    resetConsent
  };

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
};

// Custom hook for using cookie consent context
export const useCookieConsent = (): CookieConsentContextValue => {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}; 