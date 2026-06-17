import { useState, useCallback } from "react";

interface UseShortcutsProps {
  onCommandRun?: (command: string, project?: string) => void;
  delay?: number;
}

export function useShortcuts({ 
  onCommandRun, 
  delay = 1800 
}: UseShortcutsProps = {}) {
  const [running, setRunning] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const runCommand = useCallback((cmd: string, project?: string) => {
    setRunning(cmd);
    setLastCommand(cmd);
    
    if (onCommandRun) {
      onCommandRun(cmd, project);
    }
    
    setTimeout(() => {
      setRunning(null);
    }, delay);
  }, [onCommandRun, delay]);

  const isRunning = useCallback((cmd: string) => {
    return running === cmd;
  }, [running]);

  const reset = useCallback(() => {
    setRunning(null);
    setLastCommand(null);
  }, []);

  return {
    running,
    lastCommand,
    runCommand,
    isRunning,
    reset,
  };
}