import { createContext, useContext, useState, ReactNode } from 'react';

interface PrivacyContextType {
  isValuesCensored: boolean;
  toggleCensorship: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isValuesCensored, setIsValuesCensored] = useState(false);

  const toggleCensorship = () => {
    setIsValuesCensored(prev => !prev);
  };

  return (
    <PrivacyContext.Provider value={{ isValuesCensored, toggleCensorship }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
