import { QueryBackedTitleGenerationService } from '../../../core/auxiliary/QueryBackedTitleGenerationService';
import type ClaudianPlugin from '../../../main';
import { KimiAuxQueryRunner } from '../runtime/KimiAuxQueryRunner';

export class KimiTitleGenerationService extends QueryBackedTitleGenerationService {
  constructor(plugin: ClaudianPlugin) {
    super({
      createRunner: () => new KimiAuxQueryRunner(plugin),
    });
  }
}
