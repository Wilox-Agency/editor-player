import gsap from 'gsap';
import type { IRect } from 'konva/lib/types';

import { rectColorPalette } from './index';
import { type AssetElement } from './asset';
import { StageVirtualSize } from '@/utils/konva';
import { randomIntFromInterval } from '@/utils/random';
import type { CanvasElementOfType } from '@/utils/types';

type Dimension = 'width' | 'height';
type Size = Record<Dimension, number>;
type Coordinate = 'x' | 'y';
type Position = Record<Coordinate, number>;

const coordinateToDimension = {
  x: 'width',
  y: 'height',
} satisfies Record<Coordinate, Dimension>;
const dimensionToCoordinate = {
  width: 'x',
  height: 'y',
} satisfies Record<Dimension, Coordinate>;

const minMaxMeasureMultipliersOfTitleRectByNumberOfParagraphs = {
  0: {
    min: 0.6,
    max: 0.85,
  },
  1: {
    min: 0.5,
    max: 0.6,
  },
  2: {
    min: 0.5,
    max: 0.6,
  },
};

function generateRectSizes({
  mainDimension,
  numberOfParagraphs,
  assetElement,
}: {
  mainDimension: Dimension;
  numberOfParagraphs: 0 | 1 | 2;
  assetElement: AssetElement;
}) {
  const secondaryDimension: Dimension =
    mainDimension === 'width' ? 'height' : 'width';

  // Title rect
  const titleRectSize = (() => {
    const { min: minMultiplier, max: maxMultiplier } =
      minMaxMeasureMultipliersOfTitleRectByNumberOfParagraphs[
        numberOfParagraphs
      ];

    const mainDimensionMeasure = randomIntFromInterval(
      StageVirtualSize[mainDimension] * minMultiplier,
      StageVirtualSize[mainDimension] * maxMultiplier
    );

    return {
      [mainDimension]: mainDimensionMeasure,
      [secondaryDimension]:
        StageVirtualSize[secondaryDimension] - assetElement[secondaryDimension],
    } as Size;
  })();

  // Paragraphs rect
  const paragraphsRectSize = (() => {
    return {
      [mainDimension]:
        StageVirtualSize[mainDimension] - titleRectSize[mainDimension],
      [secondaryDimension]:
        StageVirtualSize[secondaryDimension] - assetElement[secondaryDimension],
    } as Size;
  })();

  /* When there's 2 paragraphs, the paragraphs rect will always have a greater
  secondary dimension measure (so it can be more easily divided in 2 later on) */
  const willRectsHaveSameSecondaryDimensionMeasure =
    numberOfParagraphs === 2 ? false : gsap.utils.random([true, false]);
  if (!willRectsHaveSameSecondaryDimensionMeasure) {
    /* Randomnly select a size (title rect size or paragraphs rect size) to
    increase the secondary dimension measure, unless there's 2 paragraphs, then
    the paragraphs rect will always be the selected one */
    const sizeToIncrease =
      numberOfParagraphs === 2
        ? paragraphsRectSize
        : gsap.utils.random([titleRectSize, paragraphsRectSize]);
    // Increase by 20% of the secondary dimension of the asset element
    sizeToIncrease[secondaryDimension] +=
      assetElement[secondaryDimension] * 0.2;
  }

  return {
    titleRectSize,
    paragraphsRectSize,
  };
}

