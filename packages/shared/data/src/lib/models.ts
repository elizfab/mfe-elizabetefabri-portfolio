export type ProjectCategory = 'Frontend' | 'Backend' | 'Full-stack' | 'Estudos';

export interface Project {
  slug: string;
  title: string;
  description: string;
  category: ProjectCategory;
  techs: string[];
  repoUrl: string;
  demoUrl?: string;
}

export interface Profile {
  name: string;
  role: string;
  summary: string;
  githubUrl: string;
  linkedinUrl: string;
}
