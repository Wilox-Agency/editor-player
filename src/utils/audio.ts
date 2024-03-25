import { toast } from 'sonner';

export function preloadAudio(url: string) {
  return new Promise<HTMLAudioElement>((resolve, reject) => {
    const audioElement = document.createElement('audio');
    audioElement.preload = 'auto';

    const loadInterval = setInterval(() => {
      if (audioElement.readyState === audioElement.HAVE_ENOUGH_DATA) {
        resolve(audioElement);
        cleanup();
      }
    });

    function handleError() {
      reject('Invalid audio URL');
      cleanup();
    }

    function cleanup() {
      clearInterval(loadInterval);
      audioElement.removeEventListener('error', handleError);
      audioElement.remove();
    }

    audioElement.addEventListener('error', handleError);
    audioElement.src = url;
  });
}

export async function preloadAudios(
  audios: { url: string; shouldBePlayedAt: number }[]
) {
  const preloadAudiosPromise = Promise.allSettled(
    audios.map(({ url }) => preloadAudio(url))
  );

  toast.promise(preloadAudiosPromise, {
    loading: 'Preloading audios...',
    success: (results) => {
      const numberOfSuccesses = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const totalOfResults = results.length;

      if (numberOfSuccesses === totalOfResults) {
        return 'All audios preloaded successfully!';
      }
      return `${numberOfSuccesses} audios preloaded out of ${totalOfResults}.`;
    },
    error: 'Could not preload audios.',
  });

  for (const [audioIndex, result] of (await preloadAudiosPromise).entries()) {
    const audioUrl = audios[audioIndex]!.url;

    let audioElement;
    // If the audio could be loaded, use it
    if (result.status === 'fulfilled') {
      audioElement = result.value;
    } else {
      /* If the audio could not be loaded, hope that it can be loaded when
      playing the slideshow */
      audioElement = document.createElement('audio');
      audioElement.src = audioUrl;
      audioElement.preload = 'auto';
    }
    document.body.append(audioElement);
  }
}
