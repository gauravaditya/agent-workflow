import { Marked, Token, Tokens, TokensList } from 'marked';
import type { DocumentSelection } from './workspace';

export interface SourceRange {
  /** UTF-16 offsets into the original source, end exclusive. */
  start: number;
  end: number;
}

export interface SourceBlock {
  range: SourceRange;
  token: Token;
}

export interface SourceSection {
  heading: string;
  range: SourceRange;
  headingRange: SourceRange;
  bodyRange: SourceRange;
}

type TemplateKind = 'requirement' | 'task' | 'implementation';
type DocumentIdentity = Pick<DocumentSelection['document'], 'path' | 'kind'>;

const sections: Record<TemplateKind, { required: string[]; optional: string[] }> = {
  requirement: {
    required: ['Intent', 'Desired outcome', 'Scope', 'Tasks'],
    optional: ['Open questions'],
  },
  task: {
    required: ['Purpose', 'Scope', 'Expected outcome', 'Implementation brief'],
    optional: ['Supporting material', 'Open questions'],
  },
  implementation: {
    required: [
      'Objective',
      'Context and sources',
      'Required work',
      'Constraints and exclusions',
      'Acceptance criteria',
      'Verification and handoff',
    ],
    optional: ['Supporting material', 'Open questions'],
  },
};

const markdown = new Marked({ gfm: true });

function frontmatter(source: string): {
  status: 'none' | 'valid' | 'malformed';
  range: SourceRange;
} {
  const first = source.indexOf('\n');
  const line = first < 0 ? source : source.slice(0, first).replace(/\r$/, '');
  if (line !== '---') return { status: 'none', range: { start: 0, end: 0 } };
  let start = first < 0 ? source.length : first + 1;
  while (start < source.length) {
    const newline = source.indexOf('\n', start);
    const end = newline < 0 ? source.length : newline;
    const text = source.slice(start, end);
    const delimiter = newline < 0 ? text : text.replace(/\r$/, '');
    if (delimiter === '---' || delimiter === '...') {
      return { status: 'valid', range: { start: 0, end: newline < 0 ? end : end + 1 } };
    }
    start = newline < 0 ? source.length : newline + 1;
  }
  return { status: 'malformed', range: { start: 0, end: source.length } };
}

function normalizedSource(source: string, start: number) {
  const characters: string[] = [];
  const offsets = [start];
  for (let index = start; index < source.length; index++) {
    if (source[index] === '\r') {
      characters.push('\n');
      if (source[index + 1] === '\n') index++;
    } else characters.push(source[index]);
    offsets.push(index + 1);
  }
  return { text: characters.join(''), offsets };
}

