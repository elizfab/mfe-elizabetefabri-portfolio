import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PROFILE } from '@elizfab/shared/data';

@Component({
  selector: 'ef-contact',
  template: `
    <section class="contact">
      <h1>Contato</h1>
      <p class="hint">Micro frontend <code>contact</code> · porta 4203</p>
      <ul>
        <li><a [href]="profile.linkedinUrl" target="_blank" rel="noopener">LinkedIn</a></li>
        <li><a [href]="profile.githubUrl" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </section>
  `,
  styles: `
    .contact { display: grid; gap: .75rem; }
    .hint { color: var(--ef-muted, #6b7280); margin: 0; }
    ul { display: flex; gap: 1rem; list-style: none; padding: 0; }
    a { color: var(--ef-primary, #7c3aed); font-weight: 600; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  protected readonly profile = PROFILE;
}
