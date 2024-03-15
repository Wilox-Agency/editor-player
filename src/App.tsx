import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { Home } from '@/components/Home';
import { Editor } from '@/components/Editor';
import { AnimationPlayer } from '@/components/AnimationPlayer';

const router = createBrowserRouter([
  {
    path: '/',
    // TODO: Create home element
    element: <Home />,
  },
  {
    path: '/editor',
    element: <Editor />,
  },
  {
    path: '/player',
    element: <AnimationPlayer />,
  },
]);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
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
