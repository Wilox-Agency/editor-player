import {
  type ChangeEvent,
  type FormEvent,
  forwardRef,
  type PropsWithChildren,
  useId,
  useRef,
  useState,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';

import styles from './AddAssetElementDialog.module.css';

import { fileToBase64 } from '@/utils/file';
import { validateUrl, validateAssetUrl } from '@/utils/validation';
import type { CanvasElement } from '@/utils/types';

type AddAssetElementDialogProps = PropsWithChildren<{
  type: 'image' | 'video';
  onAddElement: <T extends 'image' | 'video'>(
    type: T,
    attrs?: Omit<Extract<CanvasElement, { type: T }>, 'id' | 'type'>
  ) => void;
}>;

export function AddAssetElementDialog({
  children,
  type,
  onAddElement,
}: AddAssetElementDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  function handleSubmit(url: string) {
    if (type === 'image') {
      onAddElement(type, { imageUrl: url });
    } else {
      onAddElement(type, { videoUrl: url });
    }

    // Close the dialog
    setIsDialogOpen(false);
  }

  return (
    <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <AddAssetElementDialogContent type={type} onSubmit={handleSubmit} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type AddAssetElementDialogContentProps = {
  type: 'image' | 'video';
  onSubmit: (url: string) => void;
};

const AddAssetElementDialogContent = forwardRef<
  HTMLDivElement,
  AddAssetElementDialogContentProps
>(({ type, onSubmit }, ref) => {
  // States
  const [fileUrl, setFileUrl] = useState('');
  const [fileUrlError, setFileUrlError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Refs
  const fileUrlInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IDs
  const fileUrlInputId = useId();
  const fileUrlErrorMessageId = useId();
  // Derived values
  const fileInputLabel =
    type === 'image' ? 'Paste link to an image...' : 'Paste link to a video...';
  const isValidUrl = fileUrl.trim() !== '' && validateUrl(fileUrl);
  const isValidUrlOfFileType = fileUrlError === undefined;

  function handleChangeFileUrl(event: ChangeEvent<HTMLInputElement>) {
    setFileUrl(event.target.value);
    // Reset the error
    setFileUrlError(undefined);
  }

  async function handleSubmitFileUrl(event: FormEvent<HTMLFormElement>) {
    // Prevent native form submission
    event.preventDefault();

    const isValid = await addAsset(fileUrl);
    if (!isValid) {
      // Focusing back the input when it's invalid
      fileUrlInputRef.current?.focus();
    }
  }

  function handleOpenFileInput() {
    fileInputRef.current?.click();
  }

  async function handleSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const isValidFile = file && file.type.startsWith(`${type}/`);
    if (!isValidFile) return;

    // TODO: Use image upload when API is implemented
    let base64EncodedFile;
    try {
      base64EncodedFile = await fileToBase64(file);
    } catch (error) {
      // empty
    }
    if (!base64EncodedFile) return;

    addAsset(base64EncodedFile);
  }

  async function addAsset(url: string) {
    setIsSubmitting(true);

    const isValid = await validateAssetUrl(type, url);
    if (!isValid) {
      setFileUrlError(`Invalid ${type} URL`);
      setIsSubmitting(false);
      return false;
    }

    onSubmit(url);
    return true;
  }

  return (
    <Dialog.Content className={styles.dialog} ref={ref}>
      <Dialog.Title className={styles.title}>Add {type} element</Dialog.Title>

      <form className={styles.form} onSubmit={handleSubmitFileUrl}>
        <div className={styles.inputRow}>
          <label htmlFor={fileUrlInputId} className="sr-only">
            {fileInputLabel}
          </label>
          <input
            id={fileUrlInputId}
            className="focus-ring"
            type="text"
            value={fileUrl}
            placeholder={fileInputLabel}
            aria-invalid={!isValidUrlOfFileType}
            aria-labelledby={fileUrlErrorMessageId}
            onChange={handleChangeFileUrl}
            ref={fileUrlInputRef}
          />

          <button
            className="focus-ring"
            type="submit"
            disabled={!isValidUrl || !isValidUrlOfFileType || isSubmitting}
            aria-label={`Submit ${type} URL`}
          >
            Submit
          </button>
        </div>

        {fileUrlError && (
          <span
            id={fileUrlErrorMessageId}
            className={styles.fileUrlError}
            role="alert"
          >
            {fileUrlError}
          </span>
        )}

        <button
          className={`${styles.uploadFileButton} focus-ring`}
          type="button"
          disabled={isSubmitting}
          onClick={handleOpenFileInput}
        >
          Upload file
        </button>

        <input
          type="file"
          accept={`${type}/*`}
          hidden
          disabled={isSubmitting}
          onChange={handleSelectFile}
          ref={fileInputRef}
        />
      </form>

      <Dialog.Close
        className={`${styles.closeButton} focus-ring`}
        aria-label="Close"
      >
        <X size={20} />
      </Dialog.Close>

      {isSubmitting && (
        <div className={styles.loadingOverlay}>
          <Loader2 size={32} className={styles.loadingSpinner} />
        </div>
      )}
    </Dialog.Content>
  );
});
