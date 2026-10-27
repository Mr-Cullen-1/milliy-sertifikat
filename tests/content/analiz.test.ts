import { describeGenerator } from './harness';
import { generateAnaliz } from '../../content/gen/analiz';

describeGenerator({ name: 'analiz (56-66)', generate: generateAnaliz, block: 'analiz' });
