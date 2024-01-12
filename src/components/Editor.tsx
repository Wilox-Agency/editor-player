import { useContext, useRef } from 'react';
import Konva from 'konva';
import { Layer, Stage, Transformer, Rect } from 'react-konva';

import { useTransformer } from '@/hooks/useTransformer';
import { useSelectionRect } from '@/hooks/useSelectionRect';
import { useImageCropTransformer } from '@/hooks/useImageCropTransformer';
import { KonvaContext } from '@/contexts/KonvaContext';

import { Text } from '@/components/konva/Text';
import { Image, Video } from '@/components/konva/Image';
import { ImageCropRect } from '@/components/konva/ImageCropRect';

export function Editor() {
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
          <Image imageUrl="https://via.placeholder.com/300x500" draggable />
          <Video videoUrl="/pexels-han-kaya-13675462 (360p).mp4" draggable />
          <Text
            text="Some text"
            fill="white"
            fontSize={32}
            align="center"
            draggable
          />
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
