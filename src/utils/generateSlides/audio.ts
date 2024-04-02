import type { SrtSubtitles } from './sharedTypes';

function ticksToSeconds(ticks: number) {
  // One tick represents one ten-millionth of a second (or 100 nano seconds)
  // See https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-speech-recognition-results
  return ticks / 10_000_000;
}

function getSubSlideAudioStartEnd(paragraph: string, srt: SrtSubtitles) {
  const paragraphWords = paragraph.split(' ');

  let paragraphWordIndex = 0;
  let paragraphFirstDisplayWord;
  let paragraphLastDisplayWord;
  for (const displayWord of srt.transcriptionResult.displayWords) {
    const paragraphWord = paragraphWords[paragraphWordIndex];

    /* If the words are not equal, go to the next display word and start
    comparing from the first paragraph word again */
    if (displayWord.displayText !== paragraphWord) {
      paragraphWordIndex = 0;
      paragraphFirstDisplayWord = undefined;
      continue;
    }

    // If all display words were found already, then break out from the loop
    const isLastParagraphWord =
      paragraphWordIndex === paragraphWords.length - 1;
    if (isLastParagraphWord) {
      paragraphLastDisplayWord = displayWord;
      break;
    }

    const isFirstParagraphWord = paragraphWordIndex === 0;
    if (isFirstParagraphWord) {
      paragraphFirstDisplayWord = displayWord;
    }
    // Continue comparing the paragraph words
    paragraphWordIndex++;
  }

  // This error should never happen, but it's being handled for good measure
  if (!paragraphFirstDisplayWord || !paragraphLastDisplayWord) {
    throw new Error('SRT is missing paragraph words.');
  }

  // TODO: Remove this
  console.log('getting audio start/end:', {
    paragraph,
    paragraphFirstDisplayWord,
    paragraphLastDisplayWord,
  });

  const isFirstWordOnAudio =
    paragraphFirstDisplayWord === srt.transcriptionResult.displayWords[0];

  return {
    start: isFirstWordOnAudio
      ? 0
      : ticksToSeconds(paragraphFirstDisplayWord.offsetInTicks),
    end: ticksToSeconds(
      paragraphLastDisplayWord.offsetInTicks +
        paragraphLastDisplayWord.durationInTicks
    ),
  };
}

export function parseAudioForSubSlide({
  audioUrl,
  srt,
  paragraph,
}: {
  audioUrl: string | undefined;
  srt: SrtSubtitles | undefined;
  paragraph: string | undefined;
}) {
  if (!audioUrl || !srt || !paragraph) return undefined;
  return { url: audioUrl, ...getSubSlideAudioStartEnd(paragraph, srt) };
}
