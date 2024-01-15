import { useContext, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Layer, Stage, Transformer, Rect } from 'react-konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useTransformer } from '@/hooks/useTransformer';
import { useSelectionRect } from '@/hooks/useSelectionRect';
import { useImageCropTransformer } from '@/hooks/useImageCropTransformer';
import { CanvasComponentByType } from '@/utils/CanvasComponentByType';
import { KonvaContext } from '@/contexts/KonvaContext';
import type { CanvasElement } from '@/utils/types';

import { ImageCropRect } from '@/components/konva/ImageCropRect';

const initialElements: CanvasElement[] = [
  {
    elementId: '1',
    type: 'image',
    imageUrl: 'https://via.placeholder.com/300x500',
    draggable: true,
  },
  {
    elementId: '2',
    type: 'video',
    videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
    draggable: true,
  },
  {
    elementId: '3',
    type: 'text',
    text: 'Some text',
    fill: 'white',
    fontSize: 32,
    align: 'center',
    draggable: true,
  },
];

export function Editor() {
  const { canvasTree, loadCanvasTree } = useCanvasTreeStore();

  const { stageRef, layerRef, transformerRef, selectionRectRef } =
    useContext(KonvaContext);
  const cropTransformerRef = useRef<Konva.Transformer>(null);
  const cropRectRef = useRef<Konva.Rect>(null);

  const { handleSelectNode } = useTransformer({ stageRef, transformerRef });
  const { handleStartSelectionRect } = useSelectionRect({
    stageRef,
    layerRef,
    transformerRef,
    selectionRectRef,
  });
  const { handleStartCroppingImage, handleFinishCroppingImage } =
    useImageCropTransformer({
      transformerRef,
      cropTransformerRef,
      cropRectRef,
    });

  useEffect(() => {
    loadCanvasTree(initialElements);
  }, [loadCanvasTree]);

  return (
    <main>
      <Stage
        style={{ overflow: 'hidden' }}
        width={1440}
        height={815}
        onClick={handleSelectNode}
        onDblClick={handleStartCroppingImage}
        onDblTap={handleStartCroppingImage}
        onMouseDown={(event) => {
          handleStartSelectionRect(event);
          handleFinishCroppingImage(event);
        }}
        onTouchStart={(event) => {
          handleStartSelectionRect(event);
          handleFinishCroppingImage(event);
        }}
        ref={stageRef}
      >
        <Layer ref={layerRef}>
          {canvasTree.map((element) => {
            const { elementId, type, ...props } = element;
            const Component = CanvasComponentByType[type];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return <Component key={elementId} {...(props as any)} />;
          })}
        </Layer>
        <Layer name="controllers">
          {/* Image crop rect */}
          <ImageCropRect ref={cropRectRef} />
          {/* Resize transformer */}
          <Transformer
            flipEnabled={false}
            rotationSnaps={[0, 90, 180, 270]}
            ref={transformerRef}
          />
          {/* Image crop transformer */}
          <Transformer
            rotateEnabled={false}
            keepRatio={false}
            ref={cropTransformerRef}
          />
          {/* Selection rect */}
          <Rect
            fill="rgb(14 165 233 / 0.25)"
            stroke="rgb(14 165 233)"
            strokeWidth={1}
            visible={false}
            ref={selectionRectRef}
          />
        </Layer>
      </Stage>
    </main>
  );
}
