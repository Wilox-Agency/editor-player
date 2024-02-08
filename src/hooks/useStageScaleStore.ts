import { create } from 'zustand';

type StageScaleState = {
  /**
   * The scale of the stage without distinction between the scale that will be
   * used in the stage canvas and the scale that will be used in the stage
   * container.
   */
  scale: number;
  /** The scale that will be used in the stage canvas. */
  stageCanvasScale: number;
  /** The scale that will be used in the stage container. */
  stageContainerScale: number;
};

type StageScaleStore = StageScaleState & {
  updateScale: (scale: number) => Omit<StageScaleState, 'scale'>;
};

export const useStageScaleStore = create<StageScaleStore>((set) => ({
  scale: 1,
  stageCanvasScale: 1,
  stageContainerScale: 1,
  updateScale: (scale) => {
    const stageCanvasScale = scale <= 1 ? scale : 1;
    const stageContainerScale = scale >= 1 ? scale : 1;

    set({
      scale,
      stageCanvasScale,
      stageContainerScale,
    } satisfies StageScaleState);
    return { stageCanvasScale, stageContainerScale };
  },
}));
