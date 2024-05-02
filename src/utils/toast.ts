import { toast } from 'sonner';

const warningToastTimeout = 10 * 1000; // 10 seconds

export function showWarningToastWhenPromiseTakesTooLong(
  toastMessage: string,
  promise: Promise<unknown>
) {
  let warningToastId: string | number | undefined;
  // Show a toast if the promise doesn't settle after a certain amount of time
  const toastTimeout = setTimeout(() => {
    warningToastId = toast.warning(toastMessage, {
      // Keep the toast visible as long as it's not dismissed
      duration: Infinity,
    });
  }, warningToastTimeout);

  promise.finally(() => {
    // Clear the timeout after the promise is settled
    clearTimeout(toastTimeout);
    // Dismiss the toast if it was already shown
    if (warningToastId !== undefined) {
      /* Even though `toast.dismiss` can receive undefined, it should not be
      called with undefined as it would dismiss all toasts. */
      toast.dismiss(warningToastId);
    }
  });
}
