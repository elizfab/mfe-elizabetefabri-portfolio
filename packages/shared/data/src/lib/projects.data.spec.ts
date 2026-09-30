import { PROJECTS } from './projects.data';

describe('PROJECTS', () => {
  it('possui slugs únicos', () => {
    const slugs = PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('todo projeto tem repositório e ao menos uma tecnologia', () => {
    for (const project of PROJECTS) {
      expect(project.repoUrl).toMatch(/^https:\/\//);
      expect(project.techs.length).toBeGreaterThan(0);
    }
  });
});
