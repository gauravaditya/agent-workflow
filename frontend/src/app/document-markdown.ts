import { Marked } from 'marked';
import type { analyzeDocument, SourceRange } from './document-template';

type DocumentAnalysis = ReturnType<typeof analyzeDocument>;

export interface MarkdownRegion {
  kind: 'header' | 'metadata' | 'section' | 'general';
  label: string | null;
  range: SourceRange;
  html: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export type MarkdownDestination =
  | { kind: 'external'; href: string }
  | { kind: 'browser'; href: string }
  | { kind: 'fragment'; fragment: string }
  | { kind: 'internal'; path: string; fragment: string | null }
  | { kind: 'blocked'; reason: string };

function references(text: string): string {
  // Decode Markdown destination character references once. Escape literal tag
  // delimiters first: the detached textarea can contain text only, not embeds.
  const element = document.createElement('textarea');
  element.innerHTML = text.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return element.value;
}

export function markdownDestination(raw: string, source: string): MarkdownDestination {
  const value = references(raw).trim();
  const blocked = (reason = 'Unsupported document destination'): MarkdownDestination => ({
    kind: 'blocked',
    reason,
  });
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes('\\')) return blocked();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1].toLowerCase();
  if (scheme) {
    if (!['http', 'https', 'mailto', 'tel'].includes(scheme)) return blocked();
    try {
      const url = new URL(value);
      return {
        kind: scheme === 'http' || scheme === 'https' ? 'external' : 'browser',
        href: url.href,
      };
    } catch {
      return blocked();
    }
  }
  if (value.startsWith('/')) return blocked('Destination is outside the selected workspace');
  try {
    const hash = value.indexOf('#');
    const fragment = hash < 0 ? null : decodeURIComponent(value.slice(hash + 1));
    if (value.startsWith('#')) return { kind: 'fragment', fragment: fragment! };
    const withoutFragment = hash < 0 ? value : value.slice(0, hash);
    const query = withoutFragment.indexOf('?');
    const path = decodeURIComponent(query < 0 ? withoutFragment : withoutFragment.slice(0, query));
    if (!path || /[\u0000-\u001f\u007f\\]/.test(path) || /^[a-z][a-z0-9+.-]*:/i.test(path)) {
      return blocked();
    }
    if (path.startsWith('/')) return blocked('Destination is outside the selected workspace');
    const parts = source.split('/').slice(0, -1);
    for (const part of path.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!parts.length) return blocked('Destination is outside the selected workspace');
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    return { kind: 'internal', path: parts.join('/'), fragment };
  } catch {
    return blocked('Unsupported URL encoding in document destination');
  }
}

function renderingContext(analyzed = false) {
  const links: string[] = [];
  const headings: string[] = [];
  const used = new Set<string>();
  // Private per-render state keeps duplicate heading IDs deterministic.
  const markdown = new Marked({
    gfm: true,
    renderer: {
      html({ text }) {
        // Only HTML tokens can contain actual comments. Code and literal text
        // never enter this branch. Preserve uncertain/unclosed material.
        if (analyzed) {
          let remaining = text;
          while (remaining.trimStart().startsWith('<!--')) {
            const start = remaining.indexOf('<!--');
            const end = remaining.indexOf('-->', start + 4);
            if (end < 0) break;
            remaining = remaining.slice(0, start) + remaining.slice(end + 3);
          }
          return escapeHtml(remaining);
        }
        return escapeHtml(text);
      },
      checkbox({ checked }) {
        // Angular strips input elements. Preserve authored checklist meaning
        // with text rather than introducing an interactive document control.
        return analyzed ? `<span class="worktree-checklist">${checked ? '☑' : '☐'}</span> ` : false;
      },
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens, this.parser.textRenderer);
        const base =
          references(text)
            .normalize('NFKC')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}_-]+/gu, '-')
            .replace(/^-+|-+$/g, '') || 'section';
        let id = base;
        for (let suffix = 1; used.has(id); suffix++) id = `${base}-${suffix}`;
        used.add(id);
        headings.push(id);
        return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      link({ tokens, href, autolink }) {
        // Marked treats autolink character references literally. Protect that
        // spelling from the ordinary Markdown destination reference decoder.
        const raw = autolink ? escapeHtml(href) : href;
        const index = links.push(raw) - 1;
        const destination = markdownDestination(raw, '');
        const attributes =
          destination.kind === 'external'
            ? `href="${escapeHtml(destination.href)}" target="_blank" rel="noopener noreferrer"`
            : destination.kind === 'browser'
              ? `href="${escapeHtml(destination.href)}"`
              : 'role="link" tabindex="0"';
        return `<a class="worktree-link-${index}" ${attributes}>${this.parser.parseInline(tokens)}</a>`;
      },
      image({ tokens }) {
        // Never turn document content into passive resource loads.
        return this.parser.parseInline(tokens);
      },
    },
  });
  return { markdown, links, headings };
}

