import { toast } from "sonner";
import { validateAssetUrl } from "@/utils/validation";
import { slideshowLessonWithExternalInfoSchema } from "@/utils/generateSlides/parse";
import type {
  SlideWithAudio,
  SlideshowLessonWithExternalInfo,
} from "@/utils/types";

type SlideshowLessonResponse =
  | { error: string }
  | {
      slides: SlideWithAudio[];
      backgroundMusicUrl?: string | null;
      organizationLogoUrl?: string | null | undefined;
    }
  | SlideshowLessonWithExternalInfo;

function isSlideshowLessonWithExternalInfo(
  data: SlideshowLessonResponse
): data is SlideshowLessonWithExternalInfo {
  return (
    typeof data === "object" &&
    "elementLesson" in data &&
    typeof data.elementLesson === "object"
  );
}

export async function fetchSlideshowLessonOrSlides({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  // Ensure the courseId and lessonId are being used in the URL
  if (!import.meta.env.VITE_API_URL) {
    throw new Error("API URL is missing.");
  }
  if (!import.meta.env.VITE_AZURE_FUNCTIONS_KEY) {
    throw new Error("Azure functions key is missing.");
  }

  const searchParamsObject = new URLSearchParams({ courseId, lessonId });
  const url = `${
    import.meta.env.VITE_API_URL
  }/SlideshowLesson?${searchParamsObject.toString()}`;

  let response: Response; // Ensure the response variable is declared

  try {
    response = await fetch(url, {
      headers: { "x-functions-key": import.meta.env.VITE_AZURE_FUNCTIONS_KEY },
    });
  } catch (error) {
    throw new Error("Could not fetch slideshow lesson for unknown reasons.");
  }

  const data: SlideshowLessonResponse = await response.json(); // Now response is in scope
  console.log("Raw data received:", data); // Log the raw data received

  if ("error" in data) {
    throw new Error(data.error);
  }

  if (isSlideshowLessonWithExternalInfo(data)) {
    console.log("Data received as slideshow lesson with external info:", data);

    const isValidSlideshowLesson =
      slideshowLessonWithExternalInfoSchema.allows(data);
    console.log("isValidSlideshowLesson: ", isValidSlideshowLesson);

    if (!isValidSlideshowLesson) {
      // Log the specific properties being validated
      const lessonData = data as SlideshowLessonWithExternalInfo;

      console.log("Validation failed details:");

      const validationDetails = {
        elementLesson: lessonData.elementLesson,
        courseCover: lessonData.courseCover,
        sectionTitle: lessonData.sectionTitle,
        colorThemeName: lessonData.colorThemeName,
        backgroundMusicUrl: lessonData.backgroundMusicUrl,
        organizationLogoUrl: lessonData.organizationLogoUrl,
      };

      for (const [key, value] of Object.entries(validationDetails)) {
        console.log(`Validation detail - ${key}:`, value);

        switch (key) {
          case "courseCover":
            if (typeof value !== "string") {
              console.log(
                `Validation failed for ${key}: expected a string, got ${typeof value}`
              );
            }
            break;
          case "sectionTitle":
            if (typeof value !== "string") {
              console.log(
                `Validation failed for ${key}: expected a string, got ${typeof value}`
              );
            }
            break;
          case "colorThemeName":
            if (
              typeof value === "string" &&
              !["default", "oxford", "twilight", "pastel", "earthy"].includes(
                value
              )
            ) {
              console.log(
                `Validation failed for ${key}: invalid value "${value}"`
              );
            }
            break;
          case "backgroundMusicUrl":
            if (value !== null && typeof value !== "string") {
              console.log(
                `Validation failed for ${key}: expected a string or null, got ${typeof value}`
              );
            }
            break;
          case "organizationLogoUrl":
            if (
              value !== null &&
              value !== undefined &&
              typeof value !== "string"
            ) {
              console.log(
                `Validation failed for ${key}: expected a string or null, got ${typeof value}`
              );
            }
            break;
        }
      }

      throw new Error("Invalid slideshow lesson.");
    }
  } else {
    // Here, handle the case where the data doesn't match the expected structure
    if ("slides" in data) {
      console.log(
        "Data received is a valid slideshow lesson but lacks external info:",
        data
      );
    } else {
      console.error("Unexpected data format received:", data);
      throw new Error("Invalid data structure received.");
    }
  }

  if (data.organizationLogoUrl === null) {
    toast.warning(
      "Could not find organization, therefore the organization logo cannot be found and will not be displayed."
    );
  }

  if (data.organizationLogoUrl) {
    const isValidImage = await validateAssetUrl(
      "image",
      data.organizationLogoUrl
    );
    if (!isValidImage) {
      data.organizationLogoUrl = null;
      toast.warning(
        "Organization logo is not a valid image, therefore it cannot be displayed."
      );
    }
  }

  return data;
}
