import { Toaster } from 'sonner';

import { AnimationPlayer } from '@/components/AnimationPlayer';

export function App() {
  return (
    <>
      <AnimationPlayer />
      <Toaster
        toastOptions={{
          style: {
            backgroundColor: 'var(--clr-neutral-background)',
            borderColor: 'var(--clr-neutral-subtle-highlight)',
          },
        }}
        theme="dark"
        richColors
      />
    </>
  );
}
