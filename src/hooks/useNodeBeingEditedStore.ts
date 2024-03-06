import type Konva from 'konva';
import { create } from 'zustand';

import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
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

type SetNodeBeingEditedParam<
  TKeys extends keyof NodeBeingEdited = keyof NodeBeingEdited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = TKeys extends any ? { [TKey in TKeys]: NodeBeingEdited[TKey] } : never;

type NodeBeingEditedStore = State & {
  getNodeBeingEdited: () => Konva.Node | undefined;
  setNodeBeingEdited: (nodeBeingEdited: SetNodeBeingEditedParam) => void;
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

      const textBeingEditedBorderTransformer =
        getTextBeingEditedBorderTransformer();

      const isSettingTextBeingEdited =
        'textBeingEdited' in nodeBeingEdited &&
        nodeBeingEdited.textBeingEdited !== undefined;
      if (!isSettingTextBeingEdited) {
        textBeingEditedBorderTransformer.nodes([]);
        return;
      }

      textBeingEditedBorderTransformer.nodes([
        nodeBeingEdited.textBeingEdited!,
      ]);
    },
  })
);

function getTextBeingEditedBorderTransformer() {
  const transformer =
    useKonvaRefsStore.getState().textBeingEditedBorderTransformerRef.current;
  if (!transformer) {
    throw new Error(
      'Tried to use `textBeingEditedBorderTransformerRef` before it was assigned a value'
    );
  }

  return transformer;
}
