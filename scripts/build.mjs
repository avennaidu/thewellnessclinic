import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
const preview = process.argv.includes('--preview');
const outdir = preview ? 'dist-preview' : 'dist';
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: ['apps/web/src/main.tsx'],
  bundle: true,
  outdir,
  entryNames: 'app',
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  sourcemap: false,
  define: { 'process.env.NODE_ENV': '"production"', __SHARED_PREVIEW__: String(preview) },
  loader: { '.svg': 'dataurl' },
});
await copyFile('apps/web/index.html', `${outdir}/index.html`);
console.log(`Member portal and staff dashboard built in ${outdir}/`);
