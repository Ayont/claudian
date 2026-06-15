import {
  buildConversationContextBootstrap,
  CONTEXT_BOOTSTRAP_CHAR_CAP,
} from '@/core/conversation/ConversationContextBootstrap';
import type { ChatMessage } from '@/core/types';

function userMsg(content: string, id = `u-${content.length}-${Math.random()}`): ChatMessage {
  return { id, role: 'user', content, timestamp: 1 };
}

function assistantMsg(content: string, id = `a-${content.length}-${Math.random()}`): ChatMessage {
  return { id, role: 'assistant', content, timestamp: 2, toolCalls: [], contentBlocks: [] };
}

describe('buildConversationContextBootstrap', () => {
  it('returns empty string for empty history', () => {
    expect(buildConversationContextBootstrap([])).toBe('');
  });

  it('returns empty string when history has no renderable content', () => {
    // Empty assistant message with no tool calls / thinking is skipped by the formatter.
    expect(buildConversationContextBootstrap([assistantMsg('')])).toBe('');
  });

  it('frames the snapshot in <conversation_context> tags', () => {
    const out = buildConversationContextBootstrap([
      userMsg('Hello there'),
      assistantMsg('General Kenobi'),
    ]);
    expect(out.startsWith('<conversation_context>')).toBe(true);
    expect(out.trimEnd().endsWith('</conversation_context>')).toBe(true);
  });

  it('keeps recent turns verbatim with oldest-last ordering', () => {
    const out = buildConversationContextBootstrap([
      userMsg('first question'),
      assistantMsg('first answer'),
      userMsg('second question'),
      assistantMsg('second answer'),
    ]);
    expect(out).toContain('first question');
    expect(out).toContain('second answer');
    // Oldest before newest.
    expect(out.indexOf('first question')).toBeLessThan(out.indexOf('second question'));
    expect(out.indexOf('second question')).toBeLessThan(out.indexOf('second answer'));
  });

  it('uses User:/Assistant: role framing from the shared formatter', () => {
    const out = buildConversationContextBootstrap([
      userMsg('ping'),
      assistantMsg('pong'),
    ]);
    expect(out).toContain('User: ping');
    expect(out).toContain('Assistant: pong');
  });

  it('honors the default char cap', () => {
    const big = 'x'.repeat(20_000);
    const out = buildConversationContextBootstrap([
      userMsg(big),
      assistantMsg(big),
      userMsg('latest short turn'),
    ]);
    // Hard bound: framed payload must not blow past the cap (+ small tag overhead).
    const tagOverhead = '<conversation_context>\n\n</conversation_context>'.length;
    expect(out.length).toBeLessThanOrEqual(CONTEXT_BOOTSTRAP_CHAR_CAP + tagOverhead);
  });

  it('marks dropped older turns with an omitted note', () => {
    const big = 'y'.repeat(20_000);
    const out = buildConversationContextBootstrap([
      userMsg(big),
      assistantMsg('older answer that gets dropped'),
      userMsg('most recent question'),
    ]);
    expect(out).toContain('[earlier turns omitted]');
    expect(out).toContain('most recent question');
  });

  it('keeps the full history when it already fits and adds no omitted note', () => {
    const out = buildConversationContextBootstrap([
      userMsg('short q'),
      assistantMsg('short a'),
    ]);
    expect(out).not.toContain('[earlier turns omitted]');
  });

  it('respects a custom maxChars override and stays bounded', () => {
    const out = buildConversationContextBootstrap(
      [
        userMsg('a'.repeat(500)),
        assistantMsg('b'.repeat(500)),
        userMsg('c'.repeat(500)),
      ],
      { maxChars: 200 },
    );
    const tagOverhead = '<conversation_context>\n\n</conversation_context>'.length;
    expect(out.length).toBeLessThanOrEqual(200 + tagOverhead);
    expect(out).toContain('[earlier turns omitted]');
  });

  it('returns empty string when maxChars is zero or negative', () => {
    const msgs = [userMsg('hi'), assistantMsg('yo')];
    expect(buildConversationContextBootstrap(msgs, { maxChars: 0 })).toBe('');
    expect(buildConversationContextBootstrap(msgs, { maxChars: -10 })).toBe('');
  });
});
