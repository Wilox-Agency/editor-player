import { createRef } from 'react';
import type Konva from 'konva';
import { create } from 'zustand';

export const useKonvaRefsStore = create(() => ({
  stageRef: createRef<Konva.Stage>(),
  layerRef: createRef<Konva.Layer>(),
  transformerRef: createRef<Konva.Transformer>(),
  selectionRectRef: createRef<Konva.Rect>(),
  hoverBorderTransformerRef: createRef<Konva.Transformer>(),
}));
