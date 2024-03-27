import { useMemo, useRef } from 'react';
import {
  type AriaSliderProps,
  type AriaSliderThumbOptions,
  useSlider,
  useSliderThumb,
} from '@react-aria/slider';
import { type SliderState, useSliderState } from '@react-stately/slider';

import styles from './Slider.module.css';

type SliderProps = AriaSliderProps<number> & {
  /** @default 'full' */
  length?: 'fixed' | 'full' | 'full-flex';
  /** @default 'negative' */
  bottomMargin?: 'negative' | 'none';
};

export function Slider({
  length = 'fixed',
  bottomMargin = 'negative',
  ...props
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
  const state = useSliderState({ ...props, numberFormatter });
  const { groupProps, trackProps, labelProps, outputProps } = useSlider(
    props,
    state,
    trackRef
  );

  return (
    <div
      {...groupProps}
      className={styles.group}
      data-orientation={state.orientation}
      data-length={length}
    >
      {props.label && (
        <div className={styles.labelAndOutput}>
          <label {...labelProps}>{props.label}</label>
          <output {...outputProps}>{state.getThumbValueLabel(0)}</output>
        </div>
      )}

      <div
        {...trackProps}
        className={styles.track}
        data-orientation={state.orientation}
        data-length={length}
        data-bottom-margin={bottomMargin}
        // `data-disabled` will only be present when disabled
        data-disabled={state.isDisabled ? '' : undefined}
        ref={trackRef}
      >
        {/* Track line */}
        <div
          className={styles.trackLine}
          data-orientation={state.orientation}
        />
        {/* Track fill */}
        <div
          className={styles.trackFill}
          style={{
            '--_slider-percentage': state.getThumbPercent(0) * 100 + '%',
          }}
          data-orientation={state.orientation}
        />
        <Thumb state={state} trackRef={trackRef} />
      </div>
    </div>
  );
}

function Thumb({
  state,
  ...props
}: Omit<AriaSliderThumbOptions, 'inputRef'> & { state: SliderState }) {
  const inputRef = useRef(null);
  const { thumbProps, inputProps, isDragging, isFocused } = useSliderThumb(
    { ...props, inputRef },
    state
  );

  return (
    <div
      {...thumbProps}
      className={styles.thumb}
      // `data-focused` will only be present when is focused
      data-focused={isFocused ? '' : undefined}
      // `data-dragging` will only be present when is dragging
      data-dragging={isDragging ? '' : undefined}
      data-orientation={state.orientation}
    >
      <input {...inputProps} className="sr-only" ref={inputRef} />
    </div>
  );
}
