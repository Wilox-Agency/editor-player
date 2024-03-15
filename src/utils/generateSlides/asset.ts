import gsap from 'gsap';

import { StageVirtualSize, getCanvasImageIntrinsicSize } from '@/utils/konva';
import { randomFloatFromInterval, randomIntFromInterval } from '@/utils/random';
import type { CanvasElementOfType, DistributiveOmit } from '@/utils/types';

export type AssetType = 'image' | 'video';

export type AssetElement = Awaited<ReturnType<typeof generateAssetAttributes>>;

function getAssetDimensions(type: AssetType, url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const element = document.createElement(type === 'image' ? 'img' : 'video');
    const loadEventName = type === 'image' ? 'load' : 'loadedmetadata';

    function handleLoad() {
      const dimensions = getCanvasImageIntrinsicSize(element);
      resolve(dimensions);
      cleanup();
    }

    function handleError() {
      reject('Invalid asset URL');
      cleanup();
    }

    function cleanup() {
      element.removeEventListener(loadEventName, handleLoad);
      element.removeEventListener('error', handleError);
      element.remove();
    }

    element.addEventListener(loadEventName, handleLoad);
    element.addEventListener('error', handleError);
    element.src = url;
  });
}

/* TODO: Create a different handling for images that have a really small or
really big aspect ratio */
export async function generateAssetAttributes({
  type,
  url,
}: {
  type: AssetType;
  url: string;
}) {
  const intrinsicSize = await getAssetDimensions(type, url);
  const intrinsicAspectRatio = intrinsicSize.width / intrinsicSize.height;

  const stageAspectRatio = StageVirtualSize.width / StageVirtualSize.height;
  /** Represents the max percentage the main dimension of the element (width or
   * height) can have compared to the stage before snapping to 100% */
  const maxMainDimensionSizePercentageBeforeSnappingToFull = 0.8;
  const maxSecondaryDimensionSizePercentage = 0.6;

  let width;
  let height;
  if (intrinsicAspectRatio <= stageAspectRatio) {
    height = gsap.utils.snap(
      {
        values: [StageVirtualSize.height],
        radius:
          StageVirtualSize.height *
          (1 - maxMainDimensionSizePercentageBeforeSnappingToFull),
      },
      randomIntFromInterval(
        StageVirtualSize.height * 0.6,
        StageVirtualSize.height
      )
    );
    width = height * intrinsicAspectRatio;

    const maxWidth =
      StageVirtualSize.width * maxSecondaryDimensionSizePercentage;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / intrinsicAspectRatio;

      const maxHeight =
        StageVirtualSize.height *
        maxMainDimensionSizePercentageBeforeSnappingToFull;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * intrinsicAspectRatio;
      }
    }
  } else {
    width = gsap.utils.snap(
      {
        values: [StageVirtualSize.width],
        radius:
          StageVirtualSize.width *
          (1 - maxMainDimensionSizePercentageBeforeSnappingToFull),
      },
      randomIntFromInterval(
        StageVirtualSize.width * 0.6,
        StageVirtualSize.width
      )
    );
    height = width / intrinsicAspectRatio;

    const maxHeight =
      StageVirtualSize.height * maxSecondaryDimensionSizePercentage;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * intrinsicAspectRatio;

      const maxWidth =
        StageVirtualSize.width *
        maxMainDimensionSizePercentageBeforeSnappingToFull;
      if (width > maxWidth) {
        width = maxWidth;
        height = width / intrinsicAspectRatio;
      }
    }
  }

  const x = gsap.utils.random([0, StageVirtualSize.width - width]);
  const y = gsap.utils.random([0, StageVirtualSize.height - height]);

  const baseAttributes = {
    id: crypto.randomUUID(),
    width,
    height,
    x,
    y,
  } as const;

  return {
    ...baseAttributes,
    ...(type === 'image'
      ? {
          type: 'image',
          imageUrl: url,
        }
      : {
          type: 'video',
          videoUrl: url,
          autoPlay: true,
          loop: true,
        }),
  } satisfies DistributiveOmit<CanvasElementOfType<'image' | 'video'>, 'id'>;
}

export async function _generateAssetAttributesForFirstSlide({
  type,
  url,
}: {
  type: AssetType;
  url: string;
}) {
  const intrinsicSize = await getAssetDimensions(type, url);
  const intrinsicAspectRatio = intrinsicSize.width / intrinsicSize.height;

  const orientation: 'landscape' | 'portrait' =
    intrinsicAspectRatio > 1.5
      ? 'landscape'
      : intrinsicAspectRatio < 0.5
      ? 'portrait'
      : gsap.utils.random(['landscape', 'portrait']);

  const maxArea =
    StageVirtualSize.width * 0.8 * (StageVirtualSize.height * 0.8);
  let width;
  let height;

  if (orientation === 'landscape') {
    width = gsap.utils.snap(
      {
        values: [StageVirtualSize.width],
        radius: StageVirtualSize.width * 0.2,
      },
      randomIntFromInterval(
        StageVirtualSize.width * 0.6,
        StageVirtualSize.width
      )
    );
    const maxHeight = Math.min(StageVirtualSize.height, maxArea / width);
    height = randomIntFromInterval(StageVirtualSize.height * 0.4, maxHeight);
  } else {
    height = gsap.utils.snap(
      {
        values: [StageVirtualSize.height],
        radius: StageVirtualSize.height * 0.2,
      },
      randomIntFromInterval(
        StageVirtualSize.height * 0.6,
        StageVirtualSize.height
      )
    );
    const maxWidth = Math.min(StageVirtualSize.width * 0.7, maxArea / height);
    width = randomIntFromInterval(StageVirtualSize.height * 0.4, maxWidth);
  }

  const x = gsap.utils.random([0, StageVirtualSize.width - width]);
  const y = gsap.utils.random([0, StageVirtualSize.height - height]);

  const baseAttributes = {
    id: crypto.randomUUID(),
    width,
    height,
    x,
    y,
    objectFit: 'cover',
  } as const;

  return {
    ...baseAttributes,
    ...(type === 'image'
      ? {
          type: 'image',
          imageUrl: url,
        }
      : {
          type: 'video',
          videoUrl: url,
          autoPlay: true,
          loop: true,
        }),
  } satisfies CanvasElementOfType<'image' | 'video'>;
}

export async function _generateAssetAttributes({
  type,
  url,
}: {
  type: AssetType;
  url: string;
}) {
  const intrinsicSize = await getAssetDimensions(type, url);
  const intrinsicAspectRatio = intrinsicSize.width / intrinsicSize.height;

  const width = randomFloatFromInterval(
    StageVirtualSize.width * 0.3,
    StageVirtualSize.width * 0.6
  );
  const minAspectRatio = Math.max(
    intrinsicAspectRatio - 1,
    width / StageVirtualSize.height
  );
  const maxAspectRatio = intrinsicAspectRatio + 1;
  const newAspectRatio = randomFloatFromInterval(
    minAspectRatio,
    maxAspectRatio
  );
  const height = width / newAspectRatio;

  const x = gsap.utils.random([0, StageVirtualSize.width - width]);
  const y = gsap.utils.random([0, StageVirtualSize.height - height]);

  const baseAttributes = {
    id: crypto.randomUUID(),
    width,
    height,
    x,
    y,
    objectFit: 'cover',
  } as const;

  return {
    ...baseAttributes,
    ...(type === 'image'
      ? {
          type: 'image',
          imageUrl: url,
        }
      : {
          type: 'video',
          videoUrl: url,
          autoPlay: true,
          loop: true,
        }),
  } satisfies CanvasElementOfType<'image' | 'video'>;
}
