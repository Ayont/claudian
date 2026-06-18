import type { TFile, Vault } from 'obsidian';

import { VisionService } from '../../../../../src/core/intelligence/vision/VisionService';

function createVault(file: { path: string; size: number }): Vault {
  return {
    getAbstractFileByPath: () => ({ path: file.path, stat: { size: file.size } } as TFile),
  } as unknown as Vault;
}

describe('VisionService', () => {
  it('returns a stub analysis', async () => {
    const vault = createVault({ path: 'image.png', size: 1234 });
    const vision = new VisionService(vault);
    const result = await vision.analyzeImage({ path: 'image.png', stat: { size: 1234 } } as TFile);
    expect(result.path).toBe('image.png');
    expect(result.description).toContain('image.png');
  });
});
