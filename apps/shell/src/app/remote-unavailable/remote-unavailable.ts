import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'ef-remote-unavailable',
  template: `
    <section class="fallback" role="alert">
      <h1>Seção indisponível</h1>
      <p>
        O micro frontend <code>{{ remoteName }}</code> não respondeu. Verifique se ele está rodando
        (<code>npx nx serve {{ remoteName }}</code>) ou tente novamente mais tarde.
      </p>
    </section>
  `,
  styles: `.fallback { border: 1px dashed var(--ef-border); border-radius: 12px; padding: 1.5rem; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoteUnavailable {
  protected readonly remoteName: string = inject(ActivatedRoute).snapshot.data['remoteName'];
}
