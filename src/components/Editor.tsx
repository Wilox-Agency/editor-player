import { useContext, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Layer, Stage, Transformer, Rect } from 'react-konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useContextMenuStore } from '@/hooks/useContextMenuStore';
import {
  setTransformerAttributes,
  useTransformer,
} from '@/hooks/useTransformer';
import { useSelectionRect } from '@/hooks/useSelectionRect';
import { useImageCropTransformer } from '@/hooks/useImageCropTransformer';
import { KonvaContext } from '@/contexts/KonvaContext';
import { CanvasComponentByType } from '@/utils/konva';
import type { CanvasElement, KonvaNodeWithType } from '@/utils/types';

import { KonvaContextMenu } from '@/components/KonvaContextMenu';
import { ImageCropRect } from '@/components/konva/ImageCropRect';
import { KonvaToolbar } from '@/components/KonvaToolbar';

const initialElementsFromStorage = localStorage.getItem(
  '@sophia-slide-editor:canvas-tree'
);
const initialElements: CanvasElement[] = initialElementsFromStorage
  ? (JSON.parse(initialElementsFromStorage) as CanvasElement[])
  : [
      {
        id: crypto.randomUUID(),
        type: 'image',
        imageUrl: 'https://via.placeholder.com/300x500',
        draggable: true,
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        draggable: true,
      },
      {
        id: crypto.randomUUID(),
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
  const {
    handleStartCroppingImage,
    startCroppingImage,
    handleFinishCroppingImage,
  } = useImageCropTransformer({
    transformerRef,
    cropTransformerRef,
    cropRectRef,
  });

  function handleContextMenu(event: Konva.KonvaEventObject<PointerEvent>) {
    const elementFromStore = canvasTree.find(
      (element) => element.id === event.target.id()
    );

    if (!elementFromStore) {
      useContextMenuStore.setState({ selection: undefined });
      return;
    }

    const transformer = transformerRef.current;
    if (!transformer) return;

    const isTargetSelected = transformer
      .nodes()
      .some((node) => node.id() === event.target.id());
    const isTargetOnlyNodeSelected =
      isTargetSelected && transformer.nodes().length === 1;
    if (!isTargetSelected || isTargetOnlyNodeSelected) {
      // Open the context menu
      useContextMenuStore.setState({
        selection: {
          type: elementFromStore.type,
          node: event.target,
        } as KonvaNodeWithType,
      });
      // Select the clicked node
      setTransformerAttributes(transformer, [event.target]);
      transformer.nodes([event.target]);
      return;
    }

    // When clicking a selected node and there's multiple nodes selected
    useContextMenuStore.setState({ selection: transformer.nodes() });
  }

  useEffect(() => {
    loadCanvasTree(initialElements);
  }, [loadCanvasTree]);

  return (
    <main>
      <KonvaContextMenu startCroppingImage={startCroppingImage}>
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
          onContextMenu={handleContextMenu}
          ref={stageRef}
        >
          <Layer ref={layerRef}>
            {canvasTree.map((element) => {
              const { type, ...props } = element;
              const Component = CanvasComponentByType[type];

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return <Component key={props.id} {...(props as any)} />;
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
      </KonvaContextMenu>

      <KonvaToolbar />
    </main>
  );
}
