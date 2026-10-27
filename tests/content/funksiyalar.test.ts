import { generateFunksiyalar } from '../../content/gen/funksiyalar';
import { describeGenerator } from './harness';

describeGenerator({ name: 'funksiyalar', generate: generateFunksiyalar, block: 'funksiyalar' });
