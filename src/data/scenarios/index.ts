import { poemWriting } from './poemWriting';
import { marketing } from './marketing';
import { newsPost } from './newsPost';
import { summarizeArticle } from './summarizeArticle';
import { instagramCaption } from './instagramCaption';
import { studyPlan } from './studyPlan';
import { ScenarioData } from '@/types/scenarios';

export const scenarios: ScenarioData[] = [
  poemWriting,
  marketing,
  newsPost,
  summarizeArticle,
  instagramCaption,
  studyPlan,
];

export {
  poemWriting,
  marketing,
  newsPost,
  summarizeArticle,
  instagramCaption,
  studyPlan,
};

export * from './marketing'; 