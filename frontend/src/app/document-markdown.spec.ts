import { markdownDestination, renderDocumentMarkdown, renderMarkdown } from './document-markdown';
import { analyzeDocument } from './document-template';
import { Marked, Parser } from 'marked';
import { vi } from 'vitest';

function render(source: string): HTMLDivElement {
  const element = document.createElement('div');
  element.innerHTML = renderMarkdown(source);
  return element;
}

describe('shared Markdown presentation', () => {
  it('renders semantic headings, paragraphs, lists, tables, links and code', () => {
    const element = render(
      '# Heading\n\nParagraph with **strong** and *emphasis*.\n\n' +
        '- First\n- Second\n\n1. Ordered\n\n' +
        '| Name | Value |\n| --- | --- |\n| One | Two |\n\n' +
        '[Guide](guide.md) and `inline()`\n\n```sh\necho "hello"\n```\n',
    );
    expect(element.querySelector('h1')?.textContent).toBe('Heading');
    expect(element.querySelector('p strong')?.textContent).toBe('strong');
    expect(element.querySelector('p em')?.textContent).toBe('emphasis');
    expect(element.querySelectorAll('ul li')).toHaveLength(2);
    expect(element.querySelector('ol li')?.textContent).toBe('Ordered');
    expect(element.querySelector('table th')?.textContent).toBe('Name');
    expect(element.querySelector('table td')?.textContent).toBe('One');
    expect(element.querySelector('a')?.textContent).toBe('Guide');
    expect(element.querySelector('p code')?.textContent).toBe('inline()');
    expect(element.querySelector('pre code')?.textContent).toBe('echo "hello"\n');
  });

  for (const source of [
    '<script>globalThis.documentExecuted = true</script>',
    '<img src="https://example.invalid/pixel" onerror="alert(1)">',
    '<iframe src="https://example.invalid"></iframe>',
    '<object data="file:///tmp/program"></object><embed src="file:///tmp/script">',
    '<svg onload="alert(1)"><a href="javascript:alert(1)">Go</a></svg>',
    '<style>body { display: none; }</style>',
    'Inline <b onclick="alert(1)">HTML</b> remains inert.',
    '<a href="javascript:alert(1)">raw link</a>',
    '&lt;img src=x onerror=alert(1)&gt;',
  ]) {
    it(`keeps raw or entity-encoded HTML inert: ${source}`, () => {
      const element = render(source);
      expect(element.querySelector('script,img,iframe,object,embed,svg,style,b,a')).toBeNull();
      expect(element.querySelector('[onclick],[onerror],[onload],[src],[href]')).toBeNull();
      expect(element.textContent).toContain(source.startsWith('&lt;') ? '<img' : source);
    });
  }

  for (const destination of [
    'javascript:alert%281%29',
    'JaVaScRiPt:alert%281%29',
    'java&#x73;cript:alert%281%29',
    'java&#10;script:alert%281%29',
    'javascript%3Aalert%281%29',
    'data:text/html,script',
    'file:///tmp/script.sh',
    'custom:program',
    '//example.invalid',
  ]) {
    it(`does not activate a generated destination: ${destination}`, () => {
      const element = render(`[**Read**](<${destination}>)`);
      const link = element.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.textContent).toBe('Read');
      expect(link?.getAttribute('role')).toBe('link');
      expect(link?.hasAttribute('href')).toBe(false);
      expect(markdownDestination(destination, 'notes/source.md').kind).toBe('blocked');
      expect(element.querySelector('[href],[src],[action],[formaction],[onclick]')).toBeNull();
    });
  }

  it('presents external autolinks and internal references without loading images', () => {
    const element = render(
      '<https://example.invalid> and https://example.invalid\n\n' +
        '[Reference][ref]\n\n[ref]: guide.md\n\n' +
        '![Image description](https://example.invalid/pixel.svg)\n',
    );
    expect(element.querySelectorAll('a')).toHaveLength(3);
    expect(element.querySelectorAll('a[target="_blank"][rel="noopener noreferrer"]')).toHaveLength(
      2,
    );
    expect(element.querySelectorAll('a:not([href])')).toHaveLength(1);
    expect(element.querySelector('[src],img')).toBeNull();
    expect(element.textContent).toContain('Image description');
  });

  it('keeps executable-looking code display-only', () => {
    const source = '```html\n<script>alert(1)</script>\n```\n\n    rm -rf /tmp/example\n';
    const element = render(source);
    expect(element.querySelectorAll('pre code')).toHaveLength(2);
    expect(element.querySelector('pre code')?.textContent).toBe('<script>alert(1)</script>\n');
    expect(element.querySelector('script,button,iframe')).toBeNull();
    expect(element.textContent).toContain('rm -rf /tmp/example');
  });

  it('preserves original source with CRLF, comments, entities and valid UTF-8 NUL', () => {
    const source = '# Café\r\n\r\n<!-- original -->\r\nText\x00 &amp; <tag>\r\n';
    const original = source;
    const first = renderMarkdown(source);
    expect(source).toBe(original);
    expect(renderMarkdown(source)).toBe(first);
    expect(first).toContain('Café');
    expect(first).toContain('\x00');
    expect(first).toContain('&lt;!-- original --&gt;');
  });

  for (const [raw, path, fragment] of [
    ['guide.md', 'notes/guide.md', null],
    ['../guide.md', 'guide.md', null],
    ['../notes/../guide.md?version=2#installation', 'guide.md', 'installation'],
    ['Topic.MD?version=2', 'notes/Topic.MD', null],
    ['folder', 'notes/folder', null],
    ['guide%20one.md', 'notes/guide one.md', null],
    ['guide%2520one.md', 'notes/guide%20one.md', null],
    ['a%23b%3Fc.md?ignored=1#caf%C3%A9', 'notes/a#b?c.md', 'café'],
    ['a&amp;b.md', 'notes/a&b.md', null],
  ] as const) {
    it(`resolves once from the source directory: ${raw}`, () => {
      expect(markdownDestination(raw, 'notes/source.md')).toEqual({
        kind: 'internal',
        path,
        fragment,
      });
    });
  }

  for (const raw of [
    '../../escape.md',
    '%2e%2e/%2e%2e/escape.md',
    '/root.md',
    '%2froot.md',
    'file%3A/program.md',
    'guide%ZZ.md',
    'notes%5cescape.md',
    'guide%00.md',
  ]) {
    it(`rejects an escaped or invalid destination: ${raw}`, () => {
      expect(markdownDestination(raw, 'notes/source.md').kind).toBe('blocked');
    });
  }

  it('keeps fragment lookup separate from reads and ignores retrieval queries', () => {
    expect(markdownDestination('#caf%C3%A9', 'notes/source.md')).toEqual({
      kind: 'fragment',
      fragment: 'café',
    });
    expect(markdownDestination('guide.md?version=2#installation', 'notes/source.md')).toEqual({
      kind: 'internal',
      path: 'notes/guide.md',
      fragment: 'installation',
    });
  });

  it('renders native external/mail/phone destinations with the required attributes', () => {
    const element = render(
      '[Web](HTTPS://example.invalid) [Mail](mailto:a@example.invalid) [Call](tel:+1234)',
    );
    const [web, mail, phone] = element.querySelectorAll('a');
    expect(web.getAttribute('href')).toBe('https://example.invalid/');
    expect(web.getAttribute('target')).toBe('_blank');
    expect(web.getAttribute('rel')).toBe('noopener noreferrer');
    expect(mail.getAttribute('href')).toBe('mailto:a@example.invalid');
    expect(phone.getAttribute('href')).toBe('tel:+1234');
    expect(mail.hasAttribute('target')).toBe(false);
  });

  it('preserves literal character references in autolink destinations', () => {
    const element = render('<https://example.invalid/?a=1&amp;b=2>');
    expect(element.querySelector('a')?.getAttribute('href')).toBe(
      'https://example.invalid/?a=1&amp;b=2',
    );
  });

  it('generates deterministic unique heading IDs, including slug collisions', () => {
    const source =
      '# **Installation**\n\n## [Installation](guide.md)\n\n## Installation-1\n\n## Café\n';
    expect(renderDocumentMarkdown(source).headings).toEqual([
      'installation',
      'installation-1',
      'installation-1-1',
      'café',
    ]);
    expect(renderDocumentMarkdown(source).headings).toEqual(
      renderDocumentMarkdown(source).headings,
    );
  });
});

describe('analyzed Markdown projection', () => {
  function taskSource() {
    return (
      '# TASK-005 — Reading\n\n' +
      'Requirement: [REQ-002](../../req.md) — authored relationship note.\n\n' +
      'Review state: Reviewed, not a generated status.\n\n' +
      '## Purpose\n\n### Shared\n\n[First][guide]\n\n' +
      '## Scope\n\n### Shared\n\n- [x] Done\n- [ ] Pending\n\n' +
      '| Key | Value |\n| --- | --- |\n| One | Two |\n\n' +
      '```html\n<script>display only</script>\n```\n\n' +
      '## Expected outcome\n\nReadable.\n\n' +
      '## Implementation brief\n\n[Plan](implementation.md) — pending explanation.\n\n' +
      '## Open questions\n\n#### Acceptance history\n\nPreserved history.\n\n' +
      '[guide]: guide.md#shared\n'
    );
  }

  const task = {
    kind: 'task' as const,
    path: '.worktree/requirements/REQ-002/tasks/TASK-005/task.md',
  };

  it('projects source-ordered regions with one global heading and link context without re-lexing', () => {
    const analysis = analyzeDocument(taskSource(), task);
    const original = JSON.stringify(analysis);
    const lexer = vi.spyOn(Marked.prototype, 'lexer');
    try {
      const result = renderDocumentMarkdown(analysis);
      expect(lexer).not.toHaveBeenCalled();
      expect(result.presentation).toBe('task');
      expect(result.regions.map((region) => region.kind)).toEqual([
        'header',
        'metadata',
        'metadata',
        'section',
        'section',
        'section',
        'section',
        'section',
      ]);
      expect(result.regions.map((region) => region.html).join('')).toBe(result.html);
      expect(result.headings).toEqual([
        'task-005-reading',
        'purpose',
        'shared',
        'scope',
        'shared-1',
        'expected-outcome',
        'implementation-brief',
        'open-questions',
        'acceptance-history',
      ]);
      expect(result.links).toEqual(['../../req.md', 'guide.md#shared', 'implementation.md']);
      expect(result.html).toContain('worktree-link-0');
      expect(result.html).toContain('worktree-link-1');
      expect(result.html).toContain('worktree-link-2');
      expect(JSON.stringify(analysis)).toBe(original);
    } finally {
      lexer.mockRestore();
    }
  });

  it('preserves metadata prose, nested history, tables, code and inert checklist states', () => {
    const result = renderDocumentMarkdown(analyzeDocument(taskSource(), task));
    const element = document.createElement('div');
    element.innerHTML = result.html;
    expect(element.textContent).toContain('authored relationship note.');
    expect(element.textContent).toContain('pending explanation.');
    expect(element.querySelector('h4')?.textContent).toBe('Acceptance history');
    expect(element.textContent).toContain('Preserved history.');
    expect(element.querySelector('td')?.textContent).toBe('One');
    expect(element.querySelector('code')?.textContent).toBe('<script>display only</script>\n');
    expect(element.querySelectorAll('input,button,script')).toHaveLength(0);
    expect(element.querySelectorAll('.worktree-checklist')).toHaveLength(2);
    expect(element.textContent).toContain('☑');
    expect(element.textContent).toContain('☐');
  });

  it('matches whole-document fallback heading/link associations and source-order output', () => {
    const source = taskSource();
    const structured = renderDocumentMarkdown(analyzeDocument(source, task));
    const general = renderDocumentMarkdown(
      analyzeDocument(source, { kind: 'standalone', path: 'notes.md' }),
    );
    expect(structured.html).toBe(general.html);
    expect(structured.headings).toEqual(general.headings);
    expect(structured.links).toEqual(general.links);
    const analysis = analyzeDocument(source, task);
    expect(
      structured.regions
        .filter((region) => region.kind === 'metadata')
        .map((region) => source.slice(region.range.start, region.range.end).trim()),
    ).toEqual(
      analysis.metadata.map((field) => source.slice(field.range.start, field.range.end).trim()),
    );
    expect(
      structured.regions
        .filter((region) => region.kind === 'section')
        .map((region) => region.range),
    ).toEqual(analysis.sections.map((section) => section.range));
  });

  it('retains security enforcement inside structured regions', () => {
    const source = taskSource().replace(
      'Readable.',
      '<iframe src="file:///tmp/program"></iframe>\n\n' +
        '[Bad](java&#x73;cript:alert%281%29) ![Alt](https://example.invalid/pixel)',
    );
    const result = renderDocumentMarkdown(analyzeDocument(source, task));
    expect(result.presentation).toBe('task');
    const element = document.createElement('div');
    element.innerHTML = result.html;
    expect(element.querySelector('iframe,img,[src],[onclick]')).toBeNull();
    expect(
      [...element.querySelectorAll('a')]
        .find((link) => link.textContent === 'Bad')
        ?.hasAttribute('href'),
    ).toBe(false);
    expect(element.textContent).toContain('<iframe src="file:///tmp/program"></iframe>');
    expect(element.textContent).toContain('Alt');
  });

  for (const source of ['', ' \n\t', '<!-- only a comment -->', '---\r\nkey: value\r\n...\r\n']) {
    it(`projects empty classified content without inventing regions: ${JSON.stringify(source)}`, () => {
      const result = renderDocumentMarkdown(
        analyzeDocument(source, { kind: 'standalone', path: 'notes.md' }),
      );
      expect(result.presentation).toBe('general');
      expect(result.html.trim()).toBe('');
      expect(result.headings).toEqual([]);
      expect(result.links).toEqual([]);
      expect(result.formattingError).toBeNull();
    });
  }

  it('does not discard malformed frontmatter or unclosed comments', () => {
    const source = '---\nkey: original\n\n<!-- unclosed';
    const result = renderDocumentMarkdown(
      analyzeDocument(source, { kind: 'standalone', path: 'notes.md' }),
    );
    expect(result.presentation).toBe('general');
    expect(result.html).toContain('key: original');
    expect(result.html).toContain('&lt;!-- unclosed');
  });

  for (const kind of ['requirement', 'implementation'] as const) {
    it(`projects the canonical ${kind} regions`, () => {
      const headings =
        kind === 'requirement'
          ? ['Intent', 'Desired outcome', 'Scope', 'Tasks']
          : [
              'Objective',
              'Context and sources',
              'Required work',
              'Constraints and exclusions',
              'Acceptance criteria',
              'Verification and handoff',
            ];
      const source =
        (kind === 'requirement'
          ? '# REQ-002 — Reading\n\n'
          : '# TASK-005 — Implementation brief: Reading\n\nRequirement: [REQ-002](../../req.md)\n\nTask: [TASK-005](task.md)\n\n') +
        headings.map((heading) => `## ${heading}\n\nAuthored ${heading}.\n\n`).join('');
      const result = renderDocumentMarkdown(
        analyzeDocument(source, {
          kind,
          path:
            kind === 'requirement'
              ? '.worktree/requirements/REQ-002/req.md'
              : task.path.replace('task.md', 'implementation.md'),
        }),
      );
      expect(result.presentation).toBe(kind);
      expect(
        result.regions.filter((region) => region.kind === 'section').map((region) => region.label),
      ).toEqual(headings);
      expect(result.regions.map((region) => region.html).join('')).toBe(result.html);
    });
  }

  it('uses complete general fallback for duplicate sections and for standalone content', () => {
    const source = taskSource() + '\n## Purpose\n\nDuplicate content must survive.\n';
    for (const identity of [task, { kind: 'standalone' as const, path: 'notes.md' }]) {
      const result = renderDocumentMarkdown(analyzeDocument(source, identity));
      expect(result.presentation).toBe('general');
      expect(result.regions).toHaveLength(1);
      expect(result.regions[0].kind).toBe('general');
      expect(result.html).toContain('Duplicate content must survive.');
      expect(result.html).toContain('authored relationship note.');
    }
  });

  it('suppresses actual comments/frontmatter without hiding code or mutating CRLF/NUL source', () => {
    const source =
      '---\r\nprivate: context\r\n...\r\n<!-- hidden -->\r\n\r\n' +
      '`<!-- inline -->`\r\n\r\n    <!-- indented -->\r\n\r\n```html\r\n<!-- fenced -->\r\n```\r\n\r\nCafé\x00\r\n';
    const analysis = analyzeDocument(source, { kind: 'standalone', path: 'notes.md' });
    const before = JSON.stringify(analysis);
    const result = renderDocumentMarkdown(analysis);
    expect(result.html).not.toContain('private: context');
    expect(result.html).not.toContain('hidden');
    expect(result.html).toContain('&lt;!-- inline --&gt;');
    expect(result.html).toContain('&lt;!-- indented --&gt;');
    expect(result.html).toContain('&lt;!-- fenced --&gt;');
    expect(result.html).toContain('Café\x00');
    expect(analysis.source).toBe(source);
    expect(JSON.stringify(analysis)).toBe(before);
  });

  it('retains security policy in analyzed general presentation', () => {
    const source =
      '<script>alert(1)</script>\n\n[Bad](JaVaScRiPt:alert%281%29) ' +
      '[Web](https://example.invalid) ![Description](https://example.invalid/pixel)';
    const result = renderDocumentMarkdown(
      analyzeDocument(source, { kind: 'standalone', path: 'notes.md' }),
    );
    const element = document.createElement('div');
    element.innerHTML = result.html;
    expect(element.querySelector('script,img,[src]')).toBeNull();
    expect(element.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(element.querySelector('a[target="_blank"]')?.getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
    expect(element.textContent).toContain('Description');
  });

  it('retries original source if analysis tokenization failed', () => {
    const source = '# Original\n\nText.';
    const lexer = vi.spyOn(Marked.prototype, 'lexer').mockImplementationOnce(() => {
      throw new Error('analysis failed');
    });
    const analysis = analyzeDocument(source, { kind: 'standalone', path: 'notes.md' });
    lexer.mockRestore();
    const result = renderDocumentMarkdown(analysis);
    expect(result.presentation).toBe('general');
    expect(result.html).toContain('<h1>Original</h1>');
    expect(result.formattingError).toBeNull();
  });

  it('renders complete source when analysis cannot account for every source block', () => {
    const source = '# Original\n\nKeep this final paragraph.\n';
    const original = Marked.prototype.lexer;
    const lexer = vi.spyOn(Marked.prototype, 'lexer').mockImplementationOnce(function (
      this: Marked,
      text,
    ) {
      const tokens = original.call(this, text);
      tokens.pop();
      return tokens;
    });
    const analysis = analyzeDocument(source, { kind: 'standalone', path: 'notes.md' });
    lexer.mockRestore();
    expect(analysis.blocks).toEqual([]);
    const result = renderDocumentMarkdown(analysis);
    expect(result.presentation).toBe('general');
    expect(result.html).toContain('Keep this final paragraph.');
    expect(result.headings).toEqual(['original']);
  });

  it('discards partial indexes before retrying a failed structured projection', () => {
    const source = taskSource();
    const analysis = analyzeDocument(source, task);
    const expected = renderDocumentMarkdown(
      analyzeDocument(source, { kind: 'standalone', path: 'notes.md' }),
    );
    const original = Parser.prototype.parse;
    let failed = false;
    const parser = vi.spyOn(Parser.prototype, 'parse').mockImplementation(function (
      this: Parser,
      tokens,
    ) {
      if (!failed && tokens[0]?.type === 'heading' && tokens[0].text === 'Scope') {
        failed = true;
        throw new Error('projection failed after title and links');
      }
      return original.call(this, tokens);
    });
    try {
      const result = renderDocumentMarkdown(analysis);
      expect(failed).toBe(true);
      expect(result.presentation).toBe('general');
      expect(result.html).toBe(expected.html);
      expect(result.headings).toEqual(expected.headings);
      expect(result.links).toEqual(expected.links);
      expect(result.formattingError).toBeNull();
    } finally {
      parser.mockRestore();
    }
  });

  it('returns escaped exact source and a formatting error if shared rendering also fails', () => {
    const source = '<script>original</script>\r\nCafé\x00\r\n';
    const lexer = vi.spyOn(Marked.prototype, 'lexer').mockImplementation(() => {
      throw new Error('tokenization failed');
    });
    try {
      const analysis = analyzeDocument(source, { kind: 'standalone', path: 'notes.md' });
      const result = renderDocumentMarkdown(analysis);
      expect(result.formattingError).toBe(
        'Unable to format document. Showing original source as plain text.',
      );
      expect(result.html).toContain('&lt;script&gt;original&lt;/script&gt;\r\nCafé\x00\r\n');
      expect(result.links).toEqual([]);
      expect(result.headings).toEqual([]);
      expect(result.presentation).toBe('general');
      expect(analysis.source).toBe(source);
    } finally {
      lexer.mockRestore();
    }
  });
});
