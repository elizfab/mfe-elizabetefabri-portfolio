// Monta o site estático do portfólio a partir de dist/apps:
// shell na raiz, cada remote (app com remoteEntry.js) em /remotes/<nome>, e o mf.manifest.json de produção.
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [distApps = 'dist/apps', out = 'site'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
cpSync(join(distApps, 'shell'), out, { recursive: true });

const manifest = {};
for (const app of readdirSync(distApps)) {
  if (app === 'shell' || !existsSync(join(distApps, app, 'remoteEntry.js'))) continue;
  cpSync(join(distApps, app), join(out, 'remotes', app), { recursive: true });
  manifest[app] = `/remotes/${app}/remoteEntry.js`;
}
writeFileSync(join(out, 'mf.manifest.json'), JSON.stringify(manifest, null, 2));
console.log('remotes:', Object.keys(manifest).join(', '));
