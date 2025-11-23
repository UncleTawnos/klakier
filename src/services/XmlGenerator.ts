import { PromptData } from '../types';
import { parseParagraphs } from '../utils/textParser';

export function generateXml(data: PromptData): string {
  const lines: string[] = [];
  const indent = '  ';

  if (data.agent) {
    lines.push(`<agent>use ${data.agent.id}</agent>`);
  }

  const requirements = parseParagraphs(data.requirements);
  if (requirements.length > 0) {
    lines.push(`<requirements>`);
    for (const req of requirements) {
      lines.push(`${indent}<requirement>${req}</requirement>`);
    }
    lines.push(`</requirements>`);
  }

  if (data.context.trim()) {
    lines.push(`<context>${data.context.trim()}</context>`);
  }

  const tasks = parseParagraphs(data.task);
  if (tasks.length > 0) {
    lines.push(`<tasks>`);
    for (const task of tasks) {
      lines.push(`${indent}<task>${task}</task>`);
    }
    lines.push(`</tasks>`);
  }

  return lines.join('\n');
}
