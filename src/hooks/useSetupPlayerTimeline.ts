import { RefObject, useEffect, useState } from 'react';
import Konva from 'konva';

import { type combineSlides, createTweens } from '@/utils/generateAnimations';
import { waitUntilKonvaNodeSizeIsCalculated } from '@/utils/konva/misc';

export function useSetupPlayerTimeline({
  stageRef,
  layerRef,
  combinedSlides,
  timeline,
  updateTimelineDuration,
}: {
  stageRef: RefObject<Konva.Stage>;
  layerRef: RefObject<Konva.Layer>;
  combinedSlides: ReturnType<typeof combineSlides> | undefined;
  timeline: gsap.core.Timeline;
  updateTimelineDuration: () => void;
}) {
  const [konvaNodesLoaded, setKonvaNodesLoaded] = useState(false);
  const [isSetupFinished, setIsSetupFinished] = useState(false);

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
    const stage = stageRef.current;
    const nodes = layerRef.current!.getChildren();
    if (!stage || !combinedSlides || !konvaNodesLoaded) return;

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
  }, [
    combinedSlides,
    konvaNodesLoaded,
    layerRef,
    stageRef,
    timeline,
    updateTimelineDuration,
  ]);

  return { isSetupFinished };
}
