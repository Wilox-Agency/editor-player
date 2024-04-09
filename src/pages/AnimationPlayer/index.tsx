import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Konva from 'konva';
import { Group, Layer, Stage } from 'react-konva';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import styles from './AnimationPlayer.module.css';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { useResponsiveStage } from '@/hooks/useResponsiveStage';
import {
  usePlayerTimeline,
  usePlayerTimelineStore,
} from '@/hooks/usePlayerTimeline';
import { CanvasComponentByType, StageVirtualSize } from '@/utils/konva';
import { getCanvasElementRect } from '@/utils/konva/rect';
import { waitUntilKonvaNodeSizeIsCalculated } from '@/utils/konva/misc';
import { generateSlides } from '@/utils/generateSlides';
import { parseSlideshowLesson } from '@/utils/generateSlides/parse';
import { combineSlides, createTweens } from '@/utils/slidesPlayer';
import { fetchSlideshowLesson } from '@/utils/queries';
import { prefetchAssetsFromCanvasElements } from '@/utils/asset';
import { preloadAudios, getAudioDuration } from '@/utils/audio';

import { PlayerBar } from '@/components/PlayerBar';
import { validateUrl } from '@/utils/validation';

export default function AnimationPlayer() {
  const { state: slideshowLessonFromHomePage, search: searchParams } =
    useLocation();

  const { data: slideshowLesson, error } = useQuery({
    enabled: !slideshowLessonFromHomePage,
    queryKey: ['slideshowLesson', searchParams],
    queryFn: async () => {
      const searchParamsObject = new URLSearchParams(searchParams);

      const courseId = searchParamsObject.get('courseId');
      const lessonId = searchParamsObject.get('lessonId');

      if (!courseId || !lessonId) {
        throw new Error(
          '`courseId` or `lessonId` query parameters are missing.'
        );
      }

      const promise = fetchSlideshowLesson({ courseId, lessonId });
      /* Using a timeout is required to render a toast on initial page load. See
      https://sonner.emilkowal.ski/toast#render-toast-on-page-load */
      setTimeout(() => {
        toast.promise(promise, {
          loading: 'Fetching slideshow lesson...',
          success: 'Slideshow lesson found!',
          error: (error) => {
            if (error instanceof Error) return error.message;
            return 'Slideshow lesson not found.';
          },
        });
      });
      return await promise;
    },
  });

  // Generate slides
  const { data: slides } = useQuery({
    enabled: !!slideshowLessonFromHomePage || !!slideshowLesson,
    queryKey: ['generateSlides', slideshowLessonFromHomePage, slideshowLesson],
    queryFn: async () => {
      // Generate slides from the lesson
      let slidesPromise;
      if (slideshowLessonFromHomePage) {
        slidesPromise = generateSlides(
          parseSlideshowLesson(slideshowLessonFromHomePage)
        );
      } else {
        /* TODO: Instead of generating the slides every time, check if there are
        slides already saved alongside the lesson and generate them if not */
        slidesPromise = generateSlides(parseSlideshowLesson(slideshowLesson!));
      }

      toast.promise(slidesPromise, {
        loading: 'Generating slides...',
        success: 'Slides generated successfully!',
        error: (error) => {
          if (import.meta.env.DEV) {
            console.log(error);
          }
          return 'Could not generate slides, please check if there are any broken images in the slideshow lesson.';
        },
      });
      return await slidesPromise;
    },
  });

  // Get the background music
  const { data: backgroundMusic, isLoading: isLoadingBackgroundMusic } =
    useQuery({
      enabled: !!slideshowLessonFromHomePage || !!slideshowLesson,
      queryKey: [
        'backgroundMusic',
        slideshowLessonFromHomePage,
        slideshowLesson,
      ],
      queryFn: async () => {
        let backgroundMusicUrl;
        if (slideshowLessonFromHomePage) {
          type SlideshowLesson = Parameters<typeof parseSlideshowLesson>[0];
          backgroundMusicUrl = (slideshowLessonFromHomePage as SlideshowLesson)
            .backgroundMusicUrl;
        }
        if (slideshowLesson) {
          backgroundMusicUrl = slideshowLesson.backgroundMusicUrl;
        }

        if (backgroundMusicUrl && !validateUrl(backgroundMusicUrl)) {
          /* When there's an invalid background music URL, it's being assumed
          that it's just missing the base URL */
          const backgroundMusicBaseUrl = import.meta.env
            .VITE_BACKGROUND_MUSIC_BASE_URL;
          backgroundMusicUrl = backgroundMusicBaseUrl + backgroundMusicUrl;
        }

        if (!backgroundMusicUrl) return null;

        const audioDuration = await getAudioDuration(backgroundMusicUrl);
        if (audioDuration === undefined) return null;

        return { url: backgroundMusicUrl, duration: audioDuration };
      },
    });

  // Generate animations
  const combinedSlides = useMemo(() => {
    if (!slides) return undefined;
    return combineSlides(slides);
  }, [slides]);

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
  } = usePlayerTimeline({
    layerRef,
    audios: combinedSlides?.audios || [],
    backgroundMusic: backgroundMusic || undefined,
  });

  // Setup player
  useEffect(() => {
    if (!combinedSlides || isLoadingBackgroundMusic) return;

    // Load canvas tree
    const canvasElements = combinedSlides.canvasElements.map(
      ({ attributes: canvasElement }) => canvasElement
    );
    loadCanvasTree(canvasElements);

    // Prefetch assets
    prefetchAssetsFromCanvasElements(canvasElements);
    // Preload audios, including background music if there's one
    preloadAudios([
      ...combinedSlides.audios,
      ...(backgroundMusic ? [backgroundMusic] : []),
    ]);
  }, [
    backgroundMusic,
    combinedSlides,
    isLoadingBackgroundMusic,
    loadCanvasTree,
  ]);

  // Setup the GSAP timeline
  useEffect(() => {
    (async () => {
      const stage = stageRef.current;
      const nodes = layerRef.current!.getChildren();
      const firstNode = nodes[0];
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

      combinedSlides.canvasElements.forEach((item, itemIndex) => {
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

      // Show the nodes that are visible from the start
      nodes.forEach((node) => node.visible(node.opacity() > 0));
    })();
  }, [combinedSlides, layerRef, stageRef, timeline, updateTimelineDuration]);

  // Clear canvas tree and reset timeline when the component is destroyed
  useEffect(() => {
    return () => {
      useCanvasTreeStore.getState().loadCanvasTree([]);
      usePlayerTimelineStore.getState().reset();
    };
  }, []);

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
        <Layer listening={false} ref={layerRef}>
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
      </Stage>

      {canvasTree.length > 0 && (
        <PlayerBar
          handlePlayOrPause={handlePlayOrPause}
          handleChangeTime={handleChangeTime}
        />
      )}

      {error && (
        <div className={styles.error} role="alert">
          <h1 className={styles.errorTitle}>Error!</h1>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      )}
    </main>
  );
}
