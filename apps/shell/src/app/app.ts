import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'ef-root',
  template: `
    <header class="topbar">
      <a routerLink="/" class="brand">elizabete<span>fabri</span></a>
      <nav>
        @for (link of links; track link.path) {
          <a [routerLink]="link.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: link.path === '/' }">
            {{ link.label }}
          </a>
        }
      </nav>
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly links = [
    { path: '/', label: 'Início' },
    { path: '/projetos', label: 'Projetos' },
    { path: '/sobre', label: 'Sobre' },
    { path: '/contato', label: 'Contato' },
  ];
}
