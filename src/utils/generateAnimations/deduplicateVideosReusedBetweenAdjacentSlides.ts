import type { CanvasElementWithAnimations } from './sharedTypes';
import { checkProperty } from '@/utils/validation';
import type { SlideWithAudioAndStartTime } from '@/utils/types';

type CanvasVideoElementWithAnimations = Extract<
  CanvasElementWithAnimations,
  { attributes: { type: 'video' } }
>;

/**
 * Deduplicates videos that are reused between adjacent slides.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array.
 */
export function deduplicateVideosReusedBetweenAdjacentSlides(
  slides: SlideWithAudioAndStartTime<CanvasElementWithAnimations>[]
) {
  const elementsToCheck: {
    idSharedWithNextSlide: string;
    accumulatorElement: CanvasVideoElementWithAnimations;
  }[] = [];

  for (const [slideIndex, slide] of slides.entries()) {
    const nextSlide = slides[slideIndex + 1];
    if (!nextSlide) continue;

    elementsToCheck.push(
      ...slide.canvasElements
        // Filtering just the video elements that are shared with the next slide with no animation
        .filter((element): element is CanvasVideoElementWithAnimations => {
          const isVideoElement = checkProperty(
            element,
            'attributes.type',
            'video'
          );
          if (!isVideoElement) return false;

          const isSharedWithNextSlideWithNoAnimation =
            element.animationAttributes.sharedWithNextSlide?.animationType ===
            'none';
          return isSharedWithNextSlideWithNoAnimation;
        })
        .map((element) => {
          return {
            idSharedWithNextSlide:
              element.animationAttributes.sharedWithNextSlide!.sharedId,
            accumulatorElement: element,
          } satisfies (typeof elementsToCheck)[number];
        })
    );

    const indexesToRemoveFromElementsToCheck: number[] = [];

    for (const [
      indexOfElementToCheck,
      elementToCheck,
    ] of elementsToCheck.entries()) {
      const indexOfElementFromNextSlide = nextSlide.canvasElements.findIndex(
        ({ animationAttributes }) => {
          return (
            animationAttributes.sharedWithPreviousSlide?.sharedId !==
              undefined &&
            animationAttributes.sharedWithPreviousSlide.sharedId ===
              elementToCheck.idSharedWithNextSlide
          );
        }
      );
      if (indexOfElementFromNextSlide === -1) {
        throw new Error('Could not find shared element from next slide.');
      }

      const elementFromNextSlide =
        nextSlide.canvasElements[indexOfElementFromNextSlide]!;

      const videoStartTimeWasAlreadySaved =
        elementToCheck.accumulatorElement.animationAttributes.startTime !==
        undefined;
      // If the start time of the video was not saved yet, then save it
      if (!videoStartTimeWasAlreadySaved) {
        elementToCheck.accumulatorElement.animationAttributes.startTime =
          slide.startTime;
      }

      // Save/update the end time of the video
      elementToCheck.accumulatorElement.animationAttributes.endTime =
        nextSlide.startTime + nextSlide.duration;

      if (elementToCheck.accumulatorElement.animations) {
        /* Remove from the current element the animations that transition to the
        next slide (if they weren't removed yet) */
        elementToCheck.accumulatorElement.animations =
          elementToCheck.accumulatorElement.animations.filter((animation) => {
            return animation.type !== 'disappear' && animation.type !== 'exit';
          });
      }

      if (
        elementFromNextSlide.animationAttributes.sharedWithNextSlide !==
        undefined
      ) {
        /* If the element from the next slide is also shared with its next
        slide, then it needs to be checked too */
        elementToCheck.idSharedWithNextSlide =
          elementFromNextSlide.animationAttributes.sharedWithNextSlide.sharedId;
      } else {
        /* Else, the element can be marked to be removed from the
        `elementsToCheck` array after the loop */
        indexesToRemoveFromElementsToCheck.push(indexOfElementToCheck);
        // And its exit animations can be copied to the current element
        elementToCheck.accumulatorElement.animations = [
          ...(elementToCheck.accumulatorElement.animations || []),
          ...(elementFromNextSlide.animations || []).filter((animation) => {
            return animation.type === 'exit' || animation.type === 'disappear';
          }),
        ];
      }

      /* Since the element is no longer shared with the next slide, remove the
      `sharedWithNextSlide` from the element (if it hasn't been removed yet) */
      delete elementToCheck.accumulatorElement.animationAttributes
        .sharedWithNextSlide;

      /* Remove the `elementFromNextSlide` from the next slide since it's not
      necessary anymore */
      nextSlide.canvasElements.splice(indexOfElementFromNextSlide, 1);
    }

    // Remove the elements from the `elementsToCheck` array
    [...indexesToRemoveFromElementsToCheck].reverse().forEach((index) => {
      elementsToCheck.splice(index, 1);
    });
  }

  return slides;
}
