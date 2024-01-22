import type { PropsWithChildren, ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import styles from './Tooltip.module.css';

type TooltipProps = Pick<
  TooltipPrimitive.TooltipContentProps,
  'asChild' | 'side' | 'sideOffset' | 'align' | 'alignOffset'
> &
  PropsWithChildren<{
    content: ReactNode;
  }>;

export function Tooltip({ children, content, ...contentProps }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className={styles.tooltip} {...contentProps}>
          {content}
          <TooltipPrimitive.Arrow className={styles.tooltipArrow} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;
