import { useCallback, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Layer, Stage, Transformer } from 'react-konva';
import { Pause, Play } from 'lucide-react';
import { gsap } from 'gsap';

import styles from './AnimationPlayer.module.css';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { useResponsiveStage } from '@/hooks/useResponsiveStage';
import { useTimeline } from '@/hooks/useTimeline';
import {
  CanvasComponentByType,
  StageVirtualSize,
  waitUntilKonvaNodeSizeIsCalculated,
} from '@/utils/konva';
import { combineSlides } from '@/utils/animation';
import type { CanvasElement } from '@/utils/types';

import { Slider } from '@/components/Slider';

const slides = [
  [
    // Black right column
    {
      id: crypto.randomUUID(),
      type: 'rect',
      x: StageVirtualSize.width * 0.6,
      width: StageVirtualSize.width * 0.4,
      height: StageVirtualSize.height,
      fill: '#000000',
    },
    // Purple left square
    {
      id: crypto.randomUUID(),
      type: 'rect',
      width: StageVirtualSize.width * 0.65,
      height: StageVirtualSize.height,
      fill: '#d7adf4',
    },
    // Yellow bottom right row
    {
      id: crypto.randomUUID(),
      type: 'rect',
      x: StageVirtualSize.width * 0.55,
      y: StageVirtualSize.height * 0.55,
      width: StageVirtualSize.width * 0.45,
      height: StageVirtualSize.height * 0.45,
      fill: '#fffc5a',
    },
    // Bottom center image
    {
      id: crypto.randomUUID(),
      type: 'video',
      videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
      x: StageVirtualSize.width * 0.35,
      y: StageVirtualSize.height * 0.55,
      width: StageVirtualSize.width * 0.2,
      height: StageVirtualSize.height * 0.45,
    },
  ],
  [
    // Top right video
    {
      id: crypto.randomUUID(),
      type: 'video',
      videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
      x: StageVirtualSize.width * 0.61,
      width: StageVirtualSize.width * 0.39,
      height: StageVirtualSize.height,
    },
    // Yellow right column
    {
      id: crypto.randomUUID(),
      type: 'rect',
      x: StageVirtualSize.width * 0.55,
      width: StageVirtualSize.width * 0.06,
      height: StageVirtualSize.height,
      fill: '#fffc5a',
    },
    // Black left square
    {
      id: crypto.randomUUID(),
      type: 'rect',
      width: StageVirtualSize.width * 0.55,
      height: StageVirtualSize.height,
      fill: '#000000',
    },
    // Bottom right green row
    {
      id: crypto.randomUUID(),
      type: 'rect',
      x: StageVirtualSize.width * 0.35,
      y: StageVirtualSize.height * 0.65,
      width: StageVirtualSize.width * 0.65,
      height: StageVirtualSize.height * 0.35,
      fill: '#28fb9e',
    },
  ],
] satisfies CanvasElement[][];

export function AnimationPlayer() {
  const { canvasTree, loadCanvasTree } = useCanvasTreeStore();
  const { stageRef, layerRef } = useKonvaRefsStore();
  const { stageWrapperId } = useResponsiveStage({
    stageVirtualWidth: StageVirtualSize.width,
    stageVirtualHeight: StageVirtualSize.height,
    stageRef,
  });
  const {
    timeline,
    timelineCurrentTime,
    timelineEndTime,
    timelineState,
    setTimelineEndTime,
    handlePlayOrPause,
    handleChangeTime,
  } = useTimeline({
    onUpdate: useCallback(() => layerRef.current?.draw(), [layerRef]),
  });

  const combinedSlidesRef = useRef<
    ReturnType<typeof combineSlides> | undefined
  >(undefined);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Load canvas elements
    const combinedSlides = combineSlides(slides);
    combinedSlidesRef.current = combinedSlides;
    loadCanvasTree(combinedSlides.map(({ canvasElement }) => canvasElement));
  }, [loadCanvasTree, stageRef]);

  useEffect(() => {
    // Setup the GSAP timeline
    async function setupTimeline() {
      const stage = stageRef.current;
      const nodes = layerRef.current!.getChildren();
      const firstNode = nodes[0];
      const combinedSlides = combinedSlidesRef.current;
      if (!stage || !firstNode || !combinedSlides) return;

      // Hide the nodes so they are not visible before the timeline is set up
      nodes.forEach((node) => node.visible(false));

      /* The nodes attributes are not calculated instantly after adding them
      (even though this function says it waits until the node size is
      calculated, it technically waits until all initial properties are set,
      because they're all set at the same time) */
      await waitUntilKonvaNodeSizeIsCalculated(firstNode);

      combinedSlides.forEach((item, itemIndex) => {
        const node = nodes[itemIndex];
        if (!node) return;

        item.animations?.forEach((animation) => {
          const tween = animation.from
            ? gsap.from(node, {
                ...animation.from,
                duration: animation.duration,
              })
            : gsap.to(node, {
                ...animation.to,
                duration: animation.duration,
              });

          timeline.add(tween, animation.startTime);
        });
      });

      setTimelineEndTime(timeline.duration());

      // Pause the timeline so it doesn't play automatically
      timeline.pause();

      /* Show the nodes setting up the timeline, though they will not actually
      be visible yet because of the initial transition */
      nodes.forEach((node) => node.visible(true));
    }
    setupTimeline();
  }, [canvasTree, layerRef, setTimelineEndTime, stageRef, timeline]);

  return (
    <main>
      <Stage
        id={stageWrapperId}
        className="konva-stage-wrapper"
        width={StageVirtualSize.width}
        height={StageVirtualSize.height}
        ref={stageRef}
      >
        <Layer ref={layerRef}>
          {canvasTree.map((element) => {
            const { type, ...props } = element;
            const Component = CanvasComponentByType[type];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return <Component key={props.id} {...(props as any)} />;
          })}
        </Layer>
        {/* <Layer name="controllers">
          {canvasTree.map((element) => (
            <BorderTransformer key={element.id} elementId={element.id} />
          ))}
        </Layer> */}
      </Stage>

      <div className={styles.playerBar}>
        <button className={styles.playPauseButton} onClick={handlePlayOrPause}>
          {timelineState === 'playing' ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}
        </button>

        <Slider
          aria-label="Timeline"
          value={timelineCurrentTime}
          minValue={0}
          maxValue={timelineEndTime}
          step={0.001}
          bottomMargin="none"
          onChange={handleChangeTime}
        />

        <span className={styles.playerBarTime}>
          <span>{formatTime(timelineCurrentTime)}</span> /{' '}
          <span>{formatTime(timelineEndTime)}</span>
        </span>
      </div>
    </main>
  );
}

function formatTime(timeInSeconds: number) {
  const minutes = Math.floor(timeInSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(timeInSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Adds a border around the node with the provided ID. Used for debugging. */
function BorderTransformer({ elementId }: { elementId: string }) {
  const ref = useRef<Konva.Transformer>(null);
  const { layerRef } = useKonvaRefsStore();

  useEffect(() => {
    const node = layerRef.current?.getChildren().find((node) => {
      return node.id() === elementId;
    });
    if (!node) return;

    ref.current?.nodes([node]);
  }, [elementId, layerRef]);

  return (
    <Transformer
      resizeEnabled={false}
      rotateEnabled={false}
      keepRatio={false}
      ref={ref}
    />
  );
}
