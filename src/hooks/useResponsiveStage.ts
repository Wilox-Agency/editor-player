import { type RefObject, useCallback, useId } from 'react';
import type Konva from 'konva';

import { useStageScaleStore } from '@/hooks/useStageScaleStore';
import { useWindowResize } from '@/hooks/useWindowResize';

export function useResponsiveStage({
  stageVirtualWidth,
  stageVirtualHeight,
  stageRef,
}: {
  stageVirtualWidth: number;
  stageVirtualHeight: number;
  stageRef: RefObject<Konva.Stage>;
}) {
  const updateScale = useStageScaleStore((state) => state.updateScale);
  const stageWrapperId = useId();

  useWindowResize(
    useCallback(() => {
      /**
       * A wrapper element around the stage container. This element defines the
       * available space for the stage.
       */
      const stageWrapper = document.getElementById(stageWrapperId);
      const stageContainer = document.querySelector(
        '.konvajs-content'
      ) as HTMLElement | null;
      const stage = stageRef.current;

      if (!stageWrapper || !stageContainer || !stage) return;

      // Calculate the aspect ratios
      const wrapperAspectRatio =
        stageWrapper.offsetWidth / stageWrapper.offsetHeight;
      const stageAspectRatio = stageVirtualWidth / stageVirtualHeight;

      /* Calculate the scale that needs to be set to fit the stage wrapper but
      keeping the stage's aspect ratio */
      let scale: number;
      if (wrapperAspectRatio >= stageAspectRatio) {
        scale = stageWrapper.offsetHeight / stageVirtualHeight;
      } else {
        scale = stageWrapper.offsetWidth / stageVirtualWidth;
      }

      // Update the scale and get the separated scales
      const { stageCanvasScale, stageContainerScale } = updateScale(scale);

      // Update the stage size and scale
      stage.size({
        width: stageVirtualWidth * stageCanvasScale,
        height: stageVirtualHeight * stageCanvasScale,
      });
      stage.scale({ x: stageCanvasScale, y: stageCanvasScale });

      // Update the stage container scale
      stageContainer.style.setProperty(
        'transform',
        `scale(${stageContainerScale})`
      );
    }, [
      stageRef,
      stageVirtualHeight,
      stageVirtualWidth,
      stageWrapperId,
      updateScale,
    ])
  );

  return {
    /**
     * ID to be used in your `Stage` component from `react-konva` (its `id`
     * prop goes to a wrapper element around the stage container).
     */
    stageWrapperId,
  };
}
