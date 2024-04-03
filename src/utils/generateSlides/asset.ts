import gsap from 'gsap';

import type { Dimension, Size } from './sharedTypes';
import { StageVirtualSize } from '@/utils/konva';
import { getCanvasImageIntrinsicSize } from '@/utils/konva/asset';
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
      reject(`Invalid ${type} URL: "${url}"`);
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

/** Represents the max percentage the main dimension of the element (width or
 * height) can have compared to the stage before snapping to 100% */
const maxMainDimensionSizePercentageBeforeSnappingToFull = 0.8;
const maxSecondaryDimensionSizePercentage = 0.6;

function getMinAndMaxAssetSizes(
  instrinsicAspectRatio: number,
  mainDimension: Dimension,
  secondaryDimension: Dimension
) {
  const greatestDimension: Dimension =
    instrinsicAspectRatio >= 1 ? 'width' : 'height';
  const smallestDimension: Dimension =
    greatestDimension === 'width' ? 'height' : 'width';

  // Calculate max size
  const maxSize: Size = { width: 0, height: 0 };

  const maxGreatestDimensionMeasure =
    greatestDimension === secondaryDimension
      ? StageVirtualSize[greatestDimension] *
        maxSecondaryDimensionSizePercentage
      : StageVirtualSize[greatestDimension];
  const maxSmallestDimensionMeasure =
    smallestDimension === secondaryDimension
      ? StageVirtualSize[smallestDimension] *
        maxSecondaryDimensionSizePercentage
      : StageVirtualSize[smallestDimension];

  maxSize[greatestDimension] = maxGreatestDimensionMeasure;
  maxSize[smallestDimension] =
    greatestDimension === 'width'
      ? maxSize[greatestDimension] / instrinsicAspectRatio
      : maxSize[greatestDimension] * instrinsicAspectRatio;

  if (maxSize[smallestDimension] > maxSmallestDimensionMeasure) {
    maxSize[smallestDimension] = maxSmallestDimensionMeasure;
    maxSize[greatestDimension] =
      smallestDimension === 'width'
        ? maxSize[smallestDimension] / instrinsicAspectRatio
        : maxSize[smallestDimension] * instrinsicAspectRatio;
  }

  // Calculate min size
  const minSize: Size = { width: 0, height: 0 };

  const minMeasure = 500;
  const minGreatestDimensionMeasure =
    greatestDimension === mainDimension
      ? StageVirtualSize[greatestDimension] * 0.6
      : minMeasure;
  const minSmallestDimensionMeasure =
    smallestDimension === mainDimension
      ? StageVirtualSize[smallestDimension] * 0.6
      : minMeasure;

  minSize[smallestDimension] = minSmallestDimensionMeasure;
  minSize[greatestDimension] =
    smallestDimension === 'width'
      ? minSize[smallestDimension] / instrinsicAspectRatio
      : minSize[smallestDimension] * instrinsicAspectRatio;

  if (minSize[greatestDimension] < minGreatestDimensionMeasure) {
    minSize[greatestDimension] = minGreatestDimensionMeasure;
    minSize[smallestDimension] =
      greatestDimension === 'width'
        ? minSize[greatestDimension] / instrinsicAspectRatio
        : minSize[greatestDimension] * instrinsicAspectRatio;
  }

  if (minSize[greatestDimension] > maxSize[greatestDimension]) {
    minSize[greatestDimension] = maxSize[greatestDimension];
    minSize[smallestDimension] =
      greatestDimension === 'width'
        ? minSize[greatestDimension] / instrinsicAspectRatio
        : minSize[greatestDimension] * instrinsicAspectRatio;
  }

  return { minSize, maxSize };
}

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

  const size: Size = { width: 0, height: 0 };
  const mainDimension: Dimension =
    intrinsicAspectRatio <= stageAspectRatio ? 'height' : 'width';
  const secondaryDimension: Dimension =
    mainDimension === 'width' ? 'height' : 'width';

  const { minSize, maxSize } = getMinAndMaxAssetSizes(
    intrinsicAspectRatio,
    mainDimension,
    secondaryDimension
  );
  size[mainDimension] = gsap.utils.snap(
    {
      values: [StageVirtualSize[mainDimension]],
      radius:
        StageVirtualSize[mainDimension] *
        (1 - maxMainDimensionSizePercentageBeforeSnappingToFull),
    },
    randomIntFromInterval(minSize[mainDimension], maxSize[mainDimension])
  );
  size[secondaryDimension] =
    mainDimension === 'width'
      ? size[mainDimension] / intrinsicAspectRatio
      : size[mainDimension] * intrinsicAspectRatio;

  const x = gsap.utils.random([0, StageVirtualSize.width - size.width]);
  const y = gsap.utils.random([0, StageVirtualSize.height - size.height]);

  const baseAttributes = {
    id: crypto.randomUUID(),
    width: size.width,
    height: size.height,
    x,
    y,
  } as const;

  return {
    ...baseAttributes,
    ...(type === 'image'
      ? { type: 'image', imageUrl: url }
      : { type: 'video', videoUrl: url, loop: true }),
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
