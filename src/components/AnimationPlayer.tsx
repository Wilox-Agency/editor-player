import { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Layer, Stage, Transformer } from 'react-konva';
import { Pause, Play } from 'lucide-react';
import { gsap } from 'gsap';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { useResponsiveStage } from '@/hooks/useResponsiveStage';
import {
  CanvasComponentByType,
  StageVirtualSize,
  waitUntilKonvaNodeSizeIsCalculated,
} from '@/utils/konva';
import { combineSlides } from '@/utils/animation';
import type { CanvasElement } from '@/utils/types';

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

  // Creating a stable reference to the timeline
  const timeline = useMemo(() => gsap.timeline(), []);
  const [timelineState, setTimelineState] = useState<
    'playing' | 'paused' | 'ended'
  >('paused');
  const combinedSlidesRef = useRef<
    ReturnType<typeof combineSlides> | undefined
  >(undefined);

  function handlePlayOrPause() {
    const timelineEnded = timeline.time() === timeline.duration();

    // If the timeline ended, reset and play it
    if (timelineEnded) {
      timeline.time(0);
      timeline.play();

      setTimelineState('playing');
      return;
    }

    // If the timeline is playing, pause it
    if (timeline.isActive()) {
      timeline.pause();

      setTimelineState('paused');
      return;
    }

    // If the timeline is paused, resume it
    timeline.resume();
    setTimelineState('playing');
  }

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

      timeline.eventCallback('onUpdate', () => {
        layerRef.current?.draw();
      });
      timeline.eventCallback('onComplete', () => {
        setTimelineState('ended');
      });
      timeline.pause();

      /* Showing the nodes setting up the timeline, though they're not actually
      visible yet because of the initial transition */
      nodes.forEach((node) => node.visible(true));
    }
    setupTimeline();
  }, [canvasTree, layerRef, stageRef, timeline]);

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

      <div
        style={{
          backgroundColor: 'var(--clr-neutral-background)',
          position: 'absolute',
          left: '0.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '0.5rem',
          boxShadow: '0 0 50px -12px rgb(24 24 27 / 0.9)',
        }}
      >
        <button
          style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
          onClick={handlePlayOrPause}
        >
          {timelineState === 'playing' ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}
        </button>
      </div>
    </main>
  );
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
