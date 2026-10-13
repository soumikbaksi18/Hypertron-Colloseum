import { createContext, useContext, type ReactNode } from 'react';

import { useConsole } from '../hooks/useConsole';

type ConsoleApi = ReturnType<typeof useConsole>;

const ConsoleContext = createContext<ConsoleApi | null>(null);

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const value = useConsole();
  return (
    <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>
  );
}

export function useConsoleContext(): ConsoleApi {
  const ctx = useContext(ConsoleContext);
  if (!ctx) {
    throw new Error('useConsoleContext must be used inside ConsoleProvider');
  }
  return ctx;
}
