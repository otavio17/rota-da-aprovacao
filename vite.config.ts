import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base com o nome do repositório: sem isso o site abre em branco no GitHub Pages (seção 10)
export default defineConfig({
  base: '/rota-da-aprovacao/',
  plugins: [react()],
  test: { environment: 'node' },
});