function visibleText(text: string): boolean {
  const whitespace = text.replace(
    /&(?:NonBreakingSpace|ensp|emsp(?:13|14)?|numsp|puncsp|thinsp|ThinSpace|hairsp|VeryThinSpace|MediumSpace|ThickSpace);/g,
    ' ',
  );
  const decoded = whitespace.replace(
    /&(?:#x([\da-f]+)|#(\d+)|nbsp|Tab|NewLine);/gi,
    (entity, hex: string | undefined, decimal: string | undefined) => {
      if (!hex && !decimal) return ' ';
      const point = Number.parseInt(hex ?? decimal!, hex ? 16 : 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    },
  );
  return decoded.trim().length > 0;
}

function htmlContent(text: string): { meaningful: boolean; uncertain: boolean } {
  let remaining = text.trimStart();
  // Only actual HTML tokens starting with comments are considered here. Code
  // tokens never enter this function; comment-looking attributes stay visible.
  while (remaining.startsWith('<!--')) {
    const end = remaining.indexOf('-->');
    if (end < 0) return { meaningful: true, uncertain: true };
    remaining = remaining.slice(end + 3).trimStart();
  }
  return { meaningful: visibleText(remaining), uncertain: false };
}

function meaningful(tokens: readonly Token[]): boolean {
  return tokens.some((token) => {
    switch (token.type) {
      case 'space':
      case 'def':
      case 'br':
        return false;
      case 'html':
        return htmlContent(token.text).meaningful;
      case 'code':
      case 'codespan':
        return token.text.trim().length > 0;
      case 'hr':
      case 'checkbox':
        return true;
      case 'list':
        return token.items.some((item: Tokens.ListItem) => item.task || meaningful(item.tokens));
      case 'table':
        return [...token.header, ...token.rows.flat()].some((cell) => meaningful(cell.tokens));
      default:
        if ('tokens' in token && token.tokens) return meaningful(token.tokens);
        return visibleText(
          'text' in token && typeof token.text === 'string' ? token.text : token.raw,
        );
    }
  });
}

function uncertainComments(tokens: readonly Token[]): boolean {
  return tokens.some((token) => {
    if (token.type === 'html' && htmlContent(token.text).uncertain) return true;
    if ('tokens' in token && token.tokens && uncertainComments(token.tokens)) return true;
    if (
      token.type === 'list' &&
      token.items.some((item: Tokens.ListItem) => uncertainComments(item.tokens))
    )
      return true;
    return (
      token.type === 'table' &&
      [...token.header, ...token.rows.flat()].some((cell) => uncertainComments(cell.tokens))
    );
  });
}

function relationship(href: string, source: string, expected: string): boolean {
  if (href.startsWith('/') || href.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(href))
    return false;
  try {
    const target = new URL(href, 'https://worktree.invalid/' + source);
    return (
      target.origin === 'https://worktree.invalid' &&
      decodeURIComponent(target.pathname) === '/' + expected
    );
  } catch {
    return false;
  }
}

/**
 * Analyze a successful read only. No discovery validity, availability, rendering
 * or selection state is consumed or changed. Associations always slice source.
 */
export function analyzeDocument(source: string, document: DocumentIdentity) {
  const header = frontmatter(source);
  const body = { start: header.status === 'valid' ? header.range.end : 0, end: source.length };
  const normalized = normalizedSource(source, body.start);
  let tokens: TokensList;
  let tokenizationFailed = false;
  try {
    tokens = markdown.lexer(normalized.text);
  } catch {
    // An uncertain parse never licenses dropping the original document.
    tokens = Object.assign([], { links: {} });
    tokenizationFailed = true;
  }
  const blocks: SourceBlock[] = [];
  let cursor = 0;
  for (const token of tokens) {
    blocks.push({
      token,
      range: {
        start: normalized.offsets[cursor],
        end: normalized.offsets[cursor + token.raw.length],
      },
    });
    cursor += token.raw.length;
  }
  const fallbackReasons: string[] = [];
  if (tokenizationFailed) fallbackReasons.push('Markdown tokenization failed');
  const titles: { text: string; range: SourceRange }[] = [];
  const metadata: {
    label: string;
    range: SourceRange;
    valueRange: SourceRange;
    href: string | null;
  }[] = [];
  const associations: SourceSection[] = [];
  const kind = document.kind === 'project' || document.kind === 'standalone' ? null : document.kind;
  if (header.status === 'malformed') fallbackReasons.push('Unclosed frontmatter');
  if (uncertainComments(tokens)) fallbackReasons.push('Uncertain comment content');
  const covered = tokens.map((token) => token.raw).join('') === normalized.text;
  if (!covered) fallbackReasons.push('Unassigned source content');

  // Never manufacture offsets if a future tokenizer changes raw coverage.
  if (covered)
    for (const block of blocks) {
      const token = block.token;
      if (token.type === 'heading' && token.depth === 1) {
        titles.push({ text: token.text, range: block.range });
        if (titles.length > 1 || associations.length) fallbackReasons.push('Unexpected title');
      } else if (token.type === 'heading' && token.depth === 2) {
        const previous = associations.at(-1);
        if (previous) {
          previous.range.end = block.range.start;
          previous.bodyRange.end = block.range.start;
        }
        associations.push({
          heading: token.text,
          range: { start: block.range.start, end: source.length },
          headingRange: block.range,
          bodyRange: { start: block.range.end, end: source.length },
        });
      } else if (!associations.length && meaningful([token])) {
        const field =
          token.type === 'paragraph' ? /^(Requirement|Task|Review state):/.exec(token.raw) : null;
        if (!field || !titles.length) {
          fallbackReasons.push('Unassigned preamble content');
          continue;
        }
        const start = block.range.start + field[0].length;
        const children: Token[] = token.type === 'paragraph' ? (token.tokens ?? []) : [];
        const links = children.filter((child): child is Tokens.Link => child.type === 'link');
        metadata.push({
          label: field[1],
          range: block.range,
          valueRange: { start, end: block.range.end },
          href: links.length === 1 ? links[0].href : null,
        });
        const referencedId =
          links.length === 1 ? /^(?:REQ|TASK)-[0-9]+\b/.exec(links[0].text)?.[0] : undefined;
        const expectedId =
          field[1] === 'Requirement'
            ? document.path.split('/').at(-4)
            : field[1] === 'Task'
              ? document.path.split('/').at(-2)
              : undefined;
        if (expectedId && referencedId && referencedId !== expectedId)
          fallbackReasons.push('Conflicting relationship label');
        if (/\n(?:Requirement|Task|Review state):/.test(token.raw))
          fallbackReasons.push('Multiple metadata fields in one paragraph');
        const values = children.map((child, index) =>
          index === 0 && child.type === 'text'
            ? {
                ...child,
                raw: child.raw.slice(field[0].length),
                text: child.text.slice(field[0].length),
              }
            : child,
        );
        if (!meaningful(values)) fallbackReasons.push('Empty metadata');
      }
    }

  if (kind && covered) {
    const definition = sections[kind];
    const canonical = [...definition.required, ...definition.optional];
    let previous = -1;
    for (const section of associations) {
      const order = canonical.indexOf(section.heading);
      if (order < 0) fallbackReasons.push('Unexpected section: ' + section.heading);
      if (order <= previous)
        fallbackReasons.push('Duplicate or out-of-order section: ' + section.heading);
      previous = Math.max(previous, order);
      const contents = blocks.filter(
        (block) =>
          block.range.start >= section.bodyRange.start && block.range.start < section.bodyRange.end,
      );
      if (!meaningful(contents.map((block) => block.token)))
        fallbackReasons.push('Empty section: ' + section.heading);
    }
    for (const heading of definition.required) {
      if (!associations.some((section) => section.heading === heading))
        fallbackReasons.push('Missing section: ' + heading);
    }
    const parts = document.path.split('/');
    const id = parts.at(-2)!;
    const filename =
      kind === 'requirement' ? 'req.md' : kind === 'task' ? 'task.md' : 'implementation.md';
    const prefix = id + (kind === 'implementation' ? ' — Implementation brief: ' : ' — ');
    const canonicalPath =
      kind === 'requirement'
        ? /^\.worktree\/requirements\/REQ-[0-9]+\/req\.md$/.test(document.path)
        : /^\.worktree\/requirements\/REQ-[0-9]+\/tasks\/TASK-[0-9]+\/(?:task|implementation)\.md$/.test(
            document.path,
          );
    if (
      !canonicalPath ||
      parts.at(-1) !== filename ||
      !new RegExp(kind === 'requirement' ? '^REQ-[0-9]+$' : '^TASK-[0-9]+$').test(id) ||
      titles.length !== 1 ||
      !titles[0].text.startsWith(prefix) ||
      !titles[0].text.slice(prefix.length).trim()
    ) {
      fallbackReasons.push('Missing or mismatched canonical title/identity');
    }
    const labels =
      kind === 'requirement'
        ? ['Review state']
        : kind === 'task'
          ? ['Requirement', 'Review state']
          : ['Requirement', 'Task', 'Review state'];
    const required =
      kind === 'requirement' ? [] : kind === 'task' ? ['Requirement'] : ['Requirement', 'Task'];
    for (const label of new Set(metadata.map((field) => field.label))) {
      if (!labels.includes(label) || metadata.filter((field) => field.label === label).length !== 1)
        fallbackReasons.push('Unexpected or duplicate metadata: ' + label);
    }
    for (const label of required) {
      const fields = metadata.filter((field) => field.label === label);
      const expected =
        label === 'Requirement'
          ? [...parts.slice(0, -3), 'req.md'].join('/')
          : [...parts.slice(0, -1), 'task.md'].join('/');
      if (
        fields.length !== 1 ||
        !fields[0].href ||
        !relationship(fields[0].href, document.path, expected)
      )
        fallbackReasons.push('Missing or invalid relationship: ' + label);
    }
  }

  return {
    source,
    body,
    frontmatter: header,
    tokens,
    blocks: covered ? blocks : [],
    titles,
    metadata,
    sections: associations,
    meaningful: tokenizationFailed ? visibleText(normalized.text) : meaningful(tokens),
    presentation: kind && covered && !fallbackReasons.length ? kind : ('general' as const),
    fallbackReasons,
  };
}
