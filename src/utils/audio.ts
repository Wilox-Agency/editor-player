import { toast } from 'sonner';

/**
 * Request an audio with the 'Range' header (which in turn makes the response
 * include the 'Content-Range' header) and turn the response blob into a URL
 */
async function requestAudioWithRange(url: string) {
  // Fetch the audio to get its 'Content-Length' header
  const responseWithoutRange = await fetch(url);
  const contentLengthHeader =
    responseWithoutRange.headers.get('Content-Length');
  const audioByteLength = contentLengthHeader
    ? parseInt(contentLengthHeader)
    : undefined;
  if (!audioByteLength) {
    throw new Error('Audio response is missing content length header.');
  }

  // Fetch the audio again with the 'Range' header
  const responseWithRange = await fetch(url, {
    headers: {
      Range: `bytes=0-${audioByteLength - 1}`,
    },
  });
  /* Turn the audio into a blob and create a URL for it so it can be used as the
  `src` for the audio element */
  const blob = await responseWithRange.blob();
  const blobUrl = URL.createObjectURL(blob);

  return blobUrl;
}

export async function preloadAudio(url: string) {
  /* This function is used to request the audio with the 'Range' header, so the
  audio seeking can work properly on Chromium (works fine without it on Firefox;
  not sure about Safari). Reference:
  https://stackoverflow.com/questions/36783521/why-does-setting-currenttime-of-html5-video-element-reset-time-in-chrome/65804889
  */
  const blobUrl = await requestAudioWithRange(url);

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
    audioElement.src = blobUrl;
    // Set the original URL as a data attribute so it can be found using it
    audioElement.setAttribute('data-src', url);
  });
}

export async function preloadAudios(audios: { url: string }[]) {
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

export function getAudioDuration(url: string) {
  return new Promise<number | undefined>((resolve, reject) => {
    const audioElement = document.createElement('audio');

    function handleLoad() {
      cleanup();

      const duration = audioElement.duration;
      if (isNaN(duration) || duration === Infinity) {
        reject('Audio duration is unknown.');
        return;
      }

      resolve(duration);
    }

    function handleError() {
      reject(`Invalid audio URL: "${url}"`);
      cleanup();
    }

    function cleanup() {
      audioElement.removeEventListener('loadedmetadata', handleLoad);
      audioElement.removeEventListener('error', handleError);
      audioElement.remove();
    }

    audioElement.addEventListener('loadedmetadata', handleLoad);
    audioElement.addEventListener('error', handleError);
    audioElement.src = url;
  });
}
