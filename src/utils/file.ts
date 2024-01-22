export function fileToBase64(file: File) {
  return new Promise<string | null>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      /* The `ArrayBuffer` type is for when using `readAsArrayBuffer`, therefore
      it's safe to remove it from result type */
      const base64EncodedImage = reader.result as string | null;
      resolve(base64EncodedImage);
    };
    reader.onerror = (event) => reject(event);

    reader.readAsDataURL(file);
  });
}