function setRectPositions({
  titleRectSize,
  paragraphsRectSize,
  numberOfParagraphs,
  assetElement,
}: {
  titleRectSize: Size;
  paragraphsRectSize: Size;
  numberOfParagraphs: 0 | 1 | 2;
  assetElement: AssetElement;
}) {
  const isFullWidthAssetElement = assetElement.width === StageVirtualSize.width;
  const isFullHeightAssetElement =
    assetElement.height === StageVirtualSize.height;
  if (!isFullWidthAssetElement && !isFullHeightAssetElement) {
    throw new Error(
      'Only asset elements that are full width or full height are currently supported.'
    );
  }

  const assetElementX = assetElement.x === 0 ? 'left' : 'right';
  const assetElementY = assetElement.y === 0 ? 'top' : 'bottom';

  let titleRectPosition: Position;
  let paragraphsRectPosition: Position;
  if (isFullWidthAssetElement) {
    let titleRectX: number;
    if (numberOfParagraphs === 0) {
      /* If there's no paragraph, randomly pick a horizontal position to place
      the title rect */
      const horizontalPosition = gsap.utils.random(['left', 'right'] as const);
      titleRectX =
        horizontalPosition === 'left'
          ? 0
          : StageVirtualSize.width - titleRectSize.width;
    } else {
      // If there's a paragraph, then place the title rect at the left
      titleRectX = 0;
    }

    titleRectPosition = {
      x: titleRectX,
      y:
        assetElementY === 'top'
          ? StageVirtualSize.height - titleRectSize.height
          : 0,
    };
    paragraphsRectPosition = {
      x: titleRectX === 0 ? titleRectSize.width : 0,
      y:
        assetElementY === 'top'
          ? StageVirtualSize.height - paragraphsRectSize.height
          : 0,
    };
  } else {
    let titleRectY: number;
    if (numberOfParagraphs === 0) {
      /* If there's no paragraph, randomly pick a vertical position to place the
      title rect */
      const verticalPosition = gsap.utils.random(['top', 'bottom'] as const);
      titleRectY =
        verticalPosition === 'top'
          ? 0
          : StageVirtualSize.height - titleRectSize.height;
    } else {
      // If there's a paragraph, then place the title rect at the top
      titleRectY = 0;
    }

    titleRectPosition = {
      x:
        assetElementX === 'left'
          ? StageVirtualSize.width - titleRectSize.width
          : 0,
      y: titleRectY,
    };
    paragraphsRectPosition = {
      x:
        assetElementX === 'left'
          ? StageVirtualSize.width - paragraphsRectSize.width
          : 0,
      y: titleRectY === 0 ? titleRectSize.height : 0,
    };
  }

  return {
    titleRect: {
      ...titleRectSize,
      ...titleRectPosition,
    },
    paragraphsRect: {
      ...paragraphsRectSize,
      ...paragraphsRectPosition,
    },
  };
}

function generateExtraRectPosition({
  rectWhereExtraRectWillBeAdded,
  extraRect,
  rectsHaveSameSecondaryDimensionMeasure,
}: {
  rectWhereExtraRectWillBeAdded: IRect & { mainDimension: Dimension };
  extraRect: Size & { mainDimension: Dimension };
  rectsHaveSameSecondaryDimensionMeasure: boolean;
}) {
  const differentMainDimensions =
    rectWhereExtraRectWillBeAdded.mainDimension !== extraRect.mainDimension;
  const extraRectSecondaryDimension: Dimension =
    extraRect.mainDimension === 'width' ? 'height' : 'width';

  const position: Position = { x: 0, y: 0 };

  for (const coordinate of ['x', 'y'] satisfies Coordinate[]) {
    const isCoordinateInSameAxisAsMainDimension =
      coordinateToDimension[coordinate] ===
      rectWhereExtraRectWillBeAdded.mainDimension;

    if (
      (!isCoordinateInSameAxisAsMainDimension && differentMainDimensions) ||
      (isCoordinateInSameAxisAsMainDimension && !differentMainDimensions)
    ) {
      position[coordinate] = rectWhereExtraRectWillBeAdded[coordinate];
      continue;
    }

    let positionInAxis;
    if (rectsHaveSameSecondaryDimensionMeasure) {
      positionInAxis = gsap.utils.random(['start', 'end'] as const);
    } else {
      /* Put on the opposite position in axis relative to where the rect it
        will be added to is in the stage */
      positionInAxis =
        rectWhereExtraRectWillBeAdded[coordinate] === 0
          ? ('end' as const)
          : ('start' as const);
    }

    if (positionInAxis === 'start') {
      position[coordinate] = rectWhereExtraRectWillBeAdded[coordinate];
    } else {
      position[coordinate] =
        rectWhereExtraRectWillBeAdded[coordinate] +
        rectWhereExtraRectWillBeAdded[extraRectSecondaryDimension] -
        extraRect[extraRectSecondaryDimension];
    }
  }

  return position;
}

