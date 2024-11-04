import { RouterProvider, createHashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
// import Home from './pages/Home';
import AnimationPlayer from './pages/AnimationPlayer'

const router = createHashRouter([
  {
    path: '/',
    element: <AnimationPlayer />, // Carga directa del componente
  }
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
        expand
        visibleToasts={5}
      />
    </QueryClientProvider>
  );
}
