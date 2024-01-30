import { useEffect, useState } from 'react';

export function useRootFontSize() {
  const [rootFontSize, setRootFontSize] = useState(getRootFontSizeInPixels);

  function converRemToPixels(sizeInRemAsStringWithUnit: string) {
    const isValid = /^\d+(\.\d+)?rem$/.test(sizeInRemAsStringWithUnit);
    if (!isValid) {
      throw new Error(`Invalid size: ${sizeInRemAsStringWithUnit}`);
    }

    const sizeInRemAsStringWithoutUnit =
      sizeInRemAsStringWithUnit.split('rem')[0]!;
    const sizeInRemAsNumber = parseFloat(sizeInRemAsStringWithoutUnit);
    return sizeInRemAsNumber * rootFontSize;
  }

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newFontSize = getRootFontSizeInPixels();
      setRootFontSize(newFontSize);
    });

    observer.observe(document.documentElement, { attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  return {
    rootFontSize,
    converRemToPixels,
  };
}

function getRootFontSizeInPixels() {
  const fontSizeFallback = 16;

  const fontSizeInPixelsAsStringWithUnit = window.getComputedStyle(
    document.documentElement
  ).fontSize;
  const fontSizeInPixelsAsStringWithoutUnit =
    fontSizeInPixelsAsStringWithUnit.split('px')[0] ||
    fontSizeFallback.toString();
  const fontSizeInPixelsAsNumber =
    parseFloat(fontSizeInPixelsAsStringWithoutUnit) || fontSizeFallback;
  return fontSizeInPixelsAsNumber;
}
