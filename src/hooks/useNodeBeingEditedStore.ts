import type Konva from 'konva';
import { create } from 'zustand';

import type {
  JsUnion,
  Prettify,
  UndefinedProperites,
  UnionToIntersection,
} from '@/utils/types';

type NodeBeingEdited = JsUnion<
  { imageBeingCropped: Konva.Image },
  { textBeingEdited: Konva.Text }
>;

type State = Prettify<
  NodeBeingEdited | UnionToIntersection<UndefinedProperites<NodeBeingEdited>>
>;

type NodeBeingEditedStore = State & {
  getNodeBeingEdited: () => Konva.Node | undefined;
  setNodeBeingEdited: (nodeBeingEdited: State) => void;
};

export const useNodeBeingEditedStore = create<NodeBeingEditedStore>(
  (set, get) => ({
    imageBeingCropped: undefined,
    textBeingEdited: undefined,
    getNodeBeingEdited: () => {
      return get().imageBeingCropped || get().textBeingEdited;
    },
    setNodeBeingEdited: (nodeBeingEdited) => {
      set(nodeBeingEdited);
    },
  })
);
