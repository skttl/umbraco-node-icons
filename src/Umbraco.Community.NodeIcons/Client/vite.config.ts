import { defineConfig } from 'vite';

export default defineConfig({
  base: '/App_Plugins/NodeIcons/',
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true,
    lib: { entry: 'src/entrypoint.ts', formats: ['es'], fileName: 'node-icons' },
    rollupOptions: {
      external: (id) => id.startsWith('@umbraco-cms/'),
    },
  },
});
