import { describeGenerator } from './harness';
import { generateAlgebra } from '../../content/gen/algebra';

describeGenerator({ name: 'algebra', generate: generateAlgebra, block: 'algebra' });
