import { KonvaContextProvider } from '@/contexts/KonvaContext';

import { Editor } from '@/components/Editor';

export function App() {
  return (
    <KonvaContextProvider>
      <Editor />
    </KonvaContextProvider>
  );
}
