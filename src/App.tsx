import { type ComponentType } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

async function lazyImportDefault<T extends ComponentType>(
  importPromise: Promise<{ default: T }>
) {
  const { default: Component } = await importPromise;
  return { Component };
}

const router = createBrowserRouter([
  {
    path: '/',
    lazy: () => lazyImportDefault(import('@/components/Home')),
  },
  {
    path: '/editor',
    lazy: () => lazyImportDefault(import('@/components/Editor')),
  },
  {
    path: '/player',
    lazy: () => lazyImportDefault(import('@/components/AnimationPlayer')),
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
