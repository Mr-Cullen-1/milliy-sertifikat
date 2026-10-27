import { describeGenerator } from './harness';
import { generateGeometryStereo } from '../../content/gen/geometriya-stereo';

describeGenerator({
  name: 'geometriya (stereometriya)',
  generate: generateGeometryStereo,
  block: 'geometriya',
  filter: (r) => r.index % 2 === 1,
});
