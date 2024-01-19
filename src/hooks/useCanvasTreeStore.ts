import { create, type StoreApi } from 'zustand';

import type {
  CanvasElement,
  CanvasElementWithActions,
  DistributiveOmit,
} from '@/utils/types';

type CanvasTreeState = {
  canvasTree: CanvasElementWithActions[];
  loadCanvasTree: (elements: CanvasElement[]) => void;
  addElement: (element: DistributiveOmit<CanvasElement, 'id'>) => void;
  removeElements: (...elementIds: string[]) => void;
};

function addActionsToElement<TElement extends CanvasElement>(
  initialAttributes: TElement,
  set: StoreApi<CanvasTreeState>['setState']
) {
  return {
    ...initialAttributes,
    saveAttrs: (
      attributes: Partial<DistributiveOmit<TElement, 'elementId' | 'type'>>
    ) => {
      set((state) => ({
        canvasTree: state.canvasTree.map((element) => {
          if (element.id !== initialAttributes.id) {
            return element;
          }

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
