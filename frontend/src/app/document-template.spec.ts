import { analyzeDocument } from './document-template';
import { Marked } from 'marked';
import { vi } from 'vitest';
import type { WorkspaceDocument } from './workspace';

const required = {
  requirement: ['Intent', 'Desired outcome', 'Scope', 'Tasks'],
  task: ['Purpose', 'Scope', 'Expected outcome', 'Implementation brief'],
  implementation: [
    'Objective',
    'Context and sources',
    'Required work',
    'Constraints and exclusions',
    'Acceptance criteria',
    'Verification and handoff',
  ],
};

function identity(kind: WorkspaceDocument['kind'] | 'standalone') {
  return {
    kind,
    path:
      kind === 'requirement'
        ? '.worktree/requirements/REQ-002/req.md'
        : kind === 'task' || kind === 'implementation'
          ? '.worktree/requirements/REQ-002/tasks/TASK-005/' +
            (kind === 'task' ? 'task.md' : 'implementation.md')
          : kind === 'project'
            ? '.worktree/project.md'
            : 'notes/topic.md',
  };
}

function canonical(kind: keyof typeof required, optional = false) {
  const title =
    kind === 'requirement'
      ? '# REQ-002 — Read documents'
      : '# TASK-005 — ' +
        (kind === 'implementation' ? 'Implementation brief: ' : '') +
        'Read documents';
  const metadata = [
    ...(kind === 'requirement' ? [] : ['Requirement: [REQ-002 — Reading](../../req.md)']),
    ...(kind === 'implementation' ? ['Task: [TASK-005 — Reading](task.md)'] : []),
    ...(optional ? ['Review state: Reviewed by a human.'] : []),
  ];
  return (
    [
      title,
      ...metadata,
      ...required[kind].map((heading) => {
        const content =
          heading === 'Tasks'
            ? '- [TASK-005 — Reading](tasks/TASK-005/task.md)'
            : heading === 'Implementation brief'
              ? '[Implementation brief](implementation.md) — pending review.'
              : 'Authored content for ' + heading + '.';
        return '## ' + heading + '\n\n' + content;
      }),
      ...(optional
        ? [
            ...(kind === 'requirement'
              ? []
              : ['## Supporting material\n\n[Notes](supporting-material/notes.md)']),
            '## Open questions\n\nNo unresolved questions.',
          ]
        : []),
    ].join('\n\n') + '\n'
  );
}