/** Render either original Markdown or accepted current-source analysis. */
export function renderDocumentMarkdown(input: string | DocumentAnalysis) {
  const analyzed = typeof input !== 'string';
  const source = analyzed ? input.source : input;
  let context = renderingContext(analyzed);
  const general = (html: string, formattingError: string | null = null) => ({
    html,
    links: context.links,
    headings: context.headings,
    presentation: 'general' as DocumentAnalysis['presentation'],
    regions: [
      { kind: 'general' as const, label: null, range: { start: 0, end: source.length }, html },
    ],
    formattingError,
  });
  // Marked is not a sanitizer. Angular sanitization remains enabled at binding.
  if (!analyzed) return general(context.markdown.parse(source, { async: false }));
  try {
    if (
      input.fallbackReasons.includes('Markdown tokenization failed') ||
      input.fallbackReasons.includes('Unassigned source content')
    ) {
      return general(context.markdown.parser(context.markdown.lexer(source)));
    }
    const parser = new context.markdown.Parser(context.markdown.defaults);
    if (input.presentation === 'general') return general(parser.parse(input.tokens));

    // Parse each already-lexed top-level block with the SAME parser and renderer
    // context. Nested content and resolved reference links stay in these tokens.
    const rendered = input.blocks.map((block) => ({ ...block, html: parser.parse([block.token]) }));
    const boundaries = [
      { kind: 'header' as const, label: null, start: input.body.start },
      ...input.metadata.map((field) => ({
        kind: 'metadata' as const,
        label: field.label,
        start: field.range.start,
      })),
      ...input.sections.map((section) => ({
        kind: 'section' as const,
        label: section.heading,
        start: section.range.start,
      })),
    ];
    const regions: MarkdownRegion[] = boundaries.map((boundary, index) => {
      const range = { start: boundary.start, end: boundaries[index + 1]?.start ?? source.length };
      return {
        kind: boundary.kind,
        label: boundary.label,
        range,
        html: rendered
          .filter((block) => block.range.start >= range.start && block.range.start < range.end)
          .map((block) => block.html)
          .join(''),
      };
    });
    return {
      html: regions.map((region) => region.html).join(''),
      links: context.links,
      headings: context.headings,
      presentation: input.presentation,
      regions,
      formattingError: null,
    };
  } catch {
    // A failed projection must not leak partial heading/link indexes into the
    // complete-source fallback. Retry with a fresh document-wide context.
    context = renderingContext(true);
    try {
      return general(context.markdown.parser(context.markdown.lexer(source)));
    } catch {
      context = renderingContext(true);
      return general(
        `<pre>${escapeHtml(source)}</pre>`,
        'Unable to format document. Showing original source as plain text.',
      );
    }
  }
}

export function renderMarkdown(source: string): string {
  return renderDocumentMarkdown(source).html;
}
