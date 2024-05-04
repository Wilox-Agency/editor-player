import { Loader2 } from 'lucide-react';

import styles from './PlayerLoading.module.css';

import { usePlayerTimelineStore } from '@/hooks/usePlayerTimeline';

export function PlayerLoading() {
  const isVideoLoading = usePlayerTimelineStore(
    (state) => state.isCurrentVideoLoading
  );

  if (!isVideoLoading) return null;

  return (
    <div className={styles.loadingOverlay}>
      <Loader2 size={32} className={styles.loadingSpinner} />
    </div>
  );
}