/**
 * Should only be used when there's 0 or 1 paragraphs in the slide.
 *
 * This function mutates the `titleRect` or `paragraphsRect` and return
 * references of both.
 */
function addExtraRect({
  titleRect,
  paragraphsRect,
  mainDimension,
  assetElement,
}: {
  titleRect: IRect;
  paragraphsRect: IRect;
  mainDimension: Dimension;
  assetElement: AssetElement;
}) {
  const willAddExtraRect = gsap.utils.random([true, false]);
  if (!willAddExtraRect) {
    return {
      titleRect,
      paragraphsRect,
      extraRect: undefined,
    };
  }

  const secondaryDimension: Dimension =
    mainDimension === 'width' ? 'height' : 'width';

  const isFullWidthAssetElement = assetElement.width === StageVirtualSize.width;
  const isFullHeightAssetElement =
    assetElement.height === StageVirtualSize.height;
  if (!isFullWidthAssetElement && !isFullHeightAssetElement) {
    /* Only asset elements that are full width or full height are currently
    supported */
    /* TODO: Add support for adding extra rect when the asset element is at a
    corner */
    return {
      titleRect,
      paragraphsRect,
      extraRect: undefined,
    };
  }

  let extraRect: IRect;
  const extraRectMainDimension = gsap.utils.random([
    'width',
    'height',
  ] satisfies Dimension[]);
  const extraRectSecondaryDimension: Dimension =
    extraRectMainDimension === 'width' ? 'height' : 'width';

  const rectsHaveSameSecondaryDimensionMeasure =
    titleRect[secondaryDimension] === paragraphsRect[secondaryDimension];

  // Different main dimensions
  if (mainDimension !== extraRectMainDimension) {
    const coordinateEquivalentToMainDimension =
      dimensionToCoordinate[mainDimension];

    let whereExtraRectWillBeAdded: IRect;
    if (rectsHaveSameSecondaryDimensionMeasure) {
      whereExtraRectWillBeAdded = gsap.utils.random([
        titleRect,
        paragraphsRect,
      ] as const);
    } else {
      // Get the rect with smallest secondary dimension measure
      whereExtraRectWillBeAdded =
        titleRect[secondaryDimension] < paragraphsRect[secondaryDimension]
          ? titleRect
          : paragraphsRect;
    }

    const extraRectSecondaryDimensionMeasure = randomIntFromInterval(
      whereExtraRectWillBeAdded[extraRectSecondaryDimension] * 0.05,
      whereExtraRectWillBeAdded[extraRectSecondaryDimension] * 0.15
    );

    const extraRectSize = {
      [extraRectSecondaryDimension]: extraRectSecondaryDimensionMeasure,
      [extraRectMainDimension]: whereExtraRectWillBeAdded[secondaryDimension],
    } as Size;

    const extraRectPosition = generateExtraRectPosition({
      rectWhereExtraRectWillBeAdded: {
        ...whereExtraRectWillBeAdded,
        mainDimension: mainDimension,
      },
      extraRect: {
        ...extraRectSize,
        mainDimension: extraRectMainDimension,
      },
      rectsHaveSameSecondaryDimensionMeasure,
    }) as Position;

    extraRect = {
      ...extraRectPosition,
      ...extraRectSize,
    };

    // Subtracting the space that the extra rect will occupy
    whereExtraRectWillBeAdded[mainDimension] -=
      extraRectSecondaryDimensionMeasure;
    // Adjust the position if necessary
    if (
      whereExtraRectWillBeAdded[coordinateEquivalentToMainDimension] ===
      extraRect[coordinateEquivalentToMainDimension]
    ) {
      whereExtraRectWillBeAdded[coordinateEquivalentToMainDimension] +=
        extraRectSecondaryDimensionMeasure;
    }
  } else {
    const coordinateEquivalentToSecondaryDimension =
      dimensionToCoordinate[secondaryDimension];

    const whereExtraRectWillBeAdded = gsap.utils.random([
      titleRect,
      paragraphsRect,
    ] as const);

    // Get the rect with smallest secondary dimension measure
    const rectWithSmallestSecondaryDimensionMeasure =
      titleRect[secondaryDimension] < paragraphsRect[secondaryDimension]
        ? titleRect
        : paragraphsRect;

    let extraRectSecondaryDimensionMeasure: number;
    if (
      rectsHaveSameSecondaryDimensionMeasure ||
      whereExtraRectWillBeAdded === rectWithSmallestSecondaryDimensionMeasure
    ) {
      /* When both rects have the same secondary dimension measure, or when the
      extra rect is going to be added to the rect with smallest secondary
      dimension measure, there's nothing special that has to be done, just get a
      random height for the extra rect */
      extraRectSecondaryDimensionMeasure = randomIntFromInterval(
        whereExtraRectWillBeAdded[secondaryDimension] * 0.05,
        whereExtraRectWillBeAdded[secondaryDimension] * 0.15
      );
    } else {
      const differenceBetweenSecondaryDimensionMeasures = Math.abs(
        titleRect[secondaryDimension] - paragraphsRect[secondaryDimension]
      );

      let minSecondaryDimensionMeasure =
        whereExtraRectWillBeAdded[secondaryDimension] * 0.05;
      let maxSecondaryDimensionMeasure =
        whereExtraRectWillBeAdded[secondaryDimension] * 0.15;
      /* Try to prevent the extra rect from aligning (or getting close to
      aligning) with the rect with smallest secondary measure */
      if (
        minSecondaryDimensionMeasure <
        differenceBetweenSecondaryDimensionMeasures
      ) {
        minSecondaryDimensionMeasure =
          differenceBetweenSecondaryDimensionMeasures +
          rectWithSmallestSecondaryDimensionMeasure[secondaryDimension] * 0.1;
      }
      if (
        maxSecondaryDimensionMeasure >
        differenceBetweenSecondaryDimensionMeasures
      ) {
        maxSecondaryDimensionMeasure =
          differenceBetweenSecondaryDimensionMeasures -
          rectWithSmallestSecondaryDimensionMeasure[secondaryDimension] * 0.1;
      }

      if (minSecondaryDimensionMeasure <= maxSecondaryDimensionMeasure) {
        extraRectSecondaryDimensionMeasure = randomIntFromInterval(
          minSecondaryDimensionMeasure,
          maxSecondaryDimensionMeasure
        );
      } else {
        /* If it's not possible to prevent the extra rect from aligning (or
        getting close to aligning) with the rect with smallest secondary measure
        dimension, then do not add the extra rect */
        return {
          titleRect,
          paragraphsRect,
          extraRect: undefined,
        };
      }
    }

    const extraRectSize = {
      [extraRectMainDimension]: whereExtraRectWillBeAdded[mainDimension],
      [extraRectSecondaryDimension]: extraRectSecondaryDimensionMeasure,
    } as Size;

    const extraRectPosition = generateExtraRectPosition({
      rectWhereExtraRectWillBeAdded: {
        ...whereExtraRectWillBeAdded,
        mainDimension: mainDimension,
      },
      extraRect: {
        ...extraRectSize,
        mainDimension: extraRectMainDimension,
      },
      rectsHaveSameSecondaryDimensionMeasure,
    }) as Position;

    extraRect = {
      ...extraRectPosition,
      ...extraRectSize,
    };

    // Subtracting the space that the extra rect will occupy
    whereExtraRectWillBeAdded[secondaryDimension] -=
      extraRectSecondaryDimensionMeasure;
    // Adjust the position if necessary
    if (
      whereExtraRectWillBeAdded[coordinateEquivalentToSecondaryDimension] ===
      extraRect[coordinateEquivalentToSecondaryDimension]
    ) {
      whereExtraRectWillBeAdded[coordinateEquivalentToSecondaryDimension] +=
        extraRectSecondaryDimensionMeasure;
    }
  }

  return {
    titleRect,
    paragraphsRect,
    extraRect,
  };
}

