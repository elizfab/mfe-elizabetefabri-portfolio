import { TestBed } from '@angular/core/testing';
import { PROJECTS } from '@elizfab/shared/data';
import { Projects } from './remote-entry/projects';

describe('Projects (remote)', () => {
  it('lista todos os projetos e filtra por categoria', async () => {
    await TestBed.configureTestingModule({ imports: [Projects] }).compileComponents();
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.card').length).toBe(PROJECTS.length);

    const fullStack = Array.from(el.querySelectorAll<HTMLButtonElement>('.filters button')).find(
      (b) => b.textContent?.trim() === 'Full-stack',
    );
    fullStack?.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.card').length).toBe(
      PROJECTS.filter((p) => p.category === 'Full-stack').length,
    );
  });
});
