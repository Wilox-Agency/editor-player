/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AZURE_FUNCTIONS_KEY?: string;
  readonly VITE_BACKGROUND_MUSIC_BASE_URL?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