for (const kind of ['requirement', 'task', 'implementation'] as const) {
  describe(kind + ' source recognition', () => {
    for (const optional of [false, true]) {
      for (const ending of ['\n', '\r\n']) {
        it(`recognizes canonical structure with optional=${optional} and ${JSON.stringify(ending)}`, () => {
          const source = canonical(kind, optional).replaceAll('\n', ending);
          const result = analyzeDocument(source, identity(kind));
          expect(result.presentation).toBe(kind);
          expect(result.meaningful).toBe(true);
          expect(result.fallbackReasons).toEqual([]);
          expect(result.sections.map((section) => section.heading)).toEqual([
            ...required[kind],
            ...(optional && kind !== 'requirement' ? ['Supporting material'] : []),
            ...(optional ? ['Open questions'] : []),
          ]);
          expect(result.source).toBe(source);
          expect(
            result.blocks.map((block) => source.slice(block.range.start, block.range.end)).join(''),
          ).toBe(source);
          for (const section of result.sections) {
            expect(source.slice(section.headingRange.start, section.headingRange.end)).toContain(
              '## ' + section.heading,
            );
            expect(source.slice(section.bodyRange.start, section.bodyRange.end)).not.toContain(
              '## ',
            );
            expect(source.slice(section.range.start, section.range.end)).toBe(
              source.slice(section.headingRange.start, section.headingRange.end) +
                source.slice(section.bodyRange.start, section.bodyRange.end),
            );
          }
          for (const field of result.metadata) {
            expect(source.slice(field.range.start, field.valueRange.start)).toBe(field.label + ':');
            expect(source.slice(field.valueRange.start, field.valueRange.end).trim()).not.toBe('');
          }
        });
      }
    }

    const first = required[kind][0];
    const second = required[kind][1];
    for (const [name, change] of [
      ['missing section', (s: string) => s.replace('## ' + first, '### ' + first)],
      ['duplicate section', (s: string) => s + '\n## ' + first + '\nDuplicate content.\n'],
      ['unexpected section', (s: string) => s + '\n## Surprise\nDo not lose me.\n'],
      [
        'out-of-order sections',
        (s: string) =>
          s
            .replace('## ' + first, '## TEMP')
            .replace('## ' + second, '## ' + first)
            .replace('## TEMP', '## ' + second),
      ],
      [
        'empty required section',
        (s: string) => s.replace('Authored content for ' + first + '.', '<!-- hidden -->'),
      ],
      ['duplicate title', (s: string) => s + '\n# Another title\n'],
      [
        'wrong identity',
        (s: string) =>
          s.replace(
            kind === 'requirement' ? 'REQ-002 —' : 'TASK-005 —',
            kind === 'requirement' ? 'REQ-999 —' : 'TASK-999 —',
          ),
      ],
      ['unassigned preamble', (s: string) => 'Unexpected preamble.\n\n' + s],
      [
        'unexpected metadata',
        (s: string) => s.replace('\n\n', '\n\nInvented field: Keep this text.\n\n'),
      ],
      [
        'duplicate optional section',
        (s: string) => s + '\n## Open questions\nOne.\n\n## Open questions\nTwo.\n',
      ],
      [
        'duplicate review metadata',
        (s: string) => s.replace('\n\n', '\n\nReview state: One.\n\nReview state: Two.\n\n'),
      ],
    ] as const) {
      it('falls back without losing source for ' + name, () => {
        const source = change(canonical(kind));
        const result = analyzeDocument(source, identity(kind));
        expect(result.presentation).toBe('general');
        expect(result.meaningful).toBe(true);
        expect(result.fallbackReasons.length).toBeGreaterThan(0);
        expect(result.source).toBe(source);
        expect(
          result.blocks.map((block) => source.slice(block.range.start, block.range.end)).join(''),
        ).toBe(source);
      });
    }

    it('preserves nested subsections, explicit inapplicability and history in its owning section', () => {
      const source = canonical(kind).replace(
        'Authored content for ' + first + '.',
        'Not applicable for this task.\n\n### Review history\n\nAccepted on the recorded date.\n\n#### Detail\n\nOriginal detail.',
      );
      const result = analyzeDocument(source, identity(kind));
      expect(result.presentation).toBe(kind);
      const section = result.sections[0];
      expect(source.slice(section.bodyRange.start, section.bodyRange.end)).toContain(
        '### Review history',
      );
      expect(source.slice(section.bodyRange.start, section.bodyRange.end)).toContain(
        'Original detail.',
      );
    });

    it('uses retrieved source independently of a stale discovery validity flag', () => {
      const context = { ...identity(kind), templateValid: false };
      expect(analyzeDocument(canonical(kind), context).presentation).toBe(kind);
      context.templateValid = true;
      expect(
        analyzeDocument(canonical(kind) + '\n## Surprise\nExtra content.', context).presentation,
      ).toBe('general');
    });
  });
}

