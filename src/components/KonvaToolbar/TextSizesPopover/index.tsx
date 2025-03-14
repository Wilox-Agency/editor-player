import { type ChangeEvent, useId } from 'react';
import type Konva from 'konva';
import * as Popover from '@radix-ui/react-popover';

import styles from '../KonvaToolbar.module.css';

import { defaultElementAttributes } from '@/utils/konva';
import {
  getIsAutoTextWidth,
  getTextWidthChangeMultiplier,
} from '@/utils/konva/text';
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

    /* Scale letter spacing with font size (Konva uses letter spacing as a value
    in pixels instead of a multiplier as with line height, so it needs to be
    scaled manually) */
    const newLetterSpacing =
      node.letterSpacing() * (newFontSize / node.fontSize());

    /* The font size and letter spacing change the width of the text, so
    calculate a new width to fit the text if the width is not automatic (needs
    to be calculated before updating the font size and letter spacing) */
    const isAutoWidth = getIsAutoTextWidth(node);
    let newWidth;
    if (!isAutoWidth) {
      const widthChangeMultiplier = getTextWidthChangeMultiplier(node, {
        fontSize: newFontSize,
        letterSpacing: newLetterSpacing,
      });
      newWidth = node.width() * widthChangeMultiplier;
    }

    // Set the width, font size and letter spacing
    node.setAttrs({
      width: newWidth,
      fontSize: newFontSize,
      letterSpacing: newLetterSpacing,
    } satisfies Konva.TextConfig);
    // Save the new width, font size and letter spacing
    canvasElement.saveAttrs({
      width: newWidth,
      fontSize: newFontSize,
      letterSpacing: newLetterSpacing,
    });
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
    let newWidth;
    if (!isAutoWidth) {
      const widthChangeMultiplier = getTextWidthChangeMultiplier(node, {
        letterSpacing: newLetterSpacing,
      });
      newWidth = node.width() * widthChangeMultiplier;
    }

    // Set the width and letter spacing
    node.setAttrs({
      width: newWidth,
      letterSpacing: newLetterSpacing,
    } satisfies Konva.TextConfig);
    // Save the new width and letter spacing
    canvasElement.saveAttrs({
      width: newWidth,
      letterSpacing: newLetterSpacing,
    });
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
          length="full"
          onChange={handleChangeLineHeight}
        />

        <Slider
          label="Letter spacing"
          defaultValue={currentLetterSpacing}
          minValue={TextSizes.minLetterSpacing}
          maxValue={TextSizes.maxLetterSpacing}
          step={1}
          length="full"
          onChange={handleChangeLetterSpacing}
        />
      </Popover.Content>
    </Popover.Portal>
  );
}
