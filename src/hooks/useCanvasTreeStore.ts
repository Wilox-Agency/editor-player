import { create, type StoreApi } from 'zustand';
import { includeKeys } from 'filter-obj';

import { type Change, useUndoRedoStore } from '@/hooks/useUndoRedo';
import type {
  CanvasElement,
  CanvasElementWithActions,
  DistributiveOmit,
} from '@/utils/types';

type CanvasTreeState = {
  canvasTree: CanvasElementWithActions[];
  loadCanvasTree: (elements: CanvasElement[]) => void;
  /* TODO: Make return type correspond the type of the created element (i.e. the
  type in the `element` parameter) */
  addElement: (element: DistributiveOmit<CanvasElement, 'id'>) => CanvasElement;
  updateElement: (
    id: string,
    attributes: Omit<CanvasElement, 'id' | 'type'>
  ) => void;
  removeElements: (...elementIds: string[]) => void;
};

function addActionsToElement<TElement extends CanvasElement>(
  initialAttributes: TElement,
  set: StoreApi<CanvasTreeState>['setState']
) {
  return {
    ...initialAttributes,
    saveAttrs: (
      attributes: Partial<DistributiveOmit<TElement, 'id' | 'type'>>
    ) => {
      set((state) => ({
        canvasTree: state.canvasTree.map((element) => {
          if (element.id !== initialAttributes.id) {
            return element;
          }

          /* FIXME: When changing multiple elements at once, the changes are
          saved separately. Maybe this can be solved by preventing the change
          from being saved by the components updating their nodes and by adding
          a global listener (don't know if there's one and where it would be) to
          save the changes together. */
          // Add the change to the undo/redo store
          useUndoRedoStore.getState().addChange({
            element: {
              id: element.id,
              type: element.type,
            },
            before: includeKeys(
              element,
              Object.keys(attributes) as (keyof typeof element)[]
            ),
            after: attributes,
          } as Change);

          return { ...element, ...attributes };
        }),
      }));
    },
    remove: () => {
      set((state) => ({
        canvasTree: state.canvasTree.filter((element) => {
          return element.id !== initialAttributes.id;
        }),
      }));
    },
  };
}

export const useCanvasTreeStore = create<CanvasTreeState>((set) => ({
  canvasTree: [],
  loadCanvasTree: (elements) => {
    const elementsWithActions = elements.map((element) => {
      return addActionsToElement(element, set);
    });

    set({ canvasTree: elementsWithActions });
  },
  addElement: (elementWithoutId) => {
    const id = crypto.randomUUID() as string;
    const newElement = addActionsToElement({ ...elementWithoutId, id }, set);

    set((state) => ({
      canvasTree: [...state.canvasTree, newElement],
    }));

    return newElement;
  },
  updateElement: (id, attributes) => {
    set((state) => ({
      canvasTree: state.canvasTree.map((element) => {
        if (element.id !== id) return element;

        return { ...element, ...attributes };
      }),
    }));
  },
  removeElements: (...idsOfElementsToRemove) => {
    set((state) => {
      return {
        canvasTree: state.canvasTree.filter((element) => {
          return !idsOfElementsToRemove.includes(element.id);
        }),
      };
    });
  },
}));
