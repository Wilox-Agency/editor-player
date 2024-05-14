import type { IRect } from 'konva/lib/types';
import gsap from 'gsap';
import { type } from 'arktype';

import { type AssetElement } from './asset';
import { baseAttributesByTextType, fitTextIntoRect } from './text';
import type { Coordinate, Dimension, Position, Size } from './sharedTypes';
import { StageVirtualSize } from '@/utils/konva';
import { randomIntFromInterval } from '@/utils/random';
import type { CanvasElementOfType } from '@/utils/types';

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

function generateRectsForCornerAssetElement({
  numberOfParagraphs,
  assetElement,
}: {
  numberOfParagraphs: 0 | 1 | 2;
  assetElement: AssetElement;
}) {
  const assetElementHorizontalPosition =
    assetElement.x === 0 ? 'left' : 'right';
  const assetElementVerticalPosition = assetElement.y === 0 ? 'top' : 'bottom';

  /* TODO: Maybe, after this condition was met, also add a random condition or a
  condition depending on the size of the paragraphs to actually make the
  paragraphs rect occupy the full stage height */
  const shouldParagraphsRectOccupyFullHeight = (() => {
    const willParagraphsRectBeAtBottomRight =
      assetElementVerticalPosition === 'bottom' &&
      assetElementHorizontalPosition === 'left';
    const paragraphsRectWidth = StageVirtualSize.width - assetElement.width;
    const maxWidthToAllowFullHeight = StageVirtualSize.width * 0.4;

    return (
      numberOfParagraphs === 2 &&
      willParagraphsRectBeAtBottomRight &&
      paragraphsRectWidth <= maxWidthToAllowFullHeight
    );
  })();

  // Title rect
  const titleRect = (() => {
    if (assetElementVerticalPosition === 'top') {
      return {
        x: assetElementHorizontalPosition === 'left' ? assetElement.width : 0,
        y: 0,
        width: StageVirtualSize.width - assetElement.width,
        height: assetElement.height,
      } satisfies IRect;
    } else {
      return {
        /* The paragraphs rect will only occupy full height when the asset
        element is at the bottom left side (and therefore the title will be at
        the top left side), so there's no need to change the X in that case */
        x: 0,
        y: 0,
        width: shouldParagraphsRectOccupyFullHeight
          ? assetElement.width
          : StageVirtualSize.width,
        height: StageVirtualSize.height - assetElement.height,
      } satisfies IRect;
    }
  })();

  // Paragraphs rect
  const paragraphsRect = (() => {
    if (assetElementVerticalPosition === 'top') {
      return {
        x: 0,
        y: assetElement.height,
        width: StageVirtualSize.width,
        height: StageVirtualSize.height - assetElement.height,
      } satisfies IRect;
    } else {
      return {
        x: assetElementHorizontalPosition === 'left' ? assetElement.width : 0,
        y: shouldParagraphsRectOccupyFullHeight ? 0 : assetElement.y,
        width: StageVirtualSize.width - assetElement.width,
        height: shouldParagraphsRectOccupyFullHeight
          ? StageVirtualSize.height
          : assetElement.height,
      } satisfies IRect;
    }
  })();

  return {
    titleRect,
    paragraphsRect,
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
      /* Put on the opposite position in axis relative to where the rect it will
      be added to is in the stage */
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

/**
 * This function mutates the `titleRect` or `paragraphsRect` and return
 * references of both.
 */
function addExtraRectForCornerAssetElement({
  titleRect,
  paragraphsRect,
  numberOfParagraphs,
  assetElement,
}: {
  titleRect: IRect;
  paragraphsRect: IRect;
  numberOfParagraphs: 0 | 1 | 2;
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

  const assetElementVerticalPosition = assetElement.y === 0 ? 'top' : 'bottom';

  let rectWhereExtraRectWillBeAdded;
  if (numberOfParagraphs === 2) {
    // Can only add extra rect to the title rect
    /* TODO: Limit size of extra rect when title is too big, specially if the
    paragraphs rect is a column with full height */
    rectWhereExtraRectWillBeAdded = titleRect;
  } else {
    /* Can choose between adding the extra rect to the title rect or paragraphs
    rect */
    rectWhereExtraRectWillBeAdded = gsap.utils.random([
      titleRect,
      paragraphsRect,
    ]);
  }

  /* Using the logic that decides the position and size of the rects to get main
  dimension of the rect where the extra rect will be added to */
  const mainDimension: Dimension =
    rectWhereExtraRectWillBeAdded === titleRect
      ? assetElementVerticalPosition === 'top'
        ? 'height'
        : 'width'
      : assetElementVerticalPosition === 'top'
      ? 'width'
      : 'height';
  const secondaryDimension: Dimension =
    mainDimension === 'width' ? 'height' : 'width';

  /* Currently using the opposite main dimension as the rect where the extra
  rect will be added to */
  // TODO: Enable using the same main dimension for the extra rect
  const extraRectMainDimension = secondaryDimension;
  const extraRectSecondaryDimension = mainDimension;

  const extraRectSecondaryDimensionMeasure = randomIntFromInterval(
    rectWhereExtraRectWillBeAdded[extraRectSecondaryDimension] * 0.05,
    rectWhereExtraRectWillBeAdded[extraRectSecondaryDimension] * 0.15
  );
  const extraRectSize = {
    [extraRectMainDimension]:
      rectWhereExtraRectWillBeAdded[extraRectMainDimension],
    [extraRectSecondaryDimension]: extraRectSecondaryDimensionMeasure,
  } as Size;

  const positionInAxis = gsap.utils.random(['start', 'end'] as const);

  const extraRectPosition: Position = { x: 0, y: 0 };
  for (const coordinate of ['x', 'y'] satisfies Coordinate[]) {
    const isCoordinateInSameAxisAsMainDimension =
      coordinateToDimension[coordinate] === mainDimension;

    if (!isCoordinateInSameAxisAsMainDimension) {
      extraRectPosition[coordinate] = rectWhereExtraRectWillBeAdded[coordinate];
      continue;
    }

    if (positionInAxis === 'start') {
      extraRectPosition[coordinate] = rectWhereExtraRectWillBeAdded[coordinate];
    } else {
      extraRectPosition[coordinate] =
        rectWhereExtraRectWillBeAdded[coordinate] +
        rectWhereExtraRectWillBeAdded[extraRectSecondaryDimension] -
        extraRectSize[extraRectSecondaryDimension];
    }
  }

  const extraRect: IRect = {
    ...extraRectPosition,
    ...extraRectSize,
  };

  const coordinateEquivalentToExtraRectSecondaryDimension =
    dimensionToCoordinate[extraRectSecondaryDimension];

  // Subtracting the space that the extra rect will occupy
  rectWhereExtraRectWillBeAdded[extraRectSecondaryDimension] -=
    extraRectSecondaryDimensionMeasure;
  // Adjust the position if necessary
  if (
    rectWhereExtraRectWillBeAdded[
      coordinateEquivalentToExtraRectSecondaryDimension
    ] === extraRect[coordinateEquivalentToExtraRectSecondaryDimension]
  ) {
    rectWhereExtraRectWillBeAdded[
      coordinateEquivalentToExtraRectSecondaryDimension
    ] += extraRectSecondaryDimensionMeasure;
  }

  return {
    titleRect,
    paragraphsRect,
    extraRect,
  };
}

function getParagraphRectEmptyArea(
  paragraphRectSize: Size,
  paragraphTextSize: Size
) {
  return (
    paragraphRectSize.width * paragraphRectSize.height -
    paragraphTextSize.width * paragraphTextSize.height
  );
}

function calculateParagraphRectsEmptyAreas({
  firstParagraphRect,
  firstParagraph,
  secondParagraphRect,
  secondParagraph,
}: {
  firstParagraphRect: Size;
  firstParagraph: string;
  secondParagraphRect: Size;
  secondParagraph: string;
}) {
  const firstParagraphRectEmptyArea = getParagraphRectEmptyArea(
    firstParagraphRect,
    fitTextIntoRect(firstParagraph, baseAttributesByTextType.paragraph, {
      width: firstParagraphRect.width,
      height: firstParagraphRect.height,
    })
  );
  const secondParagraphRectEmptyArea = getParagraphRectEmptyArea(
    secondParagraphRect,
    fitTextIntoRect(secondParagraph, baseAttributesByTextType.paragraph, {
      width: secondParagraphRect.width,
      height: secondParagraphRect.height,
    })
  );
  const emptyAreaDifference = Math.abs(
    firstParagraphRectEmptyArea - secondParagraphRectEmptyArea
  );

  return {
    firstParagraphRectEmptyArea,
    secondParagraphRectEmptyArea,
    emptyAreaDifference,
  };
}

/**
 * Makes the empty area of the paragraph rects as close as possible.
 *
 * This function mutates the rects inside the `paragraphRects` array.
 */
function balanceParagraphRectsEmptyArea({
  paragraphRects,
  paragraphs,
  separationDimension,
}: {
  paragraphRects: [IRect, IRect];
  paragraphs: string[];
  /** Dimension where the paragraphs rect is separated in two */
  separationDimension: Dimension;
}) {
  const coordinateEquivalentToSeparationDimension =
    dimensionToCoordinate[separationDimension];

  const [firstParagraph, secondParagraph] = type(['string', 'string']).assert(
    paragraphs
  );
  const [firstParagraphRect, secondParagraphRect] = paragraphRects;

  const {
    firstParagraphRectEmptyArea,
    secondParagraphRectEmptyArea,
    emptyAreaDifference,
  } = calculateParagraphRectsEmptyAreas({
    firstParagraphRect,
    firstParagraph,
    secondParagraphRect,
    secondParagraph,
  });
  if (emptyAreaDifference > 0) {
    recursiveClosure({
      firstParagraphRectEmptyArea,
      secondParagraphRectEmptyArea,
    });
  }

  function recursiveClosure({
    firstParagraphRectEmptyArea,
    secondParagraphRectEmptyArea,
  }: {
    firstParagraphRectEmptyArea: number;
    secondParagraphRectEmptyArea: number;
  }) {
    const decrementStep = 10;
    const rectWithGreaterEmptyArea =
      firstParagraphRectEmptyArea > secondParagraphRectEmptyArea
        ? firstParagraphRect
        : secondParagraphRect;

    /* Instead of mutating the paragraph rects right away, create copies with
    the changes and then check if the changes are satisfactory before applying
    them */
    const firstParagraphRectWithChanges = {
      ...firstParagraphRect,
      [separationDimension]:
        rectWithGreaterEmptyArea === firstParagraphRect
          ? firstParagraphRect[separationDimension] - decrementStep
          : firstParagraphRect[separationDimension] + decrementStep,
    };
    const secondParagraphRectWithChanges = {
      ...secondParagraphRect,
      ...(rectWithGreaterEmptyArea === secondParagraphRect
        ? {
            [separationDimension]:
              secondParagraphRect[separationDimension] - decrementStep,
            /* If the second paragraph is decreasing in size, it needs to be
            pushed forward */
            [coordinateEquivalentToSeparationDimension]:
              secondParagraphRect[coordinateEquivalentToSeparationDimension] +
              decrementStep,
          }
        : {
            [separationDimension]:
              secondParagraphRect[separationDimension] + decrementStep,
            /* If the second paragraph is increasing in size, it needs to be
            pulled back */
            [coordinateEquivalentToSeparationDimension]:
              secondParagraphRect[coordinateEquivalentToSeparationDimension] -
              decrementStep,
          }),
    };

    const newEmptyAreas = calculateParagraphRectsEmptyAreas({
      firstParagraphRect: firstParagraphRectWithChanges,
      firstParagraph,
      secondParagraphRect: secondParagraphRectWithChanges,
      secondParagraph,
    });

    const isSameRectWithGreaterEmptyArea =
      (firstParagraphRectEmptyArea > secondParagraphRectEmptyArea &&
        newEmptyAreas.firstParagraphRectEmptyArea >
          newEmptyAreas.secondParagraphRectEmptyArea) ||
      (firstParagraphRectEmptyArea < secondParagraphRectEmptyArea &&
        newEmptyAreas.firstParagraphRectEmptyArea <
          newEmptyAreas.secondParagraphRectEmptyArea);
    /* If the rect that had the greater empty area now would have the smaller
    area, then stop (using this as the condition to stop the recursive loop
    because a condition of having a difference of 0 between the empty areas is
    almost impossible to be met, so this condition prevents an infinite loop) */
    if (!isSameRectWithGreaterEmptyArea) return;

    /* If the rect that had the greater empty area still has the greater empty
    area, then commit the changes */
    firstParagraphRect[separationDimension] =
      firstParagraphRectWithChanges[separationDimension];
    secondParagraphRect[separationDimension] =
      secondParagraphRectWithChanges[separationDimension];
    secondParagraphRect[coordinateEquivalentToSeparationDimension] =
      secondParagraphRectWithChanges[coordinateEquivalentToSeparationDimension];

    // Continue the loop
    recursiveClosure(newEmptyAreas);
  }
}

/** Should only be used when there's 2 paragraphs in the slide. */
function separateParagraphsRect({
  paragraphsRect,
  mainDimension,
  paragraphs,
}: {
  paragraphsRect: IRect;
  mainDimension: Dimension;
  paragraphs: string[];
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

  const paragraphRects = [
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
  ] as const satisfies IRect[];

  balanceParagraphRectsEmptyArea({
    paragraphRects,
    paragraphs,
    separationDimension: secondaryDimension,
  });

  return paragraphRects;
}

/** Should only be used when there's 2 paragraphs in the slide. */
function separateParagraphsRectForCornerAssetElement({
  paragraphsRect,
  assetElement,
  paragraphs,
}: {
  paragraphsRect: IRect;
  assetElement: AssetElement;
  paragraphs: string[];
}) {
  const assetElementVerticalPosition = assetElement.y === 0 ? 'top' : 'bottom';

  /* Using the logic that decides the paragraph position and size to get its
  main dimension */
  const mainDimension: Dimension =
    assetElementVerticalPosition === 'top' ? 'width' : 'height';
  const secondaryDimension: Dimension =
    mainDimension === 'width' ? 'height' : 'width';

  const coordinateEquivalentToMainDimension =
    dimensionToCoordinate[mainDimension];
  const coordinateEquivalentToSecondaryDimension =
    dimensionToCoordinate[secondaryDimension];

  const firstParagraphRectMainDimensionMeasure = randomIntFromInterval(
    paragraphsRect[mainDimension] * 0.45,
    paragraphsRect[mainDimension] * 0.55
  );
  const secondParagraphRectMainDimensionMeasure =
    paragraphsRect[mainDimension] - firstParagraphRectMainDimensionMeasure;

  const paragraphRects = [
    {
      [coordinateEquivalentToMainDimension]:
        paragraphsRect[coordinateEquivalentToMainDimension],
      [coordinateEquivalentToSecondaryDimension]:
        paragraphsRect[coordinateEquivalentToSecondaryDimension],
      [mainDimension]: firstParagraphRectMainDimensionMeasure,
      [secondaryDimension]: paragraphsRect[secondaryDimension],
    } as unknown as IRect,
    {
      [coordinateEquivalentToMainDimension]:
        paragraphsRect[coordinateEquivalentToMainDimension] +
        firstParagraphRectMainDimensionMeasure,
      [coordinateEquivalentToSecondaryDimension]:
        paragraphsRect[coordinateEquivalentToSecondaryDimension],
      [mainDimension]: secondParagraphRectMainDimensionMeasure,
      [secondaryDimension]: paragraphsRect[secondaryDimension],
    } as unknown as IRect,
  ] as const satisfies IRect[];

  balanceParagraphRectsEmptyArea({
    paragraphRects,
    paragraphs,
    separationDimension: mainDimension,
  });

  return paragraphRects;
}

export function generateRects({
  numberOfParagraphs,
  paragraphs,
  assetElement,
  colorPalette,
}: {
  numberOfParagraphs: 0 | 1 | 2;
  paragraphs: string[];
  assetElement: AssetElement;
  colorPalette: string[];
}) {
  const isFullWidthAssetElement = assetElement.width === StageVirtualSize.width;
  const isFullHeightAssetElement =
    assetElement.height === StageVirtualSize.height;

  let rectsWithoutColor: {
    titleRect: IRect;
    paragraphRects: IRect[];
    extraRect?: IRect;
  };
  if (isFullWidthAssetElement || isFullHeightAssetElement) {
    const mainDimension = isFullWidthAssetElement ? 'width' : 'height';

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

    if (numberOfParagraphs === 2) {
      const paragraphRects = separateParagraphsRect({
        mainDimension,
        paragraphsRect,
        paragraphs,
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
  } else {
    const { titleRect, paragraphsRect } = generateRectsForCornerAssetElement({
      numberOfParagraphs,
      assetElement,
    });
    const { extraRect } = addExtraRectForCornerAssetElement({
      titleRect,
      paragraphsRect,
      numberOfParagraphs,
      assetElement,
    });

    if (numberOfParagraphs === 2) {
      const paragraphRects = separateParagraphsRectForCornerAssetElement({
        paragraphsRect,
        assetElement,
        paragraphs,
      });
      rectsWithoutColor = {
        titleRect,
        paragraphRects,
        extraRect,
      };
    } else {
      rectsWithoutColor = {
        titleRect,
        paragraphRects: [paragraphsRect],
        extraRect,
      };
    }

    /* When there's no paragraph, get the rect with greatest area to be the
    title rect */
    if (numberOfParagraphs === 0) {
      const rectsWithArea = [
        { rect: titleRect, area: titleRect.width * titleRect.height },
        ...rectsWithoutColor.paragraphRects.map((paragraphRect) => ({
          rect: paragraphRect,
          area: paragraphRect.width * paragraphRect.height,
        })),
      ] as const satisfies { rect: IRect; area: number }[];

      let rectWithGreatestArea = rectsWithArea[0];
      for (const rectWithArea of rectsWithArea) {
        if (rectWithArea.area > rectWithGreatestArea.area) {
          rectWithGreatestArea = rectWithArea;
        }
      }

      if (rectWithGreatestArea.rect !== titleRect) {
        const paragraphRectIndex = rectsWithoutColor.paragraphRects.findIndex(
          (paragraphRect) => paragraphRect === rectWithGreatestArea.rect
        );
        if (paragraphRectIndex !== -1) {
          // Switching the rects
          rectsWithoutColor.titleRect = rectWithGreatestArea.rect;
          rectsWithoutColor.paragraphRects[paragraphRectIndex] = titleRect;
        }
      }
    }
  }

  const rectColors = gsap.utils.shuffle([...colorPalette]);
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

/**
 * Generates a rect that is the full size of the stage.
 *
 * Used for generating an ending slide.
 */
export function generateFullSizeRect({
  colorPalette,
}: {
  colorPalette: string[];
}) {
  return {
    id: crypto.randomUUID(),
    type: 'rect',
    fill: gsap.utils.shuffle([...colorPalette])[0]!,
    width: StageVirtualSize.width,
    height: StageVirtualSize.height,
    x: 0,
    y: 0,
  } satisfies CanvasElementOfType<'rect'>;
}
