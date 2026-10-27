import { describeGenerator } from './harness';
import { generateGeometryPlan } from '../../content/gen/geometriya-plan';

describeGenerator({
  name: 'geometriya (planimetriya)',
  generate: generateGeometryPlan,
  block: 'geometriya',
  filter: (r) => r.index % 2 === 0,
});