/** Should only be used when there's 2 paragraphs in the slide. */
function separateParagraphsRect({
  paragraphsRect,
  mainDimension,
}: {
  paragraphsRect: IRect;
  mainDimension: Dimension;
}) {
  const secondaryDimension: Dimension =
    mainDimension === 'width' ? 'height' : 'width';
  const coordinateEquivalentToMainDimension =
    dimensionToCoordinate[mainDimension];
  const coordinateEquivalentToSecondaryDimension =
    dimensionToCoordinate[secondaryDimension];

  const firstParagraphRectSecondaryDimensionMeasure = randomIntFromInterval(
    paragraphsRect[secondaryDimension] * 0.45,
    paragraphsRect[secondaryDimension] * 0.55
  );
  const secondParagraphRectSecondaryDimensionMeasure =
    paragraphsRect[secondaryDimension] -
    firstParagraphRectSecondaryDimensionMeasure;

  return [
    {
      [coordinateEquivalentToMainDimension]:
        paragraphsRect[coordinateEquivalentToMainDimension],
      [coordinateEquivalentToSecondaryDimension]:
        paragraphsRect[coordinateEquivalentToSecondaryDimension],
      [mainDimension]: paragraphsRect[mainDimension],
      [secondaryDimension]: firstParagraphRectSecondaryDimensionMeasure,
    } as unknown as IRect,
    {
      [coordinateEquivalentToMainDimension]:
        paragraphsRect[coordinateEquivalentToMainDimension],
      [coordinateEquivalentToSecondaryDimension]:
        paragraphsRect[coordinateEquivalentToSecondaryDimension] +
        firstParagraphRectSecondaryDimensionMeasure,
      [mainDimension]: paragraphsRect[mainDimension],
      [secondaryDimension]: secondParagraphRectSecondaryDimensionMeasure,
    } as unknown as IRect,
  ] satisfies IRect[];
}

