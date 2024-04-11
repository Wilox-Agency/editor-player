import type { SlideWithAudio } from '@/utils/types';

export async function saveSlidesToSlideshowLesson({
  courseId,
  lessonId,
  slides,
}: {
  courseId: string;
  lessonId: string;
  slides: SlideWithAudio[];
}) {
  if (!import.meta.env.VITE_API_URL) {
    throw new Error('API URL is missing.');
  }
  if (!import.meta.env.VITE_AZURE_FUNCTIONS_KEY) {
    throw new Error('Azure functions key is missing.');
  }

  let response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL}/SlideshowLesson`, {
      method: 'PUT',
      headers: { 'x-functions-key': import.meta.env.VITE_AZURE_FUNCTIONS_KEY },
      body: JSON.stringify({ courseId, lessonId, slides }),
    });
  } catch (error) {
    throw new Error(
      'Could not save slides to slideshow lesson for unknown reasons.'
    );
  }

  if (response.ok) return;

  const data = (await response.json()) as { error: string };
  throw new Error(data.error);
}
