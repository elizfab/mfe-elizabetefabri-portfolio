import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PROJECTS, ProjectCategory } from '@elizfab/shared/data';

@Component({
  selector: 'ef-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Projects {
  protected readonly categories: (ProjectCategory | 'Todos')[] = ['Todos', 'Frontend', 'Full-stack'];
  protected readonly filter = signal<ProjectCategory | 'Todos'>('Todos');
  protected readonly projects = computed(() => {
    const filter = this.filter();
    return filter === 'Todos' ? PROJECTS : PROJECTS.filter((p) => p.category === filter);
  });
}