describe('metadata and general documents', () => {
  it('preserves uncertain original content for general fallback if tokenization fails', () => {
    const source = canonical('task');
    const lexer = vi.spyOn(Marked.prototype, 'lexer').mockImplementationOnce(() => {
      throw new Error('Parser failure');
    });
    try {
      const result = analyzeDocument(source, identity('task'));
      expect(result.source).toBe(source);
      expect(result.presentation).toBe('general');
      expect(result.meaningful).toBe(true);
      expect(result.fallbackReasons).toContain('Markdown tokenization failed');
    } finally {
      lexer.mockRestore();
    }
  });
  for (const kind of ['task', 'implementation'] as const) {
    for (const replacement of [
      'Parent requirement: [REQ-002](../../req.md)',
      'Requirement: REQ-002',
      'Requirement: [REQ-999](../../other.md)',
      'Requirement: [REQ-999](../../req.md)',
      'Requirement: [REQ-002](https://example.invalid/req.md)',
      'Requirement: [REQ-002](../../REQ.md)',
      'Requirement: [REQ-002](../../req.md)\n\nRequirement: [REQ-002](../../req.md)',
      'Requirement: [REQ-002](../../req.md)\nRequirement: [REQ-002](../../req.md)',
    ]) {
      it(`rejects ambiguous/invalid ${kind} metadata: ${replacement}`, () => {
        const source = canonical(kind).replace(
          'Requirement: [REQ-002 — Reading](../../req.md)',
          replacement,
        );
        const result = analyzeDocument(source, identity(kind));
        expect(result.presentation).toBe('general');
        expect(result.source).toBe(source);
      });
    }
  }

  it('rejects missing and conflicting Task relationships in implementation documents', () => {
    for (const value of [
      '',
      'Task: [Other](other.md)',
      'Task: [Task](task.md)\n\nTask: [Task](task.md)',
    ]) {
      const source = canonical('implementation').replace(
        'Task: [TASK-005 — Reading](task.md)',
        value,
      );
      expect(analyzeDocument(source, identity('implementation')).presentation).toBe('general');
    }
  });

  for (const kind of ['project', 'standalone'] as const) {
    it('keeps template-looking ' + kind + ' content on the general path', () => {
      expect(analyzeDocument(canonical('requirement'), identity(kind)).presentation).toBe(
        'general',
      );
    });
  }

  it('does not treat an ordinary broken content link as template unavailability', () => {
    const source = canonical('task').replace(
      'Authored content for Scope.',
      '[Missing note](missing.md)',
    );
    const result = analyzeDocument(source, identity('task'));
    expect(result.presentation).toBe('task');
    expect(result.meaningful).toBe(true);
  });

  it('retains both duplicate fields and sections rather than choosing one', () => {
    const source =
      canonical('task').replace('\n\n', '\n\nReview state: One\n\nReview state: Two\n\n') +
      '\n## Scope\nSecond scope\n';
    const result = analyzeDocument(source, identity('task'));
    expect(result.presentation).toBe('general');
    expect(result.metadata.filter((field) => field.label === 'Review state')).toHaveLength(2);
    expect(result.sections.filter((section) => section.heading === 'Scope')).toHaveLength(2);
  });

  it('falls back for an empty optional metadata value or a comment-only optional section', () => {
    for (const value of ['', '<!-- hidden -->', '` `']) {
      const source = canonical('task').replace('\n\n', '\n\nReview state: ' + value + '\n\n');
      expect(analyzeDocument(source, identity('task')).presentation).toBe('general');
    }
    expect(
      analyzeDocument(canonical('task') + '\n## Open questions\n<!-- hidden -->', identity('task'))
        .presentation,
    ).toBe('general');
  });

  it('does not infer a canonical template from a noncanonical path or a mismatched primary filename', () => {
    const source = canonical('task');
    expect(
      analyzeDocument(source, { kind: 'task', path: 'notes/TASK-005/task.md' }).presentation,
    ).toBe('general');
    expect(
      analyzeDocument(source, { kind: 'task', path: identity('implementation').path }).presentation,
    ).toBe('general');
  });

  it('preserves authoring comments, tabs, lists and reference definitions in source associations', () => {
    const source =
      '<!-- authoring guidance -->\n' +
      canonical('task').replace(
        'Authored content for Scope.',
        'A list:\n\n- First\n  - Nested\n\n\t<!-- tab-indented code -->\n\n[Reference][note]\n\n[note]: missing.md\n',
      );
    const result = analyzeDocument(source, identity('task'));
    expect(result.presentation).toBe('task');
    expect(
      result.blocks.map((block) => source.slice(block.range.start, block.range.end)).join(''),
    ).toBe(source);
  });
});

describe('meaningful content and token/code boundaries', () => {
  const whitespaceReferences = [
    '&nbsp;',
    '&Tab;',
    '&NewLine;',
    '&NonBreakingSpace;',
    '&ensp;',
    '&emsp;',
    '&emsp13;',
    '&emsp14;',
    '&numsp;',
    '&puncsp;',
    '&thinsp;',
    '&ThinSpace;',
    '&hairsp;',
    '&VeryThinSpace;',
    '&MediumSpace;',
    '&ThickSpace;',
  ];

  for (const reference of whitespaceReferences) {
    it('classifies whitespace-only references as Empty: ' + reference, () => {
      const source = ' \n' + reference + reference + '\t';
      const result = analyzeDocument(source, identity('standalone'));
      expect(result.meaningful).toBe(false);
      expect(result.source).toBe(source);
    });

    it('keeps actual text mixed with whitespace references Readable: ' + reference, () => {
      const source = reference + 'Actual text' + reference;
      const result = analyzeDocument(source, identity('standalone'));
      expect(result.meaningful).toBe(true);
      expect(result.source).toBe(source);
    });
  }

  it('classifies combined named and numeric whitespace references as Empty', () => {
    const source = whitespaceReferences.join(' ') + ' &#8194; &#x2003; &#8202;';
    expect(analyzeDocument(source, identity('standalone')).meaningful).toBe(false);
  });

  it('keeps whitespace reference syntax visible inside code', () => {
    for (const source of ['`&emsp;`', '```text\n&ensp;\n```', '    &thinsp;']) {
      expect(analyzeDocument(source, identity('standalone')).meaningful).toBe(true);
    }
  });

  it('does not erase visible or unrecognized entities or decode references repeatedly', () => {
    for (const source of [
      '&copy;',
      '&blank;',
      '&notspace;',
      '&EmSp;',
      '&amp;ensp;',
      '&#38;emsp;',
    ]) {
      expect(analyzeDocument(source, identity('standalone')).meaningful).toBe(true);
    }
  });

  for (const source of [
    '',
    ' \t\r\n',
    '<!-- hidden -->',
    '<!-- one -->\n<!-- two -->\n',
    '> <!-- hidden -->\n',
    '- <!-- hidden -->\n',
    '[unused]: note.md\n',
    '&nbsp; &#32;\n',
    '![ ](https://example.invalid/pixel.svg)',
  ]) {
    it('classifies non-presented content as Empty: ' + JSON.stringify(source), () => {
      expect(analyzeDocument(source, identity('standalone')).meaningful).toBe(false);
    });
  }

  for (const source of [
    'Actual Markdown',
    '# Heading',
    '---\n---\nBody',
    '<!-- hidden -->visible',
    'Text <!-- hidden --> end',
    '`<!-- inline code -->`',
    '```html\n<!-- fenced code -->\n```',
    '~~~\n<!-- fenced code -->\n~~~',
    '    <!-- indented code -->\n',
    '> `<!-- code -->`',
    '<script>alert(1)</script>',
    '<div title="<!-- attribute -->">Text</div>',
    '<!-- unclosed',
    '![Image description](https://example.invalid/pixel.svg)',
    '| A |\n| --- |\n| Cell |',
  ]) {
    it('retains visible or uncertain material as Readable: ' + JSON.stringify(source), () => {
      const result = analyzeDocument(source, identity('standalone'));
      expect(result.meaningful).toBe(true);
      expect(result.source).toBe(source);
    });
  }

  it('keeps malformed comments in general fallback', () => {
    const source = canonical('task') + '\n<!-- unclosed';
    expect(analyzeDocument(source, identity('task')).presentation).toBe('general');
  });

  it('preserves original CRLF, Unicode and valid UTF-8 NUL in every source association', () => {
    const source = canonical('implementation', true)
      .replace(
        'Authored content for Required work.',
        'Café 😀\x00 original\n\n```text\n<!-- code -->\n```',
      )
      .replaceAll('\n', '\r\n');
    const bytes = new TextEncoder().encode(source);
    const result = analyzeDocument(source, identity('implementation'));
    expect(result.presentation).toBe('implementation');
    expect(new TextEncoder().encode(result.source)).toEqual(bytes);
    expect(result.source).toContain('\r\n');
    expect(result.source).toContain('\x00');
    expect(
      result.blocks
        .map((block) => result.source.slice(block.range.start, block.range.end))
        .join(''),
    ).toBe(source);
    const work = result.sections.find((section) => section.heading === 'Required work')!;
    expect(source.slice(work.bodyRange.start, work.bodyRange.end)).toContain(
      'Café 😀\x00 original\r\n',
    );
    expect(analyzeDocument(source, identity('implementation'))).toEqual(result);
  });
});

