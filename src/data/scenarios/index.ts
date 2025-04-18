import { poemWriting } from './poemWriting';
import { marketing } from './marketing';
import { research } from './research';
import { contentPlanning } from './contentPlanning';
import { visualIdeas } from './visualIdeas';
import { videoScripts } from './videoScripts';
import { startupPitch } from './startupPitch';
import { ScenarioData } from '@/types/scenarios';

export const scenarios: ScenarioData[] = [
  poemWriting,
  marketing,
  research,
  contentPlanning,
  visualIdeas,
  videoScripts,
  startupPitch,
];

export {
  poemWriting,
  marketing,
  research,
  contentPlanning,
  visualIdeas,
  videoScripts,
  startupPitch,
};

export * from './marketing';
export * from './startupPitch'; 