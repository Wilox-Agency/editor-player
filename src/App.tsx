import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { Home } from '@/components/Home';
import { Editor } from '@/components/Editor';
import { AnimationPlayer } from '@/components/AnimationPlayer';

const router = createBrowserRouter([
  {
    path: '/',
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        toastOptions={{
          style: {
            backgroundColor: 'var(--clr-neutral-background)',
            borderColor: 'var(--clr-neutral-subtle-highlight)',
          },
          classNames: { closeButton: 'toast-close-button' },
        }}
        position="top-right"
        theme="dark"
        richColors
        closeButton
        pauseWhenPageIsHidden
      />
    </QueryClientProvider>
  );
}