export function generateRects({
  mainDimension,
  numberOfParagraphs,
  assetElement,
}: {
  mainDimension: Dimension;
  numberOfParagraphs: 0 | 1 | 2;
  assetElement: AssetElement;
}) {
  const { titleRectSize, paragraphsRectSize } = generateRectSizes({
    mainDimension,
    numberOfParagraphs,
    assetElement,
  });
  const { titleRect, paragraphsRect } = setRectPositions({
    titleRectSize,
    paragraphsRectSize,
    numberOfParagraphs,
    assetElement,
  });

  let rectsWithoutColor: {
    titleRect: IRect;
    paragraphRects: IRect[];
    extraRect?: IRect;
  };
  if (numberOfParagraphs === 2) {
    const paragraphRects = separateParagraphsRect({
      mainDimension,
      paragraphsRect,
    });
    rectsWithoutColor = {
      titleRect,
      paragraphRects,
    };
  } else {
    const { extraRect } = addExtraRect({
      titleRect,
      paragraphsRect,
      mainDimension,
      assetElement,
    });
    rectsWithoutColor = {
      titleRect,
      paragraphRects: [paragraphsRect],
      extraRect,
    };
  }

  const rectColors = gsap.utils.shuffle([...rectColorPalette]);
  let currentColorIndex = 0;

  return {
    titleRect: {
      ...rectsWithoutColor.titleRect,
      id: crypto.randomUUID(),
      type: 'rect',
      fill: rectColors[currentColorIndex++]!,
    },
    paragraphRects: rectsWithoutColor.paragraphRects.map((paragraphRect) => ({
      ...paragraphRect,
      id: crypto.randomUUID(),
      type: 'rect',
      fill: rectColors[currentColorIndex++]!,
    })),
    extraRect: rectsWithoutColor.extraRect
      ? {
          ...rectsWithoutColor.extraRect,
          id: crypto.randomUUID(),
          type: 'rect',
          fill: rectColors[currentColorIndex]!,
        }
      : undefined,
  } satisfies {
    titleRect: CanvasElementOfType<'rect'>;
    paragraphRects: CanvasElementOfType<'rect'>[];
    extraRect?: CanvasElementOfType<'rect'>;
  };
}
