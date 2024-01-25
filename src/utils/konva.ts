import type { ElementType } from 'react';
import type Konva from 'konva';

import type { CanvasElement, CanvasElementOfType } from '@/utils/types';

import { Image, Video } from '@/components/konva/Image';
import { Text } from '@/components/konva/Text';

export const CanvasComponentByType = {
  video: Video,
  image: Image,
  text: Text,
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
    fill: 'white',
    fontSize: 32,
    lineHeight: 1,
    letterSpacing: 0,
    align: 'center',
    draggable: true,
  },
} satisfies {
  [K in CanvasElement['type']]: Partial<
    Omit<CanvasElementOfType<K>, 'id' | 'type'>
  >;
};

/**
 * When creating a Konva node, the size at which it will appear on the screen
 * might take a few milliseconds to calculate. This function checks the size of
 * the provided node until it is calculated (i.e. it is different from
 * `undefined` and from `0`) and then returns it.
 *
 * This function throws if the size is not calculated after 1s.
 */
export function waitUntilKonvaNodeSizeIsCalculated(
  node: Konva.Node,
  delayInMilliseconds: number = 50
) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const startTime = new Date().getTime();
    const maxWaitTime = 1000; // 1s

    function checkSize() {
      const currentTime = new Date().getTime();
      const timeElapsed = currentTime - startTime;
      // Rejecting after exceeding the maximum wait time
      if (timeElapsed >= maxWaitTime) {
        reject(new Error('Timeout'));
        return;
      }

      // Width and height can be `undefined` or `0`
      if (!node.width() || !node.height()) {
        setTimeout(() => {
          checkSize();
        }, delayInMilliseconds);
        return;
      }

      resolve({ width: node.width(), height: node.height() });
    }

    setTimeout(() => {
      checkSize();
    });
  });
}

export function getCanvasImageIntrinsicSize(imageSource: CanvasImageSource): {
  width: number;
  height: number;
} {
  if (imageSource instanceof HTMLImageElement) {
    return {
      width: imageSource.naturalWidth,
      height: imageSource.naturalHeight,
    };
  }

  if (imageSource instanceof SVGImageElement) {
    return {
      width: imageSource.width.baseVal.value,
      height: imageSource.height.baseVal.value,
    };
  }

  if (imageSource instanceof HTMLVideoElement) {
    return { width: imageSource.videoWidth, height: imageSource.videoHeight };
  }

  if (imageSource instanceof VideoFrame) {
    return {
      width: imageSource.displayWidth,
      height: imageSource.displayHeight,
    };
  }

  return { width: imageSource.width, height: imageSource.height };
}
