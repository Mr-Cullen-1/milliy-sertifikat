import { describeGenerator } from './harness';
import { generateSonlar } from '../../content/gen/sonlar';

describeGenerator({ name: 'sonlar', generate: generateSonlar, block: 'sonlar' });
