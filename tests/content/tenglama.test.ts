import { generateTenglama } from '../../content/gen/tenglama';
import { describeGenerator } from './harness';

describeGenerator({ name: 'tenglama', generate: generateTenglama, block: 'tenglama' });
