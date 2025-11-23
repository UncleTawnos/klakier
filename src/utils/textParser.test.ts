import { describe, it, expect } from 'vitest';
import { parseParagraphs } from './textParser';

describe('parseParagraphs', () => {
  it('returns empty array for empty string', () => {
    expect(parseParagraphs('')).toEqual([]);
  });

  it('returns empty array for whitespace only', () => {
    expect(parseParagraphs('   \n\t  ')).toEqual([]);
  });

  it('returns single paragraph for text without double newlines', () => {
    expect(parseParagraphs('Hello world')).toEqual(['Hello world']);
  });

  it('splits text on double newlines', () => {
    const input = 'First paragraph\n\nSecond paragraph';
    expect(parseParagraphs(input)).toEqual(['First paragraph', 'Second paragraph']);
  });

  it('handles multiple consecutive newlines', () => {
    const input = 'First\n\n\n\nSecond';
    expect(parseParagraphs(input)).toEqual(['First', 'Second']);
  });

  it('trims whitespace from paragraphs', () => {
    const input = '  First  \n\n  Second  ';
    expect(parseParagraphs(input)).toEqual(['First', 'Second']);
  });

  it('filters out empty paragraphs', () => {
    const input = 'First\n\n\n\n\n\nSecond';
    expect(parseParagraphs(input)).toEqual(['First', 'Second']);
  });

  it('preserves single newlines within paragraphs', () => {
    const input = 'Line 1\nLine 2\n\nParagraph 2';
    expect(parseParagraphs(input)).toEqual(['Line 1\nLine 2', 'Paragraph 2']);
  });

  it('handles three paragraphs', () => {
    const input = 'First\n\nSecond\n\nThird';
    expect(parseParagraphs(input)).toEqual(['First', 'Second', 'Third']);
  });
});
