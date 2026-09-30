import { Route } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { Home } from './home/home';
import { RemoteUnavailable } from './remote-unavailable/remote-unavailable';

/**
 * Carrega as rotas expostas por um remote registrado em `public/mf.manifest.json`.
 * Se o remote estiver fora do ar, a rota cai em uma tela de fallback em vez de quebrar o host.
 */
const loadRemoteRoutes = (remoteName: string) => () =>
  loadRemoteModule({ type: 'manifest', remoteName, exposedModule: './Routes' })
    .then((m) => m.remoteRoutes)
    .catch((err) => {
      console.error(`[shell] falha ao carregar o remote "${remoteName}"`, err);
      return [{ path: '**', component: RemoteUnavailable, data: { remoteName } }];
    });

export const appRoutes: Route[] = [
  { path: '', component: Home, title: 'Elizabete Fabri' },
  { path: 'projetos', loadChildren: loadRemoteRoutes('projects'), title: 'Projetos' },
  { path: 'sobre', loadChildren: loadRemoteRoutes('about'), title: 'Sobre' },
  { path: 'contato', loadChildren: loadRemoteRoutes('contact'), title: 'Contato' },
  { path: '**', redirectTo: '' },
];
