import { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Group, Layer, Stage, Transformer } from 'react-konva';
import { Pause, Play } from 'lucide-react';

import styles from './AnimationPlayer.module.css';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { useResponsiveStage } from '@/hooks/useResponsiveStage';
import {
  usePlayerTimeline,
  usePlayerTimelineStore,
} from '@/hooks/usePlayerTimeline';
import {
  CanvasComponentByType,
  StageVirtualSize,
  waitUntilKonvaNodeSizeIsCalculated,
} from '@/utils/konva';
import { combineSlides, createTweens } from '@/utils/slidesPlayer';
import { getCanvasElementRect } from '@/utils/slidesPlayer/sizes';
import type { Slide } from '@/utils/types';

import { Slider } from '@/components/Slider';

const slidesWithValuesAsPercentages = [
  // Slide 1
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 0,
        y: 0,
        width: 36,
        height: 78,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 36,
        y: 0,
        width: 64,
        height: 78,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        text: 'Redes sociales y Salud mental',
        x: 44,
        y: 25,
        width: 45,
        fill: '#D1A3F3',
        fontSize: 12,
        lineHeight: 1.2,
        fontStyle: 'bold',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 78,
        width: 52,
        height: 22,
        fill: '#28fa9d',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 52,
        y: 78,
        width: 10,
        height: 22,
        fill: '#fffc5a',
      },
    ],
    duration: 2,
  },
  // Slide 2
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 64,
        height: 100,
        fill: '#D1A3F3',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 64,
        y: 0,
        width: 36,
        height: 53,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 36,
        y: 53,
        width: 19,
        height: 47,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 55,
        y: 53,
        width: 45,
        height: 47,
        fill: '#fffc5a',
      },
    ],
    duration: 2,
  },
  // Slide 3
  {
    canvasElements: [
      // {
      //   id: crypto.randomUUID(),
      //   type: 'rect',
      //   x: 0,
      //   y: 0,
      //   width: 100,
      //   height: 100,
      //   fill: '#D1A3F3',
      // },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 59,
        height: 100,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 59,
        y: 0,
        width: 41,
        height: 64,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 36,
        y: 64,
        width: 64,
        height: 36,
        fill: '#22fc92',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 59,
        y: 0,
        width: 6,
        height: 64,
        fill: '#fffb4e',
      },
    ],
    duration: 2,
  },
  // Slide 4
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#D1A3F3',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 95,
        y: 0,
        width: 5,
        height: 100,
        fill: '#22fc92',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 38,
        y: 59,
        width: 62,
        height: 41,
        fill: '#fffb4e',
      },
    ],
    duration: 2,
  },
  // Slide 5
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#D1A3F3',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 64,
        height: 47,
        fill: '#22fc92',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 47,
        width: 46,
        height: 53,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 46,
        y: 47,
        width: 54,
        height: 53,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 64,
        y: 0,
        width: 5,
        height: 47,
        fill: '#fffb4e',
      },
    ],
    duration: 2,
  },
  // Slide 6
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 79,
        height: 87,
        fill: '#D1A3F3',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 54,
        y: 47,
        width: 46,
        height: 53,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 32,
        y: 47,
        width: 22,
        height: 53,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 79,
        y: 0,
        width: 21,
        height: 47,
        fill: '#22fc92',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 87,
        width: 32,
        height: 13,
        fill: '#fffb4e',
      },
    ],
    duration: 2,
  },
  // Slide 7
  {
    canvasElements: [
      // {
      //   id: crypto.randomUUID(),
      //   type: 'rect',
      //   x: 0,
      //   y: 0,
      //   width: 100,
      //   height: 100,
      //   fill: '#D1A3F3',
      // },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 60,
        height: 100,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 60,
        y: 0,
        width: 40,
        height: 57,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 50,
        y: 57,
        width: 50,
        height: 43,
        fill: '#22fc92',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 38,
        y: 78,
        width: 12,
        height: 22,
        fill: '#fffb4e',
      },
      // {
      //   id: crypto.randomUUID(),
      //   type: 'rect',
      //   x: 50,
      //   y: 57,
      //   width: 50,
      //   height: 43,
      //   fill: '#D1A3F3',
      // },
      // {
      //   id: crypto.randomUUID(),
      //   type: 'rect',
      //   x: 50,
      //   y: 57,
      //   width: 50,
      //   height: 43,
      //   fill: '#bdbabb',
      // },
    ],
    duration: 2,
  },
  // Slide 7.1
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 60,
        height: 100,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 60,
        y: 0,
        width: 40,
        height: 57,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 50,
        y: 57,
        width: 50,
        height: 43,
        fill: '#D1A3F3',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 38,
        y: 78,
        width: 12,
        height: 22,
        fill: '#fffb4e',
      },
    ],
    duration: 2,
  },
  // Slide 7.2
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 60,
        height: 100,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 60,
        y: 0,
        width: 40,
        height: 57,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 50,
        y: 57,
        width: 50,
        height: 43,
        fill: '#bdbabb',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 38,
        y: 78,
        width: 12,
        height: 22,
        fill: '#fffb4e',
      },
    ],
    duration: 2,
  },
  // Slide 8
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 94,
        y: 0,
        width: 6,
        height: 40,
        fill: '#22fc92',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 85,
        width: 15,
        height: 15,
        fill: '#fffb4e',
      },
    ],
    duration: 2,
  },
  // Slide 9
  {
    canvasElements: [
      // {
      //   id: crypto.randomUUID(),
      //   type: 'rect',
      //   x: 0,
      //   y: 0,
      //   width: 100,
      //   height: 100,
      //   fill: '#22f990',
      // },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 0,
        y: 0,
        width: 44,
        height: 100,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 44,
        y: 0,
        width: 56,
        height: 38,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 35,
        y: 38,
        width: 65,
        height: 62,
        fill: '#fffb4e',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 69,
        y: 38,
        width: 31,
        height: 62,
        fill: '#D1A3F3',
      },
    ],
    duration: 2,
  },
  // Slide 10
  {
    canvasElements: [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 58,
        width: 33,
        height: 42,
        fill: '#000000',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 0,
        y: 0,
        width: 60,
        height: 58,
        fill: '#D1A3F3',
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 60,
        y: 0,
        width: 5,
        height: 58,
        fill: '#fffb4e',
      },
      {
        id: crypto.randomUUID(),
        type: 'video',
        videoUrl: '/pexels-han-kaya-13675462 (360p).mp4',
        objectFit: 'cover',
        x: 65,
        y: 0,
        width: 35,
        height: 58,
      },
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: 33,
        y: 58,
        width: 67,
        height: 42,
        fill: '#22fc92',
      },
    ],
    duration: 2,
  },
] satisfies Slide[];

