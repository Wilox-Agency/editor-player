import { useEffect, useRef } from 'react';
import type Konva from 'konva';
import { Layer, Stage, Transformer, Rect } from 'react-konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import {
  type CanvasStyleStateJson,
  useCanvasStyleStore,
} from '@/hooks/useCanvasStyleStore';
import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { useTransformer } from '@/hooks/useTransformer';
import { useSelectionRect } from '@/hooks/useSelectionRect';
import { useImageCropTransformer } from '@/hooks/useImageCropTransformer';
import { useHoverBorder } from '@/hooks/useHoverBorder';
import { useWindowResize } from '@/hooks/useWindowResize';
import { CanvasComponentByType, saveCanvas } from '@/utils/konva';
import type { CanvasElement } from '@/utils/types';

import { KonvaContextMenu } from '@/components/KonvaContextMenu';
import { ImageCropRect } from '@/components/konva/ImageCropRect';
import { BordersOfSelectedNodes } from '@/components/konva/BordersOfSelectedNodes';
import { KonvaToolbar } from '@/components/KonvaToolbar';

const initialElementsFromStorage = localStorage.getItem(
  '@sophia-slide-editor:canvas-tree'
);
const initialElements: CanvasElement[] = initialElementsFromStorage
  ? (JSON.parse(initialElementsFromStorage) as CanvasElement[])
  : [
      {
        type: 'image',
        draggable: true,
        imageUrl:
          'https://images.squarespace-cdn.com/content/v1/55fc0004e4b069a519961e2d/1442590746571-RPGKIXWGOO671REUNMCB/image-asset.gif',
        id: '65b0d5d0-578b-46b0-b89c-44485b2a42f3',
        x: 355.547569304035,
        y: -4.953555694157842,
        width: 1202.9390760683082,
        height: 1202.9390760683082,
      },
      {
        id: 'a401f182-20c3-4148-b9c6-f1148038b9d5',
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        draggable: true,
        uncroppedImageRect: {
          cropXWithScale: 0,
          cropYWithScale: 0,
          width: 360,
          height: 640,
        },
        x: 0,
        y: 0,
        width: 360,
        height: 640,
        crop: {
          x: 0,
          y: 0,
          width: 360,
          height: 640,
        },
      },
      {
        id: 'b7154603-4d58-4816-8dcb-6df703e13364',
        type: 'text',
        text: 'Redes sociales y\nSalud mental',
        fill: 'rgb(255,255,255)',
        fontSize: 109.156059095869,
        align: 'left',
        draggable: true,
        x: 527.000000000001,
        y: 178.00000000000034,
        width: 699.3434979936185,
        rotation: 0,
        fontStyle: 'bold',
        textDecoration: '',
      },
      {
        type: 'image',
        draggable: true,
        imageUrl:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Square_Yellow.svg/1024px-Square_Yellow.svg.png',
        id: 'fba2512a-97a5-4e8f-b51b-05612c03f5f9',
        x: -379.1237586153761,
        y: 639.8762413846226,
        width: 1090.7336503292045,
        height: 1090.7336503292045,
      },
    ];

const initialCanvasStyleFromStorage = localStorage.getItem(
  '@sophia-slide-editor:canvas-style'
);
const initialCanvasStyle = initialCanvasStyleFromStorage
  ? (JSON.parse(initialCanvasStyleFromStorage) as CanvasStyleStateJson)
  : undefined;

export function Editor() {
  const { canvasTree, loadCanvasTree } = useCanvasTreeStore();
  const { canvasBackgroundColor, loadCanvasStyleFromJson } =
    useCanvasStyleStore();
  const getSelectedNodes = useTransformerSelectionStore(
    (state) => state.getSelectedNodes
  );
  const selectNodes = useTransformerSelectionStore(
    (state) => state.selectNodes
  );

  const {
    stageRef,
    layerRef,
    transformerRef,
    selectionRectRef,
    hoverBorderTransformerRef,
  } = useKonvaRefsStore();
  const cropTransformerRef = useRef<Konva.Transformer>(null);
  const cropRectRef = useRef<Konva.Rect>(null);

  const { handleSelectNode } = useTransformer();
  const { handleStartSelectionRect } = useSelectionRect({
    stageRef,
    layerRef,
    selectionRectRef,
  });
  const {
    handleStartCroppingImage,
    startCroppingImage,
    handleFinishCroppingImage,
  } = useImageCropTransformer({
    cropTransformerRef,
    cropRectRef,
  });
  const { handleHoverStart, handleHoverEnd } = useHoverBorder({
    hoverBorderTransformerRef,
  });

  function handleContextMenu(event: Konva.KonvaEventObject<PointerEvent>) {
    const isTargetSelected = getSelectedNodes().some(
      (node) => node.id() === event.target.id()
    );
    // When the target is not selected, select it
    if (!isTargetSelected) {
      selectNodes([event.target]);
    }
  }

  useEffect(() => {
    loadCanvasTree(initialElements);
    if (initialCanvasStyle) loadCanvasStyleFromJson(initialCanvasStyle);
  }, [loadCanvasStyleFromJson, loadCanvasTree]);

  useWindowResize((width, height) => {
    stageRef.current?.size({ width, height });
  });

  // Add shortcut for saving the canvas
  useEffect(() => {
    function handleSaveShortcut(event: KeyboardEvent) {
      /**
       * @see https://stackoverflow.com/questions/10527983/best-way-to-detect-mac-os-x-or-windows-computers-with-javascript-or-jquery
       */
      const platform =
        'userAgentData' in navigator
          ? (navigator.userAgentData as { platform: string }).platform
          : navigator.platform;
      const isAppleDevice = /(Mac|iPhone|iPod|iPad)/i.test(platform);

      const isMetaPress = isAppleDevice ? event.metaKey : event.ctrlKey;
      const isSaveShortcut = isMetaPress && event.key === 's';

      if (isSaveShortcut) {
        event.preventDefault();
        saveCanvas();
      }
    }

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, []);

  return (
    <main>
      <KonvaContextMenu startCroppingImage={startCroppingImage}>
        <Stage
          style={{
            backgroundColor: canvasBackgroundColor.toString('css'),
            overflow: 'hidden',
          }}
          width={1440}
          height={815}
          tabIndex={0}
          onClick={handleSelectNode}
          onTap={handleSelectNode}
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
          onMouseOver={handleHoverStart}
          onMouseMove={handleHoverStart}
          onMouseOut={handleHoverEnd}
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
            {/* Hover border transformer */}
            <Transformer
              resizeEnabled={false}
              rotateEnabled={false}
              keepRatio={false}
              ref={hoverBorderTransformerRef}
            />
            {/* Borders of selected nodes (and nodes inside selection rect) */}
            <BordersOfSelectedNodes />
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
