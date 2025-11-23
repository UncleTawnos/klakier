import { describe, it, expect } from 'vitest';
import { generateXml } from './XmlGenerator';
import { PromptData, Agent } from '../types';

const mockAgent: Agent = {
  id: 'test-agent',
  name: 'Test Agent',
  description: 'A test agent',
};

describe('generateXml', () => {
  it('returns empty string when all fields are empty', () => {
    const data: PromptData = {
      agent: null,
      requirements: '',
      context: '',
      task: '',
    };
    expect(generateXml(data)).toBe('');
  });

  it('generates agent tag when agent is selected', () => {
    const data: PromptData = {
      agent: mockAgent,
      requirements: '',
      context: '',
      task: '',
    };
    expect(generateXml(data)).toBe('<agent>use test-agent</agent>');
  });

  it('generates context tag when context is provided', () => {
    const data: PromptData = {
      agent: null,
      requirements: '',
      context: 'Some context',
      task: '',
    };
    expect(generateXml(data)).toBe('<context>Some context</context>');
  });

  it('trims context whitespace', () => {
    const data: PromptData = {
      agent: null,
      requirements: '',
      context: '  Some context  ',
      task: '',
    };
    expect(generateXml(data)).toBe('<context>Some context</context>');
  });

  it('generates requirements with single requirement', () => {
    const data: PromptData = {
      agent: null,
      requirements: 'First requirement',
      context: '',
      task: '',
    };
    const expected = `<requirements>
  <requirement>First requirement</requirement>
</requirements>`;
    expect(generateXml(data)).toBe(expected);
  });

  it('generates requirements with multiple requirements', () => {
    const data: PromptData = {
      agent: null,
      requirements: 'First\n\nSecond\n\nThird',
      context: '',
      task: '',
    };
    const expected = `<requirements>
  <requirement>First</requirement>
  <requirement>Second</requirement>
  <requirement>Third</requirement>
</requirements>`;
    expect(generateXml(data)).toBe(expected);
  });

  it('generates tasks with single task', () => {
    const data: PromptData = {
      agent: null,
      requirements: '',
      context: '',
      task: 'First task',
    };
    const expected = `<tasks>
  <task>First task</task>
</tasks>`;
    expect(generateXml(data)).toBe(expected);
  });

  it('generates tasks with multiple tasks', () => {
    const data: PromptData = {
      agent: null,
      requirements: '',
      context: '',
      task: 'First\n\nSecond',
    };
    const expected = `<tasks>
  <task>First</task>
  <task>Second</task>
</tasks>`;
    expect(generateXml(data)).toBe(expected);
  });

  it('generates complete XML with all fields', () => {
    const data: PromptData = {
      agent: mockAgent,
      requirements: 'Req 1\n\nReq 2',
      context: 'My context',
      task: 'Task 1\n\nTask 2',
    };
    const expected = `<agent>use test-agent</agent>
<requirements>
  <requirement>Req 1</requirement>
  <requirement>Req 2</requirement>
</requirements>
<context>My context</context>
<tasks>
  <task>Task 1</task>
  <task>Task 2</task>
</tasks>`;
    expect(generateXml(data)).toBe(expected);
  });

  it('omits empty sections', () => {
    const data: PromptData = {
      agent: mockAgent,
      requirements: '',
      context: 'Some context',
      task: '',
    };
    const expected = `<agent>use test-agent</agent>
<context>Some context</context>`;
    expect(generateXml(data)).toBe(expected);
  });

  it('ignores whitespace-only requirements', () => {
    const data: PromptData = {
      agent: null,
      requirements: '   \n\n   ',
      context: '',
      task: '',
    };
    expect(generateXml(data)).toBe('');
  });

  it('handles different agent IDs', () => {
    const architect: Agent = {
      id: 'architect',
      name: 'Architect',
    };
    const data: PromptData = {
      agent: architect,
      requirements: '',
      context: '',
      task: '',
    };
    expect(generateXml(data)).toBe('<agent>use architect</agent>');
  });
});
