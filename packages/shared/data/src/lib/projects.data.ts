import { Project } from './models';

export const PROJECTS: Project[] = [
  {
    slug: 'carteirasaude',
    title: 'Carteira de Saúde e Vacinação',
    description:
      'Controle pessoal de carteira de vacinação e histórico de saúde, com múltiplos perfis e impressão A4.',
    category: 'Frontend',
    techs: ['Angular', 'ng-zorro-antd', 'NgRx'],
    repoUrl: 'https://github.com/elizfab/carteira-saude',
    demoUrl: 'https://carterinha-vacinacao.vercel.app/carteira/dados',
  },
  {
    slug: 'dosecerta',
    title: 'Dose Certa',
    description:
      'Controle pessoal de medicação, exames e medidas de saúde, com lembretes por período do dia.',
    category: 'Frontend',
    techs: ['Angular', 'PrimeNG', 'NgRx'],
    repoUrl: 'https://github.com/elizfab/dosecerta',
    demoUrl: 'https://dosescerta.vercel.app/',
  },
  {
    slug: 'suplementos-store',
    title: 'Suplementos Store',
    description:
      'E-commerce de suplementos com vitrine, carrinho, favoritos e checkout, integrado a uma API Go + MongoDB.',
    category: 'Full-stack',
    techs: ['Angular', 'NgRx', 'PrimeNG', 'Go', 'MongoDB', 'Docker'],
    repoUrl: 'https://github.com/elizfab/suplementos-store',
  },
  {
    slug: 'pdi',
    title: 'PDI',
    description:
      'Apresentação pública do Plano de Desenvolvimento Individual, com navegação por abas e tema claro/escuro.',
    category: 'Frontend',
    techs: ['Angular', 'Puppeteer'],
    repoUrl: 'https://github.com/elizfab/pdi',
    demoUrl: 'https://pdi.elizabetesousafabri.com.br',
  },
  {
    slug: 'caderno-inteligente',
    title: 'Caderno Inteligente',
    description:
      'Painel pessoal de estudos, projetos, quiz e culinária, com login e dashboard de progresso.',
    category: 'Full-stack',
    techs: ['Angular', 'PrimeNG', 'NgRx', 'Chart.js', 'Go', 'MongoDB'],
    repoUrl: 'https://github.com/elizfab/caderno-inteligente',
  },
];
