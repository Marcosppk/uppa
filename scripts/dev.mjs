// Sobe o servidor da API e os dois apps em modo desenvolvimento.
import { spawn } from 'node:child_process';

const procs = [
  ['api', 'node', ['--watch', 'server/index.mjs']],
  ['financeiro', 'npx', ['vite', '--config', 'apps/financeiro/vite.config.ts']],
  ['associados', 'npx', ['vite', '--config', 'apps/associados/vite.config.ts']],
].map(([nome, cmd, args]) => {
  const p = spawn(cmd, args, { shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  const out = (d) => process.stdout.write(String(d).replace(/^(?=.)/gm, `[${nome}] `));
  p.stdout.on('data', out);
  p.stderr.on('data', out);
  return p;
});
const parar = () => { for (const p of procs) p.kill(); process.exit(); };
process.on('SIGINT', parar);
process.on('SIGTERM', parar);
