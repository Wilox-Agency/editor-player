import Konva from 'konva';
import { PropsWithChildren, RefObject, createContext, useRef } from 'react';

type KonvaContextData = {
  stageRef: RefObject<Konva.Stage>;
  layerRef: RefObject<Konva.Layer>;
  transformerRef: RefObject<Konva.Transformer>;
  selectionRectRef: RefObject<Konva.Rect>;
};

export const KonvaContext = createContext({} as KonvaContextData);

type KonvaContextProviderProps = PropsWithChildren;

export function KonvaContextProvider({ children }: KonvaContextProviderProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectionRectRef = useRef<Konva.Rect>(null);

  return (
    <KonvaContext.Provider
      value={{ stageRef, layerRef, transformerRef, selectionRectRef }}
    >
      {children}
    </KonvaContext.Provider>
  );
}
