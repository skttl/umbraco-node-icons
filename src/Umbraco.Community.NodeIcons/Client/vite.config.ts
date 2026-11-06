import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/App_Plugins/NodeIcons/',
  plugins: [{
    name: 'package-version',
    apply: 'build',
    closeBundle() {
      const version = (process.env.RELEASE_VERSION ?? execFileSync('dotnet', [
        'msbuild', fileURLToPath(new URL('../Umbraco.Community.NodeIcons.csproj', import.meta.url)),
        '-getProperty:Version', '-nologo',
      ], { encoding: 'utf8' })).trim();
      if (!version) throw new Error('Package version must not be empty.');
      const path = new URL('../wwwroot/umbraco-package.json', import.meta.url);
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      writeFileSync(path, JSON.stringify({ ...manifest, version }, null, 2) + '\n');
    },
  }],
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true,
    lib: { entry: 'src/entrypoint.ts', formats: ['es'], fileName: 'node-icons' },
    rollupOptions: {
      external: (id) => id.startsWith('@umbraco-cms/'),
    },
  },
});
