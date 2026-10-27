import { describeGenerator } from './harness';
import { generateToplam } from '../../content/gen/toplam';

describeGenerator({ name: 'toplam (94-103)', generate: generateToplam, block: 'toplam' });
