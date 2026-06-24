'use client';

import React, { createContext, useContext, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface GlobalLoadingContextType {
  setIsLoading: (loading: boolean) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export const GlobalLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);

  return (
    <GlobalLoadingContext.Provider value={{ setIsLoading: setLoading }}>
      {children}
      {loading && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-mono">Loading...</p>
          </div>
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
};

export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

