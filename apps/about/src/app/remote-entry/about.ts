import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PROFILE } from '@elizfab/shared/data';

@Component({
  selector: 'ef-about',
  template: `
    <section class="about">
      <h1>Sobre</h1>
      <p class="hint">Micro frontend <code>about</code> · porta 4202</p>
      <h2>{{ profile.name }}</h2>
      <p class="role">{{ profile.role }}</p>
      <p>{{ profile.summary }}</p>
      <h3>Stack principal</h3>
      <ul>
        @for (skill of skills; track skill) {
          <li>{{ skill }}</li>
        }
      </ul>
    </section>
  `,
  styles: `
    .about { display: grid; gap: .75rem; max-width: 720px; }
    .hint { color: var(--ef-muted, #6b7280); margin: 0; }
    .role { color: var(--ef-primary, #7c3aed); font-weight: 600; margin: 0; }
    h2 { margin: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly profile = PROFILE;
  protected readonly skills = [
    'Angular (standalone, signals, NgRx)',
    'TypeScript',
    'Micro Frontends com Module Federation',
    'Nx Monorepo',
    'Go + MongoDB',
  ];
}
