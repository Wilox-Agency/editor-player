import { arrayOf, type } from 'arktype';

import {
  slideshowLessonSchema,
  type slideshowLessonWithExternalInfoSchema,
} from '@/utils/generateSlides/parse';

const courseSchema = type({
  details: {
    cover: 'string',
  },
  sections: arrayOf({
    title: 'string',
    elements: 'object[]',
  }),
  // TODO: Validate color theme name using the `colorThemeNames` constant
  'slideshowColorThemeName?': '"default" | "oxford" | "twilight" | "pastel"',
});

export async function fetchSlideshowLesson({
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

  let course;
  try {
    course = await fetch(
      `${import.meta.env.VITE_API_URL}/Courses/${courseId}`,
      {
        headers: {
          'x-functions-key': import.meta.env.VITE_AZURE_FUNCTIONS_KEY,
        },
      }
    ).then((response) => response.json() as Promise<unknown>);
  } catch (error) {
    throw new Error('Course not found.');
  }

  const { data: validatedCourse, problems } = courseSchema(course);
  if (problems) {
    throw new Error(
      'Course has invalid format and, therefore, slideshow lesson cannot be found.'
    );
  }

  let slideshowLesson;
  let sectionTitle;
  sectionsLoop: for (const section of validatedCourse.sections) {
    for (const element of section.elements) {
      if ('elementCode' in element && element.elementCode === lessonId) {
        const { data: lesson } = slideshowLessonSchema(element);
        if (lesson) {
          slideshowLesson = lesson;
          sectionTitle = section.title;
          break sectionsLoop;
        }

        throw new Error(
          `Element with ID "${element.elementCode}" is not a valid slideshow lesson.`
        );
      }
    }
  }

  /* Both variables are set together, so checking both is not necessary, but
  they're being checked anyway so that both types are correctly inferred */
  if (!slideshowLesson || !sectionTitle) {
    throw new Error('Slideshow lesson not found.');
  }

  return {
    ...slideshowLesson,
    courseCover: validatedCourse.details.cover,
    sectionTitle,
    colorThemeName: validatedCourse.slideshowColorThemeName,
  } satisfies (typeof slideshowLessonWithExternalInfoSchema)['infer'];
}
