import { type RefObject, useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { toast } from 'sonner';
import { type } from 'arktype';

import {
  type addAnimationsToSlides,
  type combineSlides,
  createTweens,
  getWhichTransitionsSlideHas,
} from '@/utils/generateAnimations';
import {
  ENTER_EXIT_ELEMENT_TRANSITION_DURATION,
  MORPH_ELEMENT_TRANSITION_DURATION,
} from '@/utils/generateAnimations/setAnimationTimings';
import { waitUntilKonvaNodeSizeIsCalculated } from '@/utils/konva/misc';
import { findLast } from '@/utils/array';

export function useSetupPlayerTimeline({
  layerRef,
  animatedSlides,
  combinedSlides,
  slideIndexToPreview,
  timeline,
  updateTimelineDuration,
  handleChangeTime,
}: {
  layerRef: RefObject<Konva.Layer>;
  animatedSlides: ReturnType<typeof addAnimationsToSlides> | undefined;
  combinedSlides: ReturnType<typeof combineSlides> | undefined;
  slideIndexToPreview: number | undefined;
  timeline: gsap.core.Timeline;
  updateTimelineDuration: () => void;
  handleChangeTime: (time: number) => void;
}) {
  const [konvaNodesLoaded, setKonvaNodesLoaded] = useState(false);
  const [isSetupFinished, setIsSetupFinished] = useState(false);
  const isSetupFinishedRef = useRef(false);

  // Update the ref when the state changes
  useEffect(() => {
    isSetupFinishedRef.current = isSetupFinished;
  }, [isSetupFinished]);

  // Keep track of when the Konva nodes are loaded
  useEffect(() => {
    /* The nodes are only loaded after the slides are combined, so there's no
    point on trying to check before that */
    if (!combinedSlides) return;

    const interval = setInterval(async () => {
      const nodes = layerRef.current!.getChildren();
      const firstNode = nodes[0];
      if (!firstNode) return;

      if (!(firstNode instanceof Konva.Group)) {
        throw new Error('Node being animated is not contained within a group');
      }

      /* The nodes attributes are not calculated instantly after adding them
      (even though this function says it waits until the node size is
      calculated, it technically waits until all initial properties are set,
      because they're all set at the same time) */
      await waitUntilKonvaNodeSizeIsCalculated(firstNode.children[0]!);

      setKonvaNodesLoaded(true);
      clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, [combinedSlides, layerRef]);

  // Setup the GSAP timeline
  useEffect(() => {
    const timelineIsAlreadySetUp = isSetupFinishedRef.current;
    if (
      !animatedSlides ||
      !combinedSlides ||
      !konvaNodesLoaded ||
      timelineIsAlreadySetUp
    ) {
      return;
    }

    const nodes = layerRef.current!.getChildren();

    combinedSlides.canvasElements.forEach((item, itemIndex) => {
      const group = nodes[itemIndex];
      if (!group) return;

      if (!(group instanceof Konva.Group)) {
        throw new Error('Node being animated is not contained within a group');
      }

      item.animations?.forEach((animation) => {
        const node = group.children[0]!;
        const { groupTween, nodeTween } = createTweens({
          animation,
          group,
          node,
        });

        if (groupTween) {
          timeline.add(groupTween, animation.startTime);
        }
        if (nodeTween) {
          timeline.add(nodeTween, animation.startTime);
        }
      });
    });

    // Update the timeline duration after adding the animations
    updateTimelineDuration();

    // Pause the timeline so it doesn't play before its time
    timeline.pause();

    // Show the nodes that are visible from the start
    nodes.forEach((node) => node.visible(node.opacity() > 0));

    // Update the 'is setup finished' state
    setIsSetupFinished(true);

    // If the user wants to preview a slide, jump to it
    if (slideIndexToPreview !== undefined) {
      jumpToSlideToPreview({
        slideIndexToPreview,
        animatedSlides,
        handleChangeTime,
      });
    }
  }, [
    animatedSlides,
    combinedSlides,
    handleChangeTime,
    konvaNodesLoaded,
    layerRef,
    slideIndexToPreview,
    timeline,
    updateTimelineDuration,
  ]);

  return { isSetupFinished };
}

function validateSlideIndexToPreview(
  slides: { lessonParagraphIndex: number | undefined }[],
  unvalidatedSlideIndex: number
) {
  const lastLessonParagraphIndex = findLast(
    slides,
    (slide) => slide.lessonParagraphIndex !== undefined
  )?.lessonParagraphIndex;
  if (lastLessonParagraphIndex === undefined) {
    toast.error(
      'Cannot skip to the slide you want to preview because the slideshow is using an old format.' +
        ' If you want to be able to skip to a slide, you will need to generate the slides again by making any changes to the lesson.'
    );
    return null;
  }

  const { data: validatedSlideIndex } = type(
    `0<=number<=${lastLessonParagraphIndex}`
  )(unvalidatedSlideIndex);

  if (validatedSlideIndex === undefined) {
    toast.error('The slide you are trying to preview does not exist.');
    return null;
  }

  return validatedSlideIndex;
}

function jumpToSlideToPreview({
  slideIndexToPreview: unvalidatedSlideIndexToPreview,
  animatedSlides,
  handleChangeTime,
}: {
  slideIndexToPreview: number;
  animatedSlides: ReturnType<typeof addAnimationsToSlides>;
  handleChangeTime: (time: number) => void;
}) {
  const slideIndexToPreview = validateSlideIndexToPreview(
    animatedSlides,
    unvalidatedSlideIndexToPreview
  );
  if (slideIndexToPreview === null) return;

  const slideToPreview = animatedSlides.find(
    (slide) => slide.lessonParagraphIndex === slideIndexToPreview
  );
  // The slide should always exist, as the index is validated beforehand
  if (!slideToPreview) {
    toast.error('The slide you are trying to preview does not exist.');
    return;
  }

  /* The slideshow should start right before the morph animation between the
  previous slide and the slide to preview */
  let timeToJumpTo = slideToPreview.startTime;
  const { slideHasEnterAnimation, slideHasMorphAnimation } =
    getWhichTransitionsSlideHas(slideToPreview);
  if (slideHasEnterAnimation) {
    timeToJumpTo -= ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
  }
  if (slideHasMorphAnimation) {
    timeToJumpTo -= MORPH_ELEMENT_TRANSITION_DURATION;
  }

  handleChangeTime(timeToJumpTo);
}
