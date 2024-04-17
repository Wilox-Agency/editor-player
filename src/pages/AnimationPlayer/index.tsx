import { type PointerEvent, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
import { useSetupPlayerTimeline } from '@/hooks/useSetupPlayerTimeline';
import { CanvasComponentByType, StageVirtualSize } from '@/utils/konva';
import { getCanvasElementRect } from '@/utils/konva/rect';
import { generateSlides } from '@/utils/generateSlides';
import { parseSlideshowLesson } from '@/utils/generateSlides/parse';
import { combineSlides } from '@/utils/generateAnimations';
import { fetchSlideshowLessonOrSlides } from '@/utils/queries';
import { saveSlidesToSlideshowLesson } from '@/utils/mutations';
import { waitUntilAllSupportedFontsLoad } from '@/utils/font';
import { prefetchAssetsFromCanvasElements } from '@/utils/asset';
import { getAudioDuration, preloadAudios } from '@/utils/audio';
import { validateUrl } from '@/utils/validation';
import { MouseButton } from '@/utils/input';
import type { SlideshowLessonWithExternalInfo } from '@/utils/types';

import { PlayerBar } from '@/components/PlayerBar';
import { PlayerOrganizationLogo } from '@/components/PlayerOrganizationLogo';

export default function AnimationPlayer() {
  const { state: slideshowLessonFromHomePage, search: searchParams } =
    useLocation();

  /* Get the slideshow lesson or slides from the server if the slideshow lesson
  was not already provided by the user through the home page form */
  const { data: slideshowLessonOrSlidesFromServer, error } = useQuery({
    enabled: !slideshowLessonFromHomePage,
    queryKey: ['slideshowLessonOrSlidesFromServer', searchParams],
    queryFn: async () => {
      const searchParamsObject = new URLSearchParams(searchParams);
      const courseId = searchParamsObject.get('courseId');
      const lessonId = searchParamsObject.get('lessonId');
      if (!courseId || !lessonId) {
        throw new Error(
          '`courseId` or `lessonId` query parameters are missing.'
        );
      }

      const promise = fetchSlideshowLessonOrSlides({ courseId, lessonId });
      /* Using a timeout is required to render a toast on initial page load. See
      https://sonner.emilkowal.ski/toast#render-toast-on-page-load */
      setTimeout(() => {
        toast.promise(promise, {
          loading: 'Fetching slideshow lesson...',
          success: (slideshowLessonOrSlides) => {
            if ('slides' in slideshowLessonOrSlides) {
              return 'Found up to date slides!';
            }
            return 'Slideshow lesson found!';
          },
          error: (error) => {
            if (error instanceof Error) return error.message;
            return 'Slideshow lesson not found.';
          },
        });
      });
      return await promise;
    },
  });

  /* Get the slideshow lesson that will be used to generate the slides if the
  slides were not already fetched from the server */
  const slideshowLesson = useMemo(() => {
    if (slideshowLessonFromHomePage) {
      return slideshowLessonFromHomePage as
        | SlideshowLessonWithExternalInfo
        | undefined;
    }
    if (
      slideshowLessonOrSlidesFromServer &&
      'elementLesson' in slideshowLessonOrSlidesFromServer
    ) {
      return slideshowLessonOrSlidesFromServer;
    }
  }, [slideshowLessonFromHomePage, slideshowLessonOrSlidesFromServer]);

  /* Wait until all fonts are loaded before generating or rendering the slides
  to prevent wrong text measurements and prevent any text from being drawn
  incorrectly */
  const { isLoading: isLoadingFonts } = useQuery({
    queryKey: ['loadFonts'],
    queryFn: async () => {
      await waitUntilAllSupportedFontsLoad();
      return null;
    },
  });

  // Generate slides if they were not fetched from the server
  const { data: generatedSlides } = useQuery({
    enabled: !!slideshowLesson && !isLoadingFonts,
    queryKey: ['generateSlides', slideshowLesson],
    queryFn: async () => {
      // Generate slides from the lesson
      const slidesPromise = generateSlides(
        parseSlideshowLesson(slideshowLesson!)
      );

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

  /* If the slides were generated now, and they used the slideshow lesson fetched
  from the server, save the generated slides */
  useEffect(() => {
    /* Prevent saving slides that were generated based on the slideshow lesson
    from the home page */
    const slidesWereGeneratedFromFetchedSlideshowLesson =
      generatedSlides &&
      slideshowLessonOrSlidesFromServer &&
      'elementLesson' in slideshowLessonOrSlidesFromServer;
    if (!slidesWereGeneratedFromFetchedSlideshowLesson) return;

    const searchParamsObject = new URLSearchParams(searchParams);
    const courseId = searchParamsObject.get('courseId');
    const lessonId = searchParamsObject.get('lessonId');
    if (!courseId || !lessonId) return;

    const saveSlidesPromise = saveSlidesToSlideshowLesson({
      courseId,
      lessonId,
      slides: generatedSlides,
    });

    toast.promise(saveSlidesPromise, {
      loading: 'Saving slides...',
      success: 'Slides saved successfully!',
      error: (error) => {
        if (error instanceof Error) return error.message;
        return 'Could not save slides.';
      },
    });
  }, [generatedSlides, searchParams, slideshowLessonOrSlidesFromServer]);

  // Get the slides that were generated or fetched from the server
  const slides = useMemo(() => {
    /* If the server found up-to-date slides, return them (they're only returned
    by the server when the slides are up to date) */
    const slidesWereFetchedFromServer =
      slideshowLessonOrSlidesFromServer &&
      'slides' in slideshowLessonOrSlidesFromServer;
    if (slidesWereFetchedFromServer) {
      return slideshowLessonOrSlidesFromServer.slides;
    }

    return generatedSlides;
  }, [generatedSlides, slideshowLessonOrSlidesFromServer]);

  // Get the background music
  const { data: backgroundMusic, isLoading: isLoadingBackgroundMusic } =
    useQuery({
      enabled: !!slideshowLesson || !!slideshowLessonOrSlidesFromServer,
      queryKey: [
        'backgroundMusic',
        slideshowLesson?.backgroundMusicUrl,
        slideshowLessonOrSlidesFromServer?.backgroundMusicUrl,
      ],
      queryFn: async () => {
        let backgroundMusicUrl =
          slideshowLesson?.backgroundMusicUrl ||
          slideshowLessonOrSlidesFromServer?.backgroundMusicUrl;

        if (!backgroundMusicUrl) return null;

        if (!validateUrl(backgroundMusicUrl)) {
          /* When there's an invalid background music URL, it's being assumed
          that it's just missing the base URL */
          const backgroundMusicBaseUrl = import.meta.env
            .VITE_BACKGROUND_MUSIC_BASE_URL;
          backgroundMusicUrl = backgroundMusicBaseUrl + backgroundMusicUrl;
        }

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

  const { isSetupFinished } = useSetupPlayerTimeline({
    stageRef,
    layerRef,
    combinedSlides,
    timeline,
    updateTimelineDuration,
  });

  // Play/pause when clicking on the stage wrapper with a pointer
  function handleClickStageWrapperWithPointer(event: PointerEvent) {
    const isLeftMouseClick =
      event.pointerType === 'mouse' && event.button === MouseButton.left;
    if (!isLeftMouseClick || !canPlaySlideshow) return;
    handlePlayOrPause();
  }

  // Preload audios, including background music if there's one
  const { isLoading: isPreloadingAudios, isPending: isPreloadAudiosPending } =
    useQuery({
      enabled:
        (!!slideshowLessonFromHomePage ||
          !!slideshowLessonOrSlidesFromServer) &&
        !isLoadingBackgroundMusic,
      queryKey: [
        'preloadAudios',
        backgroundMusic,
        isLoadingBackgroundMusic,
        slideshowLessonFromHomePage,
        slideshowLessonOrSlidesFromServer,
      ],
      queryFn: async () => {
        const slideAudios = (() => {
          if (slideshowLessonFromHomePage) {
            return (
              slideshowLessonFromHomePage as SlideshowLessonWithExternalInfo
            ).elementLesson.paragraphs.map(({ audioUrl }) => ({
              url: audioUrl,
            }));
          }

          if ('elementLesson' in slideshowLessonOrSlidesFromServer!) {
            return slideshowLessonOrSlidesFromServer.elementLesson.paragraphs.map(
              ({ audioUrl }) => ({ url: audioUrl })
            );
          }

          return slideshowLessonOrSlidesFromServer!.slides
            .map(({ audio }) => audio)
            .filter((audio): audio is { url: string } => !!audio);
        })();

        await preloadAudios([
          ...slideAudios,
          ...(backgroundMusic ? [backgroundMusic] : []),
        ]);
        return null;
      },
    });

  const canPlaySlideshow = useMemo(() => {
    return isSetupFinished && !isPreloadAudiosPending && !isPreloadingAudios;
  }, [isPreloadAudiosPending, isPreloadingAudios, isSetupFinished]);

  // Load canvas tree and prefetch assets
  useEffect(() => {
    if (!combinedSlides || isLoadingFonts) return;

    // Load canvas tree
    const canvasElements = combinedSlides.canvasElements.map(
      ({ attributes: canvasElement }) => canvasElement
    );
    loadCanvasTree(canvasElements);

    // TODO: Start prefetching the assets before the generating the slides
    // Prefetch assets
    prefetchAssetsFromCanvasElements(canvasElements);
  }, [combinedSlides, isLoadingFonts, loadCanvasTree]);

  // Clear canvas tree and reset timeline when the component is destroyed
  useEffect(() => {
    return () => {
      useCanvasTreeStore.getState().loadCanvasTree([]);
      usePlayerTimelineStore.getState().reset();
    };
  }, []);

  return (
    <main>
      <div onPointerDown={handleClickStageWrapperWithPointer}>
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
                  /* Hide the nodes by default so they are not visible before
                  the timeline is set up */
                  visible={false}
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Component {...(otherProps as any)} />
                </Group>
              );
            })}
          </Layer>
          <PlayerOrganizationLogo
            logoUrl={slideshowLesson?.organizationLogoUrl}
          />
        </Stage>
      </div>

      {canvasTree.length > 0 && (
        <PlayerBar
          disabled={!canPlaySlideshow}
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
