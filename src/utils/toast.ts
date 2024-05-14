import { toast } from 'sonner';
import { ValueOf } from 'type-fest';

const warningToastTimeout = 10 * 1000; // 10 seconds

let warningToastId: string | number | undefined;
const promisesToShowToastFor: Record<
  'image' | 'video' | 'audio' | 'font',
  Promise<unknown>[]
> = {
  image: [],
  video: [],
  audio: [],
  font: [],
};
const subjects = {
  image: { singular: 'image', plural: 'images' },
  video: { singular: 'video', plural: 'videos' },
  audio: { singular: 'audio', plural: 'audios' },
  font: { singular: 'font', plural: 'fonts' },
} satisfies Record<
  keyof typeof promisesToShowToastFor,
  { singular: string; plural: string }
>;

function formatToastMessage() {
  const entries = Object.entries(promisesToShowToastFor) as [
    keyof typeof promisesToShowToastFor,
    ValueOf<typeof promisesToShowToastFor>
  ][];
  const nonEmptyEntries = entries.filter(([, promises]) => promises.length > 0);

  const subjectsWithCount: string[] = [];
  for (const [assetType, promises] of nonEmptyEntries) {
    subjectsWithCount.push(
      `${promises.length} ${
        subjects[assetType][promises.length === 1 ? 'singular' : 'plural']
      } `
    );
  }

  if (subjectsWithCount.length === 0) {
    throw new Error('No promises to show toast for');
  }

  let messageStart: string;

  if (subjectsWithCount.length === 1) {
    messageStart = subjectsWithCount[0]!;
  } else {
    messageStart =
      subjectsWithCount.slice(0, -1).join(', ') +
      ' and ' +
      subjectsWithCount[subjectsWithCount.length - 1]!;
  }

  let isOrAre: 'is' | 'are';
  if (nonEmptyEntries.length === 1) {
    const [, promises] = nonEmptyEntries[0]!;
    isOrAre = promises.length === 1 ? 'is' : 'are';
  } else {
    isOrAre = 'are';
  }

  return `${messageStart} ${isOrAre} taking too long to load. Consider reloading the page.`;
}

function showWarningToast() {
  const toastMessage = formatToastMessage();
  warningToastId = toast.warning(toastMessage, {
    // Reuse the same toast if it was already shown
    id: warningToastId,
    // Keep the toast visible as long as it's not dismissed
    duration: Infinity,
  });
}

export function showWarningToastWhenAssetLoadingTakesTooLong(
  assetType: keyof typeof promisesToShowToastFor,
  promise: Promise<unknown>
) {
  promisesToShowToastFor[assetType].push(promise);

  // Show a toast if the promise doesn't settle after a certain amount of time
  const toastTimeout = setTimeout(() => {
    showWarningToast();
  }, warningToastTimeout);

  promise.finally(() => {
    // Clear the timeout after the promise is settled
    clearTimeout(toastTimeout);

    // Remove the promise from the list of promises to show the toast for
    promisesToShowToastFor[assetType] = promisesToShowToastFor[
      assetType
    ].filter((promiseToShowToastFor) => promise !== promiseToShowToastFor);

    // If the toast was never shown, do nothing
    if (warningToastId === undefined) return;

    const areThereMorePromisesToShowToastFor = Object.values(
      promisesToShowToastFor
    ).some((promises) => promises.length > 0);

    if (areThereMorePromisesToShowToastFor) {
      // If there are more promises to show the toast for, update the toast
      showWarningToast();
    } else {
      toast.dismiss(warningToastId);
    }
  });
}
