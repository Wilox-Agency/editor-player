import { toast } from 'sonner';

import { validateAssetUrl } from '@/utils/validation';
import { slideshowLessonWithExternalInfoSchema } from '@/utils/generateSlides/parse';
import type {
  SlideWithAudio,
  SlideshowLessonWithExternalInfo,
} from '@/utils/types';

export async function fetchSlideshowLessonOrSlides({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  if (!import.meta.env.VITE_API_URL) {
    throw new Error('API URL is missing.');
  }
  if (!import.meta.env.VITE_AZURE_FUNCTIONS_KEY) {
    throw new Error('Azure functions key is missing.');
  }

  const searchParamsObject = new URLSearchParams({ courseId, lessonId });
  const url = `${
    import.meta.env.VITE_API_URL
  }/SlideshowLesson?${searchParamsObject.toString()}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { 'x-functions-key': import.meta.env.VITE_AZURE_FUNCTIONS_KEY },
    });
  } catch (error) {
    throw new Error('Could not fetch slideshow lesson for unknown reasons.');
  }

  // TODO: Validate all possible response types
  const data = (await response.json()) as
    | { error: string }
    | {
        slides: SlideWithAudio[];
        backgroundMusicUrl?: string | null;
        organizationLogoUrl?: string | null;
      }
    | SlideshowLessonWithExternalInfo;

  if ('error' in data) {
    throw new Error(data.error);
  }

  // Validate the data if it's a lesson
  if ('elementLesson' in data) {
    const isValidSlideshowLesson =
      slideshowLessonWithExternalInfoSchema.allows(data);
    if (!isValidSlideshowLesson) {
      throw new Error('Invalid slideshow lesson.');
    }
  }

  /* When the organization logo URL is `null`, it means that the organization
  logo should be used but it was not found */
  if (data.organizationLogoUrl === null) {
    toast.warning(
      'Could not find organization, therefore the organization logo cannot be found and will not be displayed.'
    );
  }

  if (data.organizationLogoUrl) {
    const isValidImage = await validateAssetUrl(
      'image',
      data.organizationLogoUrl
    );
    if (!isValidImage) {
      // Set the organization logo URL to `null` so that it will not be used
      data.organizationLogoUrl = null;
      toast.warning(
        'Organization logo is not a valid image, therefore it cannot be displayed.'
      );
    }
  }

  return data;
}
