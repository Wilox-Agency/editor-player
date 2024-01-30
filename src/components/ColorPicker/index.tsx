import { useRef } from 'react';
import {
  useColorArea,
  useColorField,
  useColorSlider,
  useColorWheel,
} from '@react-aria/color';
import { useFocusRing } from '@react-aria/focus';
import {
  type Color,
  type ColorAreaProps,
  type ColorSliderStateOptions,
  type ColorWheelProps,
  type ColorFieldProps,
  useColorAreaState,
  useColorSliderState,
  useColorWheelState,
  useColorFieldState,
} from '@react-stately/color';
import { clsx } from 'clsx';

import styles, {
  COLOR_PICKER_WIDTH_IN_REM,
  TRACK_THICKNESS_IN_REM,
} from './ColorPicker.module.css';

import { useRootFontSize } from '@/hooks/useRootFontSize';

const LOCALE = 'en-US';

export function ColorPicker({
  color,
  onColorChange,
}: {
  color: Color;
  onColorChange: (color: Color) => void;
}) {
  // The hue channel is already used internally by the color wheel
  const [_hueChannel, saturationChannel, brightnessChannel] =
    color.getColorChannels();

  return (
    <div className={styles.container}>
      <div className={styles.colorAreaAndWheel}>
        <div className={styles.colorAreaWrapper}>
          <ColorArea
            value={color}
            xChannel={saturationChannel}
            yChannel={brightnessChannel}
            onChange={onColorChange}
          />
        </div>
        <ColorWheel value={color} onChange={onColorChange} />
      </div>

      <ColorSlider value={color} channel="alpha" onChange={onColorChange} />

      <div className={styles.colorSwatchAndField}>
        <ColorSwatch color={color} />
        <ColorField
          value={color}
          onChange={(color) => {
            if (!color || typeof color === 'string') return;
            onColorChange(color.toFormat('hsba'));
          }}
        />
      </div>
    </div>
  );
}

function ColorArea(props: ColorAreaProps) {
  const inputXRef = useRef<HTMLInputElement>(null);
  const inputYRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const state = useColorAreaState(props);

  const { isDisabled } = props;

  const {
    colorAreaProps,
    gradientProps,
    xInputProps,
    yInputProps,
    thumbProps,
  } = useColorArea({ ...props, inputXRef, inputYRef, containerRef }, state);

  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div
      {...colorAreaProps}
      className={styles.colorArea}
      style={colorAreaProps.style}
      // `data-disabled` will only be present when disabled
      data-disabled={isDisabled ? '' : undefined}
      ref={containerRef}
    >
      <div
        {...gradientProps}
        className={styles.colorAreaGradient}
        style={gradientProps.style}
        // `data-disabled` will only be present when disabled
        data-disabled={isDisabled ? '' : undefined}
      />
      <div
        {...thumbProps}
        className={styles.thumb}
        style={{
          ...thumbProps.style,
          backgroundColor: isDisabled
            ? undefined
            : state.getDisplayColor().toString('css'),
          transform: 'translate(-50%, -50%)',
        }}
        // `data-focus-visible` will only be present when is focus-visible
        data-focus-visible={isFocusVisible ? '' : undefined}
        // `data-disabled` will only be present when disabled
        data-disabled={isDisabled ? '' : undefined}
      >
        <input {...xInputProps} {...focusProps} ref={inputXRef} />
        <input {...yInputProps} {...focusProps} ref={inputYRef} />
      </div>
    </div>
  );
}

function ColorWheel(props: ColorWheelProps) {
  const state = useColorWheelState(props);
  const inputRef = useRef(null);

  const { converRemToPixels } = useRootFontSize();
  const colorPickerWidth = converRemToPixels(COLOR_PICKER_WIDTH_IN_REM);
  const colorWheelRadius = colorPickerWidth / 2;
  const trackThickness = converRemToPixels(TRACK_THICKNESS_IN_REM);

  const { trackProps, inputProps, thumbProps } = useColorWheel(
    {
      ...props,
      outerRadius: colorWheelRadius,
      innerRadius: colorWheelRadius - trackThickness,
    },
    state,
    inputRef
  );

  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div className={styles.colorWheel}>
      <div {...trackProps} style={trackProps.style} />
      <div
        {...thumbProps}
        className={styles.thumb}
        style={thumbProps.style}
        // `data-focus-visible` will only be present when is focus-visible
        data-focus-visible={isFocusVisible ? '' : undefined}
      >
        <input
          className="sr-only"
          {...inputProps}
          {...focusProps}
          ref={inputRef}
        />
      </div>
    </div>
  );
}

function ColorSlider(props: Omit<ColorSliderStateOptions, 'locale'>) {
  const state = useColorSliderState({ ...props, locale: LOCALE });
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const label =
    props.label || state.value.getChannelName(props.channel, LOCALE);

  const { trackProps, thumbProps, inputProps, labelProps, outputProps } =
    useColorSlider({ ...props, label, trackRef, inputRef }, state);

  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div className={styles.colorSliderHeaderAndTrack}>
      <div className={styles.colorSliderHeader}>
        <label {...labelProps}>{label}</label>
        <output {...outputProps} className={styles.colorSliderOutput}>
          {state.value.formatChannelValue(props.channel, LOCALE)}
        </output>
      </div>

      <div {...trackProps} className={styles.colorSliderTrack} ref={trackRef}>
        <div className={styles.colorSliderTrackBackground} />
        <div
          className={styles.colorSliderTrackColor}
          style={trackProps.style}
        />
        <div
          // TODO: Check if `className` needs to come first
          className={clsx(styles.thumb, styles.colorSliderThumb)}
          {...thumbProps}
          style={thumbProps.style}
          // `data-focus-visible` will only be present when is focus-visible
          data-focus-visible={isFocusVisible ? '' : undefined}
        >
          <div className={styles.colorSliderThumbBackground} />
          <div
            className={styles.colorSliderThumbColor}
            style={{ backgroundColor: state.getDisplayColor().toString('css') }}
          />

          <input
            className="sr-only"
            {...inputProps}
            {...focusProps}
            ref={inputRef}
          />
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ color }: { color: Color }) {
  const cssColor = color.toString('css');

  return (
    <div className={styles.colorSwatch} role="img" aria-label={cssColor}>
      <div className={styles.colorSwatchBackground} />
      <div
        className={styles.colorSwatchColor}
        style={{ backgroundColor: cssColor }}
      />
    </div>
  );
}

function ColorField(
  props: Omit<ColorFieldProps, 'onChange'> & {
    /**
     * Handler that is called when the value changes.
     *
     * @param color The color will be a string while the user is typing, then on
     * blur the color will be a color object or null, depending on whether the
     * string can be converted to a valid color.
     */
    onChange?: (color: Color | string | null) => void;
  }
) {
  const state = useColorFieldState(props);
  const inputRef = useRef<HTMLInputElement>(null);

  const label = props.label || 'Color';

  const { inputProps, labelProps } = useColorField(
    { ...props, label },
    state,
    inputRef
  );

  return (
    <div className={styles.colorField}>
      <label {...labelProps}>{label}</label>
      <input
        className={clsx(styles.colorFieldInput, 'focus-ring')}
        {...inputProps}
        ref={inputRef}
      />
    </div>
  );
}
