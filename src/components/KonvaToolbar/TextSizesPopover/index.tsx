import { type ChangeEvent, useId } from 'react';
import * as Popover from '@radix-ui/react-popover';

import styles from '../KonvaToolbar.module.css';

import {
  defaultElementAttributes,
  getIsAutoTextWidth,
  getTextWidthChangeMultiplier,
} from '@/utils/konva';
import {
  TextSizes,
  validateFontSize,
  validateLetterSpacing,
  validateLineHeight,
} from '@/utils/validation';
import type { KonvaNodeAndElement } from '@/utils/types';

import { Slider } from '@/components/Slider';

type TextSizesPopoverProps = KonvaNodeAndElement<'text'> & {
  popoverOffset: number;
};

export function TextSizesPopover({
  node,
  canvasElement,
  popoverOffset,
}: TextSizesPopoverProps) {
  const fontSizeInputId = useId();

  const currentFontSize =
    canvasElement.fontSize || defaultElementAttributes.text.fontSize;
  const currentLineHeight =
    canvasElement.lineHeight || defaultElementAttributes.text.lineHeight;
  const currentLetterSpacing =
    canvasElement.letterSpacing || defaultElementAttributes.text.letterSpacing;

  function handleChangeFontSize(event: ChangeEvent<HTMLInputElement>) {
    /* It's okay to use the font size as float, but it's preferable to use it as
    int */
    const validation = validateFontSize(parseInt(event.target.value));
    const newFontSize = validation.data;

    if (!newFontSize) return;

    /* The font size changes the width of the text, so calculate a new width to
    fit the text if the width is not automatic (needs to be calculated before
    updating the font size) */
    const isAutoWidth = getIsAutoTextWidth(node);
    if (!isAutoWidth) {
      const widthChangeMultiplier = getTextWidthChangeMultiplier(node, {
        fontSize: newFontSize,
      });
      node.width(node.width() * widthChangeMultiplier);
    }

    // Set the font size
    node.fontSize(newFontSize);
    // Save the new font size
    canvasElement.saveAttrs({ fontSize: newFontSize });
  }

  function handleChangeLineHeight(unvalidatedLineHeight: number) {
    const validation = validateLineHeight(unvalidatedLineHeight);
    const newLineHeight = validation.data;

    if (newLineHeight === undefined) return;

    // Set the line height
    node.lineHeight(newLineHeight);
    // Save the new line height
    canvasElement.saveAttrs({ lineHeight: newLineHeight });
  }

  function handleChangeLetterSpacing(unvalidatedLetterSpacing: number) {
    const validation = validateLetterSpacing(unvalidatedLetterSpacing);
    const newLetterSpacing = validation.data;

    if (newLetterSpacing === undefined) return;

    /* The letter spacing changes the width of the text, so calculate a new
    width to fit the text if the width is not automatic (needs to be calculated
    before updating the letter spacing) */
    const isAutoWidth = getIsAutoTextWidth(node);
    if (!isAutoWidth) {
      const widthChangeMultiplier = getTextWidthChangeMultiplier(node, {
        letterSpacing: newLetterSpacing,
      });
      node.width(node.width() * widthChangeMultiplier);
    }

    // Set the letter spacing
    node.letterSpacing(newLetterSpacing);
    // Save the new letter spacing
    canvasElement.saveAttrs({ letterSpacing: newLetterSpacing });
  }

  return (
    <Popover.Portal>
      <Popover.Content
        className={styles.popover}
        side="right"
        sideOffset={popoverOffset}
        data-gap="medium"
        data-padding="medium"
      >
        <div className={styles.labelAndInput}>
          <label htmlFor={fontSizeInputId}>
            Font size
            <span className={styles.softText}>
              {' '}
              (min: {TextSizes.minFontSize})
            </span>
          </label>
          <input
            id={fontSizeInputId}
            className={`${styles.input} focus-ring`}
            type="number"
            defaultValue={currentFontSize}
            min={TextSizes.minFontSize}
            step={1}
            onChange={handleChangeFontSize}
          />
        </div>

        <Slider
          label="Line height"
          defaultValue={currentLineHeight}
          minValue={TextSizes.minLineHeight}
          maxValue={TextSizes.maxLineHeight}
          step={0.1}
          width="full"
          onChange={handleChangeLineHeight}
        />

        <Slider
          label="Letter spacing"
          defaultValue={currentLetterSpacing}
          minValue={TextSizes.minLetterSpacing}
          maxValue={TextSizes.maxLetterSpacing}
          step={1}
          width="full"
          onChange={handleChangeLetterSpacing}
        />
      </Popover.Content>
    </Popover.Portal>
  );
}
