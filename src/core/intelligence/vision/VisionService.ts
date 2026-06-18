import type { TFile} from 'obsidian';
import { type Vault } from 'obsidian';

export interface ImageAnalysisResult {
  path: string;
  description: string;
  detectedText?: string[];
}

export class VisionService {
  constructor(private readonly vault: Vault) {}

  async analyzeImage(file: TFile): Promise<ImageAnalysisResult> {
    // Stub: real implementation would call a vision-capable provider.
    return {
      path: file.path,
      description: `Image at ${file.path} (${file.stat.size} bytes). Vision analysis is available when a vision-capable provider is configured.`,
    };
  }
}
