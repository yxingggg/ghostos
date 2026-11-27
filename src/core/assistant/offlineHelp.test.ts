import { describe, it, expect } from 'vitest';
import {
  answerQuestion,
  fallbackAnswer,
  HELP_TOPICS,
  suggestedQuestions,
  topicById,
} from './offlineHelp';

describe('offline help assistant', () => {
  it('matches questions to the right topic', () => {
    expect(answerQuestion('How do I open a file?').topicId).toBe('open-files');
    expect(answerQuestion('what terminal commands are there').topicId).toBe('terminal');
    expect(answerQuestion('does it work offline without internet').topicId).toBe('offline');
    expect(answerQuestion('how do I back up my workspace').topicId).toBe('backup');
    expect(answerQuestion('keyboard shortcuts').topicId).toBe('shortcuts');
  });

  it('returns matched=true with a non-empty answer for known topics', () => {
    const r = answerQuestion('how do I enable the online AI / openai');
    expect(r.matched).toBe(true);
    expect(r.topicId).toBe('assistant');
    expect(r.answer.length).toBeGreaterThan(20);
  });

  it('gives a graceful fallback for unrecognized questions', () => {
    const r = answerQuestion('xyzzy plugh nonsense zork');
    expect(r.matched).toBe(false);
    expect(r.topicId).toBeNull();
    expect(r.answer).toBe(fallbackAnswer());
  });

  it('gives a fallback for empty/stopword-only input', () => {
    expect(answerQuestion('').matched).toBe(false);
    expect(answerQuestion('how do I').matched).toBe(false);
  });

  it('fallback clearly states it is not a generative AI', () => {
    expect(fallbackAnswer().toLowerCase()).toContain('not a generative ai');
  });

  it('exposes clickable suggested questions', () => {
    const s = suggestedQuestions(4);
    expect(s).toHaveLength(4);
    expect(s[0]?.question.length).toBeGreaterThan(0);
  });

  it('every topic is retrievable by id and has keywords', () => {
    for (const t of HELP_TOPICS) {
      expect(topicById(t.id)).toBe(t);
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(t.answer.length).toBeGreaterThan(0);
    }
  });
});
