import { Toaster } from 'sonner';

import { Editor } from '@/components/Editor';

export function App() {
  return (
    <>
      <Editor />
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
