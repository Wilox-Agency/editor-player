import { useRef } from 'react';
import { Layer } from 'react-konva';
import { Html } from 'react-konva-utils';

import styles from './PlayerOrganizationLogo.module.css';

import { useStageScaleStore } from '@/hooks/useStageScaleStore';
import { useWindowResize } from '@/hooks/useWindowResize';
import { convertScale } from '@/utils/konva/scale';

export function PlayerOrganizationLogo({
  logoUrl,
}: {
  logoUrl: string | undefined;
}) {
  const logoContainerRef = useRef<HTMLDivElement>(null);

  useWindowResize(() => {
    const logoContainer = logoContainerRef.current;
    if (!logoContainer) return;

    const stageContainer = document.querySelector(
      '.konvajs-content'
    ) as HTMLElement | null;

    if (!stageContainer) return;

    /* Even though this value is not from Konva itself, it is scaled too because
    the stage container gets a scale transform */
    const stageBox = convertScale(
      stageContainer.getBoundingClientRect().toJSON() as DOMRectReadOnly,
      { to: 'unscaled' }
    );

    // Set the position of the logo container based on the stage container
    logoContainer.style.left = `${stageBox.left}px`;
    logoContainer.style.top = `${stageBox.top}px`;

    // Set the scale of the logo container to be the same as the stage container
    const { stageContainerScale } = useStageScaleStore.getState();
    logoContainer.style.transform = `scale(${stageContainerScale})`;
  });

  if (!logoUrl) return null;

  return (
    <Layer listening={false}>
      <Html divProps={{ style: { zIndex: 'unset' } }}>
        <div className={styles.logoContainer} ref={logoContainerRef}>
          <img src={logoUrl} alt="" />
        </div>
      </Html>
    </Layer>
  );
}
