import { OllamaChatClient } from '../../../../../src/core/intelligence/localLlm/OllamaChatClient';

describe('OllamaChatClient', () => {
  it('constructs with options', () => {
    const client = new OllamaChatClient({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    expect(client).toBeDefined();
  });
});