const slides = slidesWithValuesAsPercentages.map((slide) => {
  return {
    ...slide,
    canvasElements: slide.canvasElements.map((canvasElement) => {
      return {
        ...canvasElement,
        x: (canvasElement.x / 100) * StageVirtualSize.width,
        y: (canvasElement.y / 100) * StageVirtualSize.height,
        ...(canvasElement.width !== undefined
          ? { width: (canvasElement.width / 100) * StageVirtualSize.width }
          : {}),
        ...(canvasElement.type !== 'text'
          ? { height: (canvasElement.height / 100) * StageVirtualSize.height }
          : {
              fontSize:
                (canvasElement.fontSize / 100) * StageVirtualSize.height,
            }),
      };
    }),
  };
});

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
    updateTimelineDuration,
    handlePlayOrPause,
    handleChangeTime,
  } = usePlayerTimeline({ layerRef });

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

      if (!(firstNode instanceof Konva.Group)) {
        throw new Error('Node being animated is not contained within a group');
      }

      // Hide the nodes so they are not visible before the timeline is set up
      nodes.forEach((node) => node.visible(false));

      /* The nodes attributes are not calculated instantly after adding them
      (even though this function says it waits until the node size is
      calculated, it technically waits until all initial properties are set,
      because they're all set at the same time) */
      await waitUntilKonvaNodeSizeIsCalculated(firstNode.children[0]!);

      combinedSlides.forEach((item, itemIndex) => {
        const group = nodes[itemIndex];
        if (!group) return;

        if (!(group instanceof Konva.Group)) {
          throw new Error(
            'Node being animated is not contained within a group'
          );
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

      // Pause the timeline so it doesn't play automatically
      timeline.pause();

      /* Show the nodes setting up the timeline, though they will not actually
      be visible yet because of the initial transition */
      nodes.forEach((node) => node.visible(true));
    }
    setupTimeline();
  }, [canvasTree, layerRef, stageRef, timeline, updateTimelineDuration]);

  return (
    <main>
      <Stage
        id={stageWrapperId}
        className="konva-stage-wrapper"
        style={{
          '--canvas-background-color': '#f0e6e6',
        }}
        width={StageVirtualSize.width}
        height={StageVirtualSize.height}
        ref={stageRef}
      >
        <Layer ref={layerRef}>
          {canvasTree.map((element) => {
            const { type, ...props } = element;
            const Component = CanvasComponentByType[type];

            const { x, y, ...otherProps } = props;

            const elementRect = getCanvasElementRect(element);

            return (
              <Group
                key={props.id}
                x={x}
                y={y}
                clipX={0}
                clipY={0}
                clipWidth={elementRect.width}
                clipHeight={elementRect.height}
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Component {...(otherProps as any)} />
              </Group>
            );
          })}
        </Layer>
        {/* <Layer name="controllers">
          {canvasTree.map((element) => (
            <BorderTransformer key={element.id} elementId={element.id} />
          ))}
        </Layer> */}
      </Stage>

      <PlayerBar
        handlePlayOrPause={handlePlayOrPause}
        handleChangeTime={handleChangeTime}
      />
    </main>
  );
}

function PlayerBar({
  handlePlayOrPause,
  handleChangeTime,
}: {
  handlePlayOrPause: () => void;
  handleChangeTime: (time: number) => void;
}) {
  const { timelineCurrentTime, timelineDuration, timelineState } =
    usePlayerTimelineStore();

  return (
    <div className={styles.playerBar}>
      <button className={styles.playPauseButton} onClick={handlePlayOrPause}>
        {timelineState === 'playing' ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <Slider
        aria-label="Timeline"
        value={timelineCurrentTime}
        minValue={0}
        maxValue={timelineDuration}
        step={0.001}
        bottomMargin="none"
        onChange={handleChangeTime}
      />

      <span className={styles.playerBarTime}>
        <span>{formatTime(timelineCurrentTime)}</span> /{' '}
        <span>{formatTime(timelineDuration)}</span>
      </span>
    </div>
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
