import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider 안에서만 useApp을 사용할 수 있습니다.');
  return context;
}
