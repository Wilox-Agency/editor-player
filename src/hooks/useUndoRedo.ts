import { useEffect } from 'react';
import { create } from 'zustand';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { checkCtrlOrMetaModifier } from '@/utils/input';
import type { CanvasElement, DistributiveOmit, Prettify } from '@/utils/types';

// TODO: Update this type to allow saving changes for multiple elements at once
export type Change<
  TAttributes extends { type: string } = Prettify<
    DistributiveOmit<
      CanvasElement,
      // Omitting the attributes that are not editable
      'id' | 'imageUrl' | 'videoUrl' | 'autoPlay' | 'loop' | 'draggable'
    >
  >
> = TAttributes extends unknown
  ? {
      element: {
        id: string;
        type: TAttributes['type'];
      };
      before: Prettify<Partial<Omit<TAttributes, 'type'>>>;
      after: Prettify<Partial<Omit<TAttributes, 'type'>>>;
    }
  : never;

type State = {
  undoStack: Change[];
  redoStack: Change[];
};

type UndoRedoStore = State & {
  addChange: (change: Change) => void;
  undo: () => void;
  redo: () => void;
};

export const useUndoRedoStore = create<UndoRedoStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  addChange: (change) => {
    set(({ undoStack }) => ({
      // Add the change to the undo stack
      undoStack: [...undoStack, change],
      // Clear the redo stack
      redoStack: [],
    }));
  },
  undo: () => {
    const undoStackShallowCopy = [...get().undoStack];
    const changeToUndo = undoStackShallowCopy.pop();
    if (!changeToUndo) return;

    const { node, canvasElement } = findNodeAndCanvasElement(
      changeToUndo.element.id
    );
    if (!node || !canvasElement) return;

    // Revert the changes
    /* This may also set some attributes that didn't originally exist in the
    node, but that's not a problem because they won't interfere */
    node.setAttrs(changeToUndo.before);
    /* FIXME: Calling `saveAttrs` clears the redo tree by calling `addChange`.
    This can easily be fixed by adding an optional parameter to `saveAttrs` that
    tells that the `addChange` method should not be called */
    canvasElement.saveAttrs(changeToUndo.before);

    set(({ redoStack }) => ({
      // Set the new undo stack without the reverted change
      undoStack: undoStackShallowCopy,
      // Move the reverted change to the redo stack
      redoStack: [...redoStack, changeToUndo],
    }));
  },
  redo: () => {
    const redoStackShallowCopy = [...get().redoStack];
    const changeToRedo = redoStackShallowCopy.pop();
    if (!changeToRedo) return;

    const { node, canvasElement } = findNodeAndCanvasElement(
      changeToRedo.element.id
    );
    if (!node || !canvasElement) return;

    // Reapply the changes
    /* This may also set some attributes that didn't originally exist in the
    node, but that's not a problem because they won't interfere */
    node.setAttrs(changeToRedo.after);
    canvasElement.saveAttrs(changeToRedo.after);

    set(({ undoStack }) => ({
      // Move the reapplied change to the undo stack
      undoStack: [...undoStack, changeToRedo],
      // Set the new redo stack without the reapplied changes
      redoStack: redoStackShallowCopy,
    }));
  },
}));

export function useUndoRedoShortcuts() {
  useEffect(() => {
    function handleUndoRedoShortcuts(event: KeyboardEvent) {
      const hasCtrlOrMetaModifier = checkCtrlOrMetaModifier(event);
      const isUndoShortcut =
        hasCtrlOrMetaModifier && !event.shiftKey && event.key === 'z';
      const isRedoShortcut =
        hasCtrlOrMetaModifier && event.shiftKey && event.key === 'z';

      if (!isUndoShortcut && !isRedoShortcut) return;

      event.preventDefault();
      if (isUndoShortcut) {
        useUndoRedoStore.getState().undo();
      } else if (isRedoShortcut) {
        useUndoRedoStore.getState().redo();
      }
    }

    window.addEventListener('keydown', handleUndoRedoShortcuts);
    return () => window.removeEventListener('keydown', handleUndoRedoShortcuts);
  }, []);
}

function findNodeAndCanvasElement(id: string) {
  const node = useKonvaRefsStore
    .getState()
    .layerRef.current?.getChildren()
    .find((node) => node.id() === id);
  const canvasElement = useCanvasTreeStore
    .getState()
    .canvasTree.find((element) => element.id === id);
  return { node, canvasElement };
}
