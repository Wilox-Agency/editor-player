import type { CanvasElementWithAnimationAttributes } from './sharedTypes';
import { checkProperty } from '@/utils/validation';
import type { Slide } from '@/utils/types';

/**
 * Creates dummy elements to be used with the shared element slide-in
 * animations.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array.
 */
export function createDummyElementsForSharedElementSlideInAnimation(
  slides: Slide<CanvasElementWithAnimationAttributes>[]
) {
  for (const [slideIndex, slide] of slides.entries()) {
    const reversedElements = [...slide.canvasElements].reverse();

    let currentIndex = slide.canvasElements.length - 1;
    for (const element of reversedElements) {
      const isElementSharedWithPreviousSlideWithSlideInAnimation =
        checkProperty(
          element,
          'animationAttributes.sharedWithPreviousSlide.animationType',
          'slideIn'
        );

      if (isElementSharedWithPreviousSlideWithSlideInAnimation) {
        const previousSlide = slides[slideIndex - 1];

        // Get the shared element from the previous slide
        const sharedElementFromPreviousSlide =
          previousSlide?.canvasElements.find((elementFromPreviousSlide) => {
            const isSharedElement =
              elementFromPreviousSlide.animationAttributes.sharedWithNextSlide
                ?.sharedId ===
              element.animationAttributes.sharedWithPreviousSlide.sharedId;
            return isSharedElement;
          });
        if (!sharedElementFromPreviousSlide) {
          throw new Error(
            "Trying to set slide-in animation for shared element, but couldn't find shared element from previous slide."
          );
        }

        // Create a dummy element to be used for the slide-in animation
        slide.canvasElements.splice(currentIndex, 0, {
          attributes: {
            ...sharedElementFromPreviousSlide.attributes,
            id: crypto.randomUUID(),
          },
          animationAttributes: {
            isDummyElementForSlideInAnimation: true,
          },
        } as CanvasElementWithAnimationAttributes);

        /* Decrementing the index again as the element used for the slide-in
        animation is added before the current element, so index would point to
        it instead of the element that was originally before current element */
        currentIndex--;
      }

      currentIndex--;
    }
  }

  return slides;
}
