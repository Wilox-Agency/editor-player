import type { ElementType } from 'react';
import { toast } from 'sonner';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useCanvasStyleStore } from '@/hooks/useCanvasStyleStore';
import { LocalStorageKeys } from '@/utils/localStorage';
import type { CanvasElement, CanvasElementOfType } from '@/utils/types';

import { Image, Video } from '@/components/konva/Image';
import { Text } from '@/components/konva/Text';
import { Rect } from '@/components/konva/Rect';

/* The virtual size of the stage will be 1920x1080px, but the real size will be
different to fit the user's page */
export const StageVirtualSize = { width: 1920, height: 1080 } as const;

export const CanvasComponentByType = {
  video: Video,
  image: Image,
  text: Text,
  rect: Rect,
} as const satisfies Record<CanvasElement['type'], ElementType>;

export const CustomKonvaAttributes = {
  unselectable: '_unselectable',
} as const;

export const defaultElementAttributes = {
  video: {
    draggable: true,
  },
  image: {
    draggable: true,
  },
  text: {
    text: 'Text',
    fill: 'rgb(255,255,255)',
    fontSize: 32,
    lineHeight: 1,
    letterSpacing: 0,
    align: 'center',
    draggable: true,
  },
  rect: {
    width: 100,
    height: 100,
    fill: 'rgb(255,255,255)',
    draggable: true,
  },
} as const satisfies {
  [K in CanvasElement['type']]: Partial<
    Omit<CanvasElementOfType<K>, 'id' | 'type'>
  >;
};

export function saveCanvas() {
  const canvasTreeAsString = JSON.stringify(
    useCanvasTreeStore.getState().canvasTree
  );
  const canvasStyleAsString = JSON.stringify(
    useCanvasStyleStore.getState().canvasStyleToJson()
  );

  localStorage.setItem(LocalStorageKeys.canvasTree, canvasTreeAsString);
  localStorage.setItem(LocalStorageKeys.canvasStyle, canvasStyleAsString);

  toast.success('Canvas saved successfully!');
}
