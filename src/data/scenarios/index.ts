import { poemWriting } from './poemWriting';
import { marketing } from './marketing';
import { newsPost } from './newsPost';
import { ScenarioData } from '@/types/scenarios';

export const scenarios: ScenarioData[] = [
  poemWriting,
  marketing,
  newsPost,
];

export {
  poemWriting,
  marketing,
  newsPost,
};

export * from './marketing'; 