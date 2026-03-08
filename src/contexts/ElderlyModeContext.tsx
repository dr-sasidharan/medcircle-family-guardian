import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ElderlyModeContextType {
  elderlyMode: boolean;
  setElderlyMode: (enabled: boolean) => void;
}

const ElderlyModeContext = createContext<ElderlyModeContextType | undefined>(undefined);

export const ElderlyModeProvider = ({ children }: { children: ReactNode }) => {
  const [elderlyMode, setElderlyMode] = useState(() => {
    return localStorage.getItem("medcircle-elderly-mode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("medcircle-elderly-mode", String(elderlyMode));
    if (elderlyMode) {
      document.documentElement.classList.add("elderly-mode");
    } else {
      document.documentElement.classList.remove("elderly-mode");
    }
  }, [elderlyMode]);

  return (
    <ElderlyModeContext.Provider value={{ elderlyMode, setElderlyMode }}>
      {children}
    </ElderlyModeContext.Provider>
  );
};

export const useElderlyMode = () => {
  const ctx = useContext(ElderlyModeContext);
  if (!ctx) throw new Error("useElderlyMode must be used within ElderlyModeProvider");
  return ctx;
};