describe('V1 delimiter recognition without YAML parsing', () => {
  for (const ending of ['\n', '\r\n']) {
    for (const close of ['---', '...']) {
      for (const suffix of ['', ending, ending + '<!-- hidden -->', ending + '# Body']) {
        it(`recognizes ${JSON.stringify(ending)} / ${close} / ${JSON.stringify(suffix)}`, () => {
          const source =
            '---' + ending + 'arbitrary: [not parsed as YAML' + ending + close + suffix;
          const result = analyzeDocument(source, identity('standalone'));
          expect(result.frontmatter.status).toBe('valid');
          expect(result.meaningful).toBe(suffix.includes('# Body'));
          expect(result.source).toBe(source);
          expect(
            source.slice(0, result.frontmatter.range.end) + source.slice(result.body.start),
          ).toBe(source);
        });
      }
    }
  }

  for (const source of [
    '---',
    '---\nUnclosed header',
    '---\r\nHeader\r\n ---\r\n',
    '---\nHeader\n--- trailing',
    '---\nHeader\n... trailing',
  ]) {
    it(
      'preserves an unclosed opening delimiter as malformed fallback: ' + JSON.stringify(source),
      () => {
        const result = analyzeDocument(source, identity('requirement'));
        expect(result.frontmatter.status).toBe('malformed');
        expect(result.presentation).toBe('general');
        expect(result.source).toBe(source);
        expect(result.body.start).toBe(0);
        expect(result.meaningful).toBe(true);
      },
    );
  }

  for (const source of [
    '\n---\nkey: value\n---\n',
    'Before\n---\nkey: value\n---\n',
    ' ---\nkey: value\n---\n',
    '\uFEFF---\nkey: value\n---\n',
  ]) {
    it('does not establish frontmatter from a later or non-exact opening line', () => {
      const result = analyzeDocument(source, identity('standalone'));
      expect(result.frontmatter.status).toBe('none');
      expect(result.meaningful).toBe(true);
    });
  }

  it('recognizes a canonical body after frontmatter without presenting header fields', () => {
    const source =
      '---\r\nReview state: not interpreted\r\n...\r\n' +
      canonical('task').replaceAll('\n', '\r\n');
    const result = analyzeDocument(source, identity('task'));
    expect(result.presentation).toBe('task');
    expect(result.metadata.map((field) => field.label)).toEqual(['Requirement']);
    expect(source.slice(result.titles[0].range.start, result.titles[0].range.end)).toBe(
      '# TASK-005 — Read documents',
    );
  });
});
