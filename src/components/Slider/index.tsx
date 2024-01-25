import * as SliderPrimitive from '@radix-ui/react-slider';

import styles from './Slider.module.css';

import type { JsUnion } from '@/utils/types';

type SliderProps = Pick<
  SliderPrimitive.SliderProps,
  | 'defaultValue'
  | 'value'
  | 'onValueChange'
  | 'onValueCommit'
  | 'name'
  | 'disabled'
  | 'orientation'
  | 'inverted'
  | 'min'
  | 'max'
  | 'step'
> & {
  id?: string;
  width?: 'fixed' | 'full';
} & JsUnion<{ 'aria-label': string }, { 'aria-labelledby': string }>;

export function Slider({
  id,
  width = 'fixed',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root {...props} className={styles.root} data-width={width}>
      <SliderPrimitive.Track className={styles.track}>
        <SliderPrimitive.Range className={styles.range} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        id={id}
        className={styles.thumb}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      />
    </SliderPrimitive.Root>
  );
}
