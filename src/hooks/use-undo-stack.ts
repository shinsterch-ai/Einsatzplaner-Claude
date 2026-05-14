import { useState, useCallback } from 'react';

export interface MoveAction {
  assignmentId: string;
  previousEmployeeId: string | undefined;
  previousEmployeeName: string | undefined;
  previousDate: Date;
  newEmployeeId: string;
  newEmployeeName: string;
  newDate: Date;
  timestamp: Date;
}

const MAX_UNDO_STACK = 20;

export function useUndoStack() {
  const [undoStack, setUndoStack] = useState<MoveAction[]>([]);

  const pushAction = useCallback((action: Omit<MoveAction, 'timestamp'>) => {
    setUndoStack(prev => {
      const newStack = [...prev, { ...action, timestamp: new Date() }];
      // Keep only the last MAX_UNDO_STACK actions
      if (newStack.length > MAX_UNDO_STACK) {
        return newStack.slice(-MAX_UNDO_STACK);
      }
      return newStack;
    });
  }, []);

  const popAction = useCallback((): MoveAction | undefined => {
    let poppedAction: MoveAction | undefined;
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      poppedAction = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    return poppedAction;
  }, []);

  const clearStack = useCallback(() => {
    setUndoStack([]);
  }, []);

  const canUndo = undoStack.length > 0;
  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1] : undefined;

  return {
    undoStack,
    canUndo,
    lastAction,
    pushAction,
    popAction,
    clearStack,
    undoCount: undoStack.length,
  };
}

