import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // tsconfig "@/*" yo'li (komponentlar shu alias bilan import qiladi)
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
});
