import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const raiz = fileURLToPath(new URL('.', import.meta.url));
// Número da versão (package.json) dentro do app, para mostrar e comparar com o servidor.
const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

export default defineConfig({
  root: raiz,
  base: './',
  plugins: [react()],
  define: { __VERSAO__: JSON.stringify(version) },
  resolve: { alias: { '@shared': fileURLToPath(new URL('../../shared', import.meta.url)) } },
  server: { port: 5174, strictPort: true, proxy: { '/api': 'http://localhost:3333' } },
  build: { outDir: fileURLToPath(new URL('../../dist/associados', import.meta.url)), emptyOutDir: true },
});
