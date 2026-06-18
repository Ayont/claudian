export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaChatOptions {
  baseUrl: string;
  model: string;
  system?: string;
}

export class OllamaChatClient {
  constructor(private readonly options: OllamaChatOptions) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.options.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async *chat(messages: OllamaMessage[]): AsyncGenerator<string> {
    const response = await fetch(`${this.options.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.options.model,
        messages,
        stream: true,
      }),
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line) as { message?: { content: string }; done?: boolean };
          if (data.message?.content) {
            yield data.message.content;
          }
          if (data.done) return;
        } catch {
          // Ignore malformed JSON lines.
        }
      }
    }
  }
}
