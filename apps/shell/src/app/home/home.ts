import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE, PROJECTS } from '@elizfab/shared/data';

@Component({
  selector: 'ef-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <p class="eyebrow">{{ profile.role }}</p>
      <h1>Olá, eu sou {{ profile.name }}</h1>
      <p>{{ profile.summary }}</p>
      <div class="actions">
        <a routerLink="/projetos" class="primary">Ver {{ projectCount }} projetos</a>
        <a routerLink="/contato">Entrar em contato</a>
      </div>
      <p class="hint">
        Host <code>shell</code> (4200) — as seções Projetos, Sobre e Contato são micro frontends
        carregados em tempo de execução via Module Federation.
      </p>
    </section>
  `,
  styles: `
    .hero { display: grid; gap: 1rem; max-width: 720px; padding: 2rem 0; }
    .eyebrow { color: var(--ef-primary); font-weight: 600; margin: 0; }
    h1 { font-size: clamp(1.8rem, 5vw, 2.6rem); margin: 0; }
    .actions { display: flex; gap: .75rem; flex-wrap: wrap;
      a { padding: .6rem 1.1rem; border-radius: 8px; border: 1px solid var(--ef-border); text-decoration: none; color: inherit; }
      .primary { background: var(--ef-primary); color: #fff; border-color: transparent; } }
    .hint { color: var(--ef-muted); font-size: .9rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly profile = PROFILE;
  protected readonly projectCount = PROJECTS.length;
}
