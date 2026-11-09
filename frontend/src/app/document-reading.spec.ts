import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Marked } from 'marked';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { App } from './app';
import { DocumentReader } from './document-reader';
import { DocumentResponse } from './document-response';
import { Workspace, WorkspaceDocument } from './workspace';
import { WorkspaceApi } from './workspace-api';

function workspace(): Workspace {
  const document = (
    path: string,
    kind: WorkspaceDocument['kind'],
    readable = true,
  ): WorkspaceDocument => ({
    path,
    kind,
    title: '',
    readable,
    templateValid: false,
  });
  return {
    name: 'Example project',
    document: document('.worktree/project.md', 'project'),
    issues: [
      { path: '.worktree/requirements/REQ-002/req.md', message: 'Missing required section: Scope' },
    ],
    requirements: ['REQ-002', 'REQ-003'].map((id, index) => ({
      id,
      title: `${id} — Requirement`,
      document: document(`.worktree/requirements/${id}/req.md`, 'requirement', false),
      taskOrder: [`TASK-00${index + 5}`],
      tasks: [
        {
          id: `TASK-00${index + 5}`,
          title: 'Task',
          documents: [
            document(`.worktree/requirements/${id}/tasks/TASK-00${index + 5}/task.md`, 'task'),
            document(
              `.worktree/requirements/${id}/tasks/TASK-00${index + 5}/implementation.md`,
              'implementation',
              false,
            ),
          ],
        },
      ],
    })),
  };
}

describe('document request and selection integration', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function load(value = workspace()) {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    TestBed.inject(HttpTestingController).expectOne('/api/workspace').flush({ workspace: value });
    await fixture.whenStable();
    return { fixture, value, host: fixture.nativeElement as HTMLElement };
  }

  function click(host: HTMLElement, path: string) {
    const button = [...host.querySelectorAll<HTMLButtonElement>('button[data-document-path]')].find(
      (button) => button.dataset['documentPath'] === path,
    )!;
    expect(button.disabled).toBe(false);
    button.click();
    return button;
  }

  function request(path: string) {
    return TestBed.inject(HttpTestingController).expectOne(
      (request) => request.url === '/api/document' && request.params.get('path') === path,
    );
  }

  function sequentialWorkspace() {
    const value = workspace();
    const requirement = value.requirements[0];
    const prototype = requirement.tasks[0];
    requirement.tasks = ['TASK-005', 'TASK-007', 'TASK-008', 'TASK-009'].map((id) => ({
      id,
      title: id,
      documents: prototype.documents.map((document) => ({
        ...document,
        path: document.path.replace(prototype.id, id),
        readable: true,
      })),
    }));
    const [first, last, middle, unlisted] = requirement.tasks;
    requirement.taskOrder = [first.id, middle.id, last.id];
    return { value, requirement, first, middle, last, unlisted };
  }

  function sequentialButtons(host: HTMLElement) {
    return [...host.querySelectorAll<HTMLButtonElement>('.sequential-navigation button')];
  }

  for (const kind of ['task', 'implementation'] as const) {
    it(`navigates both directions in authoritative order while preserving ${kind} briefs`, async () => {
      const { value, requirement, first, middle, last } = sequentialWorkspace();
      const { fixture, host } = await load(value);
      const brief = (task: typeof first) =>
        task.documents.find((document) => document.kind === kind)!;
      fixture.componentInstance.select(brief(middle), requirement, middle);
      await fixture.whenStable();
      request(brief(middle).path).flush({
        path: brief(middle).path,
        status: 'ok',
        source: '# Middle',
      });
      await fixture.whenStable();

      expect(sequentialButtons(host).map((button) => button.textContent.trim())).toEqual([
        'Previous: TASK-005',
        'Next: TASK-007',
      ]);
      for (const [direction, target, source, remaining] of [
        ['Previous', first, '# Nonconforming destination', ['Next: TASK-008']],
        ['Next', middle, '# Middle', ['Previous: TASK-005', 'Next: TASK-007']],
        ['Next', last, '', ['Previous: TASK-008']],
      ] as const) {
        sequentialButtons(host)
          .find((button) => button.textContent.trim().startsWith(direction))!
          .click();
        await fixture.whenStable();
        const document = brief(target);
        const read = request(document.path);
        expect(read.request.method).toBe('GET');
        read.flush({ path: document.path, status: 'ok', source });
        await fixture.whenStable();
        expect(fixture.componentInstance.reader()).toMatchObject({
          selection: { document, requirement, task: target },
          response: { path: document.path, status: 'ok' },
        });
        expect(host.querySelector('.source-path')?.textContent).toBe(document.path);
        expect(host.querySelector('app-document-reader')?.getAttribute('data-reader-state')).toBe(
          source ? 'loaded' : 'empty',
        );
        if (target === first) {
          expect(host.querySelector('app-document-reader h1')?.textContent).toBe(
            'Nonconforming destination',
          );
          expect(host.querySelector('app-document-reader article')).toBeNull();
        }
        expect(sequentialButtons(host).map((button) => button.textContent.trim())).toEqual(
          remaining,
        );
        TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
      }
    });
  }

  for (const order of ['unknown', 'single', 'unlisted'] as const) {
    it(`omits both directions for ${order} ordering or position`, async () => {
      const { value, requirement, first, unlisted } = sequentialWorkspace();
      const task = order === 'unlisted' ? unlisted : first;
      if (order === 'unknown') requirement.taskOrder = null;
      if (order === 'single') requirement.taskOrder = [first.id];
      const { fixture, host } = await load(value);
      const document = task.documents[0];
      fixture.componentInstance.select(document, requirement, task);
      await fixture.whenStable();
      request(document.path).flush({ path: document.path, status: 'ok', source: '# Current' });
      await fixture.whenStable();
      expect(host.querySelector('.sequential-navigation')).toBeNull();
      expect(host.textContent).toContain(value.issues[0].message);
    });
  }

  it('hides only the unavailable direction without skipping or switching brief type', async () => {
    const { value, requirement, first, middle, last, unlisted } = sequentialWorkspace();
    requirement.taskOrder!.push(unlisted.id);
    first.documents[1].readable = false;
    last.documents.splice(1, 1);
    const { fixture, host } = await load(value);
    const document = middle.documents[1];
    fixture.componentInstance.select(document, requirement, middle);
    await fixture.whenStable();
    request(document.path).flush({ path: document.path, status: 'ok', source: '# Current' });
    await fixture.whenStable();
    expect(sequentialButtons(host)).toHaveLength(0);
  });

  it('keeps Next available when only the previous matching brief is unreadable', async () => {
    const { value, requirement, first, middle, last } = sequentialWorkspace();
    first.documents[1].readable = false;
    const { fixture, host } = await load(value);
    const document = middle.documents[1];
    fixture.componentInstance.select(document, requirement, middle);
    await fixture.whenStable();
    request(document.path).flush({ path: document.path, status: 'ok', source: '# Current' });
    await fixture.whenStable();

    const buttons = sequentialButtons(host);
    expect(buttons.map((button) => button.textContent.trim())).toEqual([`Next: ${last.id}`]);
    buttons[0].click();
    await fixture.whenStable();

    const destination = last.documents[1];
    const read = request(destination.path);
    expect(read.request.method).toBe('GET');
    read.flush({ path: destination.path, status: 'ok', source: '# Next implementation brief' });
    await fixture.whenStable();
    expect(fixture.componentInstance.reader()).toMatchObject({
      selection: { document: destination, requirement, task: last },
      response: { path: destination.path, status: 'ok' },
    });
    expect(host.querySelector('.source-path')?.textContent).toBe(destination.path);
    TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
  });

  for (const status of ['missing', 'unreadable'] as const) {
    it(`selects the exact neighbour when its brief becomes ${status} after discovery`, async () => {
      const { value, requirement, first, middle } = sequentialWorkspace();
      const { fixture, host } = await load(value);
      const document = first.documents[1];
      fixture.componentInstance.select(document, requirement, first);
      await fixture.whenStable();
      request(document.path).flush({ path: document.path, status: 'ok', source: '# Current' });
      await fixture.whenStable();
      sequentialButtons(host)[0].click();
      await fixture.whenStable();
      const destination = middle.documents[1];
      request(destination.path).flush(
        { path: destination.path, status, error: 'Changed after discovery' },
        { status: status === 'missing' ? 404 : 403, statusText: 'Unavailable' },
      );
      await fixture.whenStable();
      expect(fixture.componentInstance.reader()).toMatchObject({
        selection: { document: destination, requirement, task: middle },
        response: { path: destination.path, status },
      });
      expect(host.querySelector('app-document-reader')?.getAttribute('data-reader-state')).toBe(
        status,
      );
      expect(host.textContent).toContain('Changed after discovery');
      TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
    });
  }

  async function loadedSource(source: string) {
    const result = await load();
    click(result.host, result.value.document.path);
    await result.fixture.whenStable();
    request(result.value.document.path).flush({
      path: result.value.document.path,
      status: 'ok',
      source,
    });
    await result.fixture.whenStable();
    return result;
  }

  function follow(host: HTMLElement, label: string) {
    const anchor = [...host.querySelectorAll<HTMLAnchorElement>('app-document-reader a')].find(
      (link) => link.textContent === label,
    )!;
    expect(anchor).toBeDefined();
    anchor.click();
  }

  async function selectedTask(
    source = '# Implementation\n\n[Section](#implementation) [Other](other.md)',
  ) {
    const result = await loadedSource('# Project');
    const requirement = result.value.requirements[0];
    const task = requirement.tasks[0];
    const path = task.documents[1].path;
    result.fixture.componentInstance.select(task.documents[1], requirement, task);
    await result.fixture.whenStable();
    request(path).flush({ path, status: 'ok', source });
    await result.fixture.whenStable();
    return { ...result, requirement, task };
  }

  function breadcrumb(host: HTMLElement, kind: string) {
    const button = host.querySelector<HTMLButtonElement>(`button[data-breadcrumb="${kind}"]`)!;
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(false);
    return button;
  }

  for (const kind of ['project', 'requirement', 'task'] as const) {
    it(`opens the established ${kind} breadcrumb through a confirmed read`, async () => {
      const { fixture, value, requirement, task, host } = await selectedTask();
      const target =
        kind === 'project'
          ? value.document
          : kind === 'requirement'
            ? requirement.document
            : task.documents[0];
      const before = fixture.componentInstance.reader();
      const button = breadcrumb(host, kind);
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
      button.focus();
      expect(document.activeElement).toBe(button);
      button.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.reader()).toBe(before);
      request(target.path).flush({ path: target.path, status: 'ok', source: '# Ancestor' });
      await fixture.whenStable();
      const read = fixture.componentInstance.reader();
      if (read.status !== 'received') throw new Error('Expected ancestor');
      expect(read.selection.document).toBe(target);
      expect(read.selection.requirement).toBe(kind === 'project' ? null : requirement);
      expect(read.selection.task).toBe(kind === 'task' ? task : null);
      const nav = host.querySelector('nav[aria-label="Breadcrumbs"]')!;
      expect(nav.querySelectorAll('li')).toHaveLength(
        kind === 'project' ? 1 : kind === 'requirement' ? 2 : 3,
      );
      expect(nav.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe(
        kind === 'project' ? value.name : kind === 'requirement' ? requirement.id : task.id,
      );
      TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
    });
  }

  it('keeps task and implementation document identities at the same Task hierarchy level', async () => {
    const { fixture, task, host } = await selectedTask();
    const labels = () =>
      [...host.querySelectorAll('nav[aria-label="Breadcrumbs"] button')].map((button) =>
        button.textContent?.trim(),
      );
    const implementationLabels = labels();
    expect(implementationLabels).toEqual(['Example project', 'REQ-002', 'TASK-005']);
    expect(host.querySelector('.reading-document > p')?.textContent?.trim()).toBe(
      'Implementation brief',
    );
    expect(host.querySelector('nav[aria-label="Breadcrumbs"]')?.textContent).not.toContain(
      'implementation.md',
    );
    breadcrumb(host, 'task').click();
    await fixture.whenStable();
    const path = task.documents[0].path;
    request(path).flush({ path, status: 'ok', source: '# Task brief' });
    await fixture.whenStable();
    expect(labels()).toEqual(implementationLabels);
    expect(host.querySelector('.reading-document > p')?.textContent?.trim()).toBe('Task brief');
    expect(host.querySelector('.source-path')?.textContent).toContain('/task.md');
  });

  for (const [kind, status, code] of [
    ['project', 'missing', 404],
    ['requirement', 'unreadable', 403],
    ['task', 'unsupported', 400],
    ['requirement', 'forbidden', 403],
  ] as const) {
    it(`preserves the current document when the ${kind} ancestor is ${status}`, async () => {
      const { fixture, value, requirement, task, host } = await selectedTask();
      const target =
        kind === 'project'
          ? value.document
          : kind === 'requirement'
            ? requirement.document
            : task.documents[0];
      const before = fixture.componentInstance.reader();
      const reading = host.querySelector<HTMLElement>('main.reading')!;
      const content = host.querySelector('.markdown');
      reading.scrollTop = 83;
      breadcrumb(host, kind).click();
      await fixture.whenStable();
      request(target.path).flush(
        { path: target.path, status, error: 'Ancestor is unavailable' },
        { status: code, statusText: 'Failure' },
      );
      await fixture.whenStable();
      expect(fixture.componentInstance.reader()).toBe(before);
      expect(host.querySelector('.markdown')).toBe(content);
      expect(reading.scrollTop).toBe(83);
      expect(host.textContent).toContain(`Destination ${status}: Ancestor is unavailable`);
      expect(host.querySelector('.source-path')?.textContent).toContain('/implementation.md');
      TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
    });
  }

  it('retains standalone context without presenting it as breadcrumb ancestry', async () => {
    const { fixture, value, requirement, task, host } = await selectedTask();
    const standalone = { path: 'notes/topic.md', kind: 'standalone', title: 'Topic' } as const;
    fixture.componentInstance.select(standalone);
    await fixture.whenStable();
    request(standalone.path).flush({ path: standalone.path, status: 'ok', source: '# Topic' });
    await fixture.whenStable();
    const read = fixture.componentInstance.reader();
    if (read.status !== 'received') throw new Error('Expected standalone');
    expect(read.selection.requirement).toBe(requirement);
    expect(read.selection.task).toBe(task);
    expect(host.querySelector('nav[aria-label="Breadcrumbs"]')).toBeNull();
    expect(host.querySelector('.context')?.textContent).toContain('standalone document');
    expect(host.querySelector('.context')?.textContent).not.toContain('REQ-002');
    expect(host.querySelector('.context')?.textContent).not.toContain('TASK-005');
    const project = host.querySelector<HTMLButtonElement>('[data-project-access]')!;
    project.focus();
    expect(document.activeElement).toBe(project);
    project.click();
    await fixture.whenStable();
    request(value.document.path).flush({
      path: value.document.path,
      status: 'ok',
      source: '# Project',
    });
    await fixture.whenStable();
    expect(host.querySelector('nav[aria-label="Breadcrumbs"] li')?.textContent).toContain(
      value.name,
    );
    expect(host.querySelectorAll('nav[aria-label="Breadcrumbs"] li')).toHaveLength(1);
  });

  it('does not invent ancestors from an inconsistent requirement/task pair', async () => {
    const { fixture, value, task, host } = await selectedTask();
    fixture.componentInstance.select(task.documents[0], value.requirements[1], task);
    await fixture.whenStable();
    const path = task.documents[0].path;
    request(path).flush({ path, status: 'ok', source: '# Inconsistent context' });
    await fixture.whenStable();
    const buttons = host.querySelectorAll('nav[aria-label="Breadcrumbs"] button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain(value.name);
  });

  it('supersedes a pending contextual-link read and local fragment when an ancestor is requested', async () => {
    const { fixture, value, host } = await selectedTask();
    follow(host, 'Other');
    await fixture.whenStable();
    const other = request('.worktree/requirements/REQ-002/tasks/TASK-005/other.md');
    const heading = host.querySelector<HTMLElement>('app-document-reader h1')!;
    const scroll = vi.fn();
    heading.scrollIntoView = scroll;
    follow(host, 'Section');
    expect(other.cancelled).toBe(true);
    breadcrumb(host, 'project').click();
    await fixture.whenStable();
    expect(scroll).not.toHaveBeenCalled();
    request(value.document.path).flush({
      path: value.document.path,
      status: 'ok',
      source: '# Project',
    });
    await fixture.whenStable();
    expect(scroll).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Section not found');
    expect(host.querySelector('app-document-reader h1')?.textContent).toBe('Project');
  });

  it('cancels an older ancestor read when a newer ancestor is requested', async () => {
    const { fixture, value, requirement, host } = await selectedTask();
    breadcrumb(host, 'requirement').click();
    await fixture.whenStable();
    const first = request(requirement.document.path);
    breadcrumb(host, 'project').click();
    await fixture.whenStable();
    expect(first.cancelled).toBe(true);
    request(value.document.path).flush({
      path: value.document.path,
      status: 'ok',
      source: '# Current project',
    });
    await fixture.whenStable();
    expect(host.querySelector('app-document-reader h1')?.textContent).toBe('Current project');
  });

  it('supersedes post-read fragment work with an ancestor before destination rendering', async () => {
    const { fixture, value, host } = await selectedTask(
      '# Implementation\n\n[Other](other.md#absent)',
    );
    follow(host, 'Other');
    await fixture.whenStable();
    const path = '.worktree/requirements/REQ-002/tasks/TASK-005/other.md';
    request(path).flush({ path, status: 'ok', source: '# Other' });
    // The previous breadcrumb is still mounted until Angular renders the
    // destination. Its action must use the current selection and cancel the
    // pending post-render fragment, just like any newer navigation.
    breadcrumb(host, 'project').click();
    await fixture.whenStable();
    request(value.document.path).flush({
      path: value.document.path,
      status: 'ok',
      source: '# Project',
    });
    await fixture.whenStable();
    expect(host.textContent).not.toContain('Section not found');
    expect(host.querySelector('app-document-reader h1')?.textContent).toBe('Project');
  });

  for (const kind of ['project', 'requirement', 'task', 'implementation'] as const) {
    it(`fetches the selected ${kind} even with discovery issues and retains its exact source`, async () => {
      const { fixture, value, host } = await load();
      const requirement = value.requirements[0];
      const task = requirement.tasks[0];
      const document =
        kind === 'project'
          ? value.document
          : kind === 'requirement'
            ? requirement.document
            : task.documents.find((doc) => doc.kind === kind)!;
      if (kind === 'implementation') fixture.componentInstance.select(document, requirement, task);
      else click(host, document.path);
      await fixture.whenStable();
      expect(host.querySelector('app-document-reader')!.getAttribute('data-reader-state')).toBe(
        'loading',
      );
      const source = '# Exact source\r\n<!-- comment -->\n\x00';
      request(document.path).flush({ path: document.path, status: 'ok', source });
      await fixture.whenStable();
      const read = fixture.componentInstance.reader();
      expect(read.status).toBe('received');
      if (read.status !== 'received') throw new Error('Expected document result');
      expect(read.response).toEqual({ path: document.path, status: 'ok', source });
      expect(read.selection.document).toBe(document);
      expect(read.selection.requirement).toBe(kind === 'project' ? null : requirement);
      expect(read.selection.task).toBe(kind === 'task' || kind === 'implementation' ? task : null);
      const presenter = fixture.debugElement.query(By.directive(DocumentReader))
        .componentInstance as DocumentReader;
      expect(presenter.state()).toBe(read);
      expect(host.querySelector('app-document-reader')!.getAttribute('data-reader-state')).toBe(
        'loaded',
      );
      expect(host.textContent).toContain('Missing required section: Scope');
      expect(document.templateValid).toBe(false);
      expect(host.querySelector('app-document-reader h1')?.textContent).toBe('Exact source');
      expect(host.querySelector('app-document-reader article')).toBeNull();
    });
  }

  for (const [kind, title, metadata, sections] of [
    [
      'requirement',
      'REQ-002 — Requirement',
      ['Review state: Retain the authored review note.'],
      ['Intent', 'Desired outcome', 'Scope', 'Tasks', 'Open questions'],
    ],
    [
      'task',
      'TASK-005 — Task',
      ['Requirement: [Parent](../../req.md) — retain this relationship note.'],
      ['Purpose', 'Scope', 'Expected outcome', 'Implementation brief'],
    ],
    [
      'implementation',
      'TASK-005 — Implementation brief: Task',
      ['Requirement: [Parent](../../req.md)', 'Task: [Brief](task.md) — retain this task note.'],
      [
        'Objective',
        'Context and sources',
        'Required work',
        'Constraints and exclusions',
        'Acceptance criteria',
        'Verification and handoff',
        'Supporting material',
      ],
    ],
  ] as const) {
    it(`renders the authored ${kind} layout in source order`, async () => {
      const { fixture, value, host } = await load();
      const requirement = value.requirements[0];
      const document =
        kind === 'requirement'
          ? requirement.document
          : requirement.tasks[0].documents.find((entry) => entry.kind === kind)!;
      const bodies: Record<string, string> = {
        Purpose: 'Purpose prose. [Jump to outcome](#expected-outcome)',
        'Implementation brief': '[Implementation](implementation.md) — pending explanation.',
        'Acceptance criteria':
          '- [x] Confirmed\n- [ ] Pending\n\n| Result | Count |\n| --- | --- |\n| Passed | 3 |',
        'Verification and handoff':
          '### Acceptance history\n\nEarlier evidence remains.\n\n```text\n<example>\n```',
      };
      const source = [
        '# ' + title,
        ...metadata,
        ...sections.map((section) => `## ${section}\n\n${bodies[section] ?? section + ' prose.'}`),
      ].join('\n\n');
      if (kind === 'implementation')
        fixture.componentInstance.select(document, requirement, requirement.tasks[0]);
      else click(host, document.path);
      await fixture.whenStable();
      request(document.path).flush({ path: document.path, status: 'ok', source });
      await fixture.whenStable();

      const article = host.querySelector(`app-document-reader article.${kind}`)!;
      expect(article.querySelector('header h1')?.textContent).toBe(title);
      expect(
        [...article.querySelectorAll('.document-metadata')].map((row) => row.textContent?.trim()),
      ).toEqual(metadata.map((line) => line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')));
      expect(
        [...article.querySelectorAll('section > h2')].map((heading) => heading.textContent),
      ).toEqual(sections);
      expect(host.textContent).toContain('Missing required section: Scope');
      expect(document.templateValid).toBe(false);
      if (kind === 'task') {
        expect(article.textContent).toContain('pending explanation.');
        const outcome = article.querySelector<HTMLElement>('#expected-outcome')!;
        const scroll = vi.fn();
        outcome.scrollIntoView = scroll;
        follow(host, 'Jump to outcome');
        await fixture.whenStable();
        expect(scroll).toHaveBeenCalledWith({ block: 'start' });
        follow(host, 'Parent');
        request(requirement.document.path).flush({
          path: requirement.document.path,
          status: 'ok',
          source: '# Parent requirement',
        });
        await fixture.whenStable();
        expect(host.querySelector('app-document-reader h1')?.textContent).toBe(
          'Parent requirement',
        );
      }
      if (kind === 'implementation') {
        expect(article.querySelector('h3')?.id).toBe('acceptance-history');
        expect(article.textContent).toContain('Earlier evidence remains.');
        expect(article.querySelector('td')?.textContent).toBe('Passed');
        expect(article.querySelector('pre code')?.textContent).toContain('<example>');
        expect([...article.querySelectorAll('li')].map((item) => item.textContent?.trim())).toEqual(
          ['☑ Confirmed', '☐ Pending'],
        );
        expect(article.querySelector('input')).toBeNull();
      }
    });
  }

  it('keeps template-shaped project and standalone content in one general Markdown presentation', async () => {
    const source =
      '# REQ-002 — Example\n\n## Intent\n\n[Standalone](example.md)\n\n' +
      '## Desired outcome\n\nReadable.\n\n## Scope\n\nExample prose.\n\n## Tasks\n\nNone.';
    const { fixture, host } = await loadedSource(source);
    const assertGeneral = () => {
      const markdown = host.querySelector('app-document-reader .markdown')!;
      expect(markdown.children).toHaveLength(1);
      expect(markdown.querySelector('article, section')).toBeNull();
      expect(
        [...markdown.querySelectorAll('h1, h2')].map((heading) => heading.textContent),
      ).toEqual(['REQ-002 — Example', 'Intent', 'Desired outcome', 'Scope', 'Tasks']);
      expect(markdown.textContent).toContain('Example prose.');
    };
    assertGeneral();
    follow(host, 'Standalone');
    request('.worktree/example.md').flush({ path: '.worktree/example.md', status: 'ok', source });
    await fixture.whenStable();
    assertGeneral();
  });

  for (const templateValid of [true, false]) {
    it(`uses current source rather than discovery validity (${templateValid})`, async () => {
      const snapshot = workspace();
      const doc = snapshot.requirements[0].document;
      doc.templateValid = templateValid;
      const source =
        '# REQ-002 — Current requirement\n\n## Intent\n\nCurrent intent.\n\n' +
        '## Desired outcome\n\nCurrent outcome.\n\n' +
        (templateValid ? '' : '## Scope\n\nCurrent scope.\n\n') +
        '## Tasks\n\nCurrent task notes.';
      const { fixture, host } = await load(snapshot);
      click(host, doc.path);
      await fixture.whenStable();
      request(doc.path).flush({ path: doc.path, status: 'ok', source });
      await fixture.whenStable();

      const reader = host.querySelector('app-document-reader')!;
      expect(reader.getAttribute('data-reader-state')).toBe('loaded');
      expect(Boolean(reader.querySelector('article.requirement'))).toBe(!templateValid);
      expect(reader.textContent).toContain('Current task notes.');
      expect(host.textContent).toContain(snapshot.issues[0].message);
      expect(doc.templateValid).toBe(templateValid);
      expect(fixture.componentInstance.reader()).toMatchObject({
        selection: { document: doc },
        response: { status: 'ok', source },
      });
    });
  }

  for (const structured of [true, false]) {
    it(`keeps links and fragments connected across ${structured ? 'structured' : 'general'} presentation`, async () => {
      const { fixture, value, host } = await load();
      const requirement = value.requirements[0];
      const task = requirement.tasks[0].documents[0];
      const source =
        '# TASK-005 — Current task\n\nRequirement: [Parent](../../req.md#repeat-1)\n\n' +
        '## Purpose\n\n### Repeat\n\n[Jump](#repeat-1) [Web](https://example.invalid/)\n\n' +
        '## Scope\n\n### Repeat\n\n[Guide][guide] [Unsafe](javascript:alert%281%29) ' +
        '[Invalid](https://)\n\n' +
        (structured ? '## Expected outcome\n\nReadable.\n\n' : '') +
        '## Implementation brief\n\n[Brief](implementation.md)\n\n[guide]: ../guide.md';
      click(host, task.path);
      await fixture.whenStable();
      request(task.path).flush({ path: task.path, status: 'ok', source });
      await fixture.whenStable();
      const reader = host.querySelector('app-document-reader')!;
      expect(Boolean(reader.querySelector('article.task'))).toBe(structured);
      const links = [...reader.querySelectorAll<HTMLAnchorElement>('a')];
      expect(links.map((link) => link.textContent)).toEqual([
        'Parent',
        'Jump',
        'Web',
        'Guide',
        'Unsafe',
        'Invalid',
        'Brief',
      ]);
      expect(links.map((link) => link.className)).toEqual(
        links.map((_, index) => `worktree-link-${index}`),
      );
      expect(links[2].href).toBe('https://example.invalid/');
      expect(links[2].target).toBe('_blank');
      expect(links[2].rel).toBe('noopener noreferrer');
      expect(links.slice(4, 6).every((link) => !link.hasAttribute('href'))).toBe(true);
      const before = fixture.componentInstance.reader();
      follow(host, 'Unsafe');
      follow(host, 'Invalid');
      const repeated = [...reader.querySelectorAll<HTMLElement>('h3')];
      expect(repeated.map((heading) => heading.id)).toEqual(['repeat', 'repeat-1']);
      const scroll = vi.fn();
      repeated[1].scrollIntoView = scroll;
      follow(host, 'Jump');
      await fixture.whenStable();
      expect(scroll).toHaveBeenCalledWith({ block: 'start' });
      expect(fixture.componentInstance.reader()).toBe(before);
      TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');

      follow(host, 'Guide');
      await fixture.whenStable();
      const guidePath = requirement.document.path.replace('req.md', 'tasks/guide.md');
      request(guidePath).flush(
        { path: guidePath, status: 'missing', error: 'Guide missing' },
        { status: 404, statusText: 'Not Found' },
      );
      await fixture.whenStable();
      expect(fixture.componentInstance.reader()).toBe(before);
      expect(host.textContent).toContain('Destination missing: Guide missing');

      const targets: HTMLElement[] = [];
      const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: function (this: HTMLElement) {
          targets.push(this);
        },
      });
      try {
        follow(host, 'Parent');
        await fixture.whenStable();
        const path = requirement.document.path;
        request(path).flush({ path, status: 'ok', source: '# Repeat\n\n## Repeat' });
        await fixture.whenStable();
        expect(targets.map((heading) => heading.id)).toEqual(['repeat-1']);
        expect(fixture.componentInstance.reader()).toMatchObject({
          selection: { document: requirement.document },
        });
        TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
      } finally {
        if (descriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', descriptor);
        else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
      }
    });
  }

  for (const lexerFailures of [1, Infinity]) {
    it(`preserves the successful read after ${lexerFailures === 1 ? 'analysis failure' : 'analysis and rendering failure'}`, async () => {
      const original = Marked.prototype.lexer;
      let calls = 0;
      const lexer = vi.spyOn(Marked.prototype, 'lexer').mockImplementation(function (
        this: Marked,
        source,
        options,
      ) {
        if (++calls <= lexerFailures) throw new Error('Synthetic tokenization failure');
        return original.call(this, source, options);
      });
      const source = '# Retrieved\n\n<script>original text</script>';
      try {
        const { host, fixture, value } = await loadedSource(source);
        const reader = host.querySelector('app-document-reader')!;
        expect(reader.getAttribute('data-reader-state')).toBe('loaded');
        expect(reader.querySelector('script, article')).toBeNull();
        expect(reader.textContent).toContain('<script>original text</script>');
        if (lexerFailures === 1) {
          expect(reader.querySelector('h1')?.textContent).toBe('Retrieved');
          expect(reader.querySelector('[role="status"]')).toBeNull();
        } else {
          expect(reader.querySelector('pre')?.textContent).toBe(source);
          expect(reader.querySelector('[role="status"]')?.textContent).toContain(
            'Unable to format document',
          );
        }
        expect(fixture.componentInstance.reader()).toMatchObject({
          status: 'received',
          selection: { document: value.document },
          response: { status: 'ok', source },
        });
      } finally {
        lexer.mockRestore();
      }
    });
  }

  for (const [name, code, response, text, state] of [
    [
      'missing',
      404,
      { status: 'missing', error: 'No such document' },
      'Requirement brief not found',
      'missing',
    ],
    ['empty', 200, { status: 'ok', source: '' }, 'Requirement brief is empty', 'empty'],
    ['whitespace', 200, { status: 'ok', source: ' \n\t' }, 'Requirement brief is empty', 'empty'],
    [
      'comments only',
      200,
      { status: 'ok', source: '<!-- note -->' },
      'Requirement brief is empty',
      'empty',
    ],
    [
      'frontmatter only',
      200,
      { status: 'ok', source: '---\nkey: value\n---\n' },
      'Requirement brief is empty',
      'empty',
    ],
    [
      'permission failure',
      403,
      { status: 'unreadable', error: 'Permission denied' },
      'Unable to read requirement brief',
      'unreadable',
    ],
    [
      'other read failure',
      500,
      { status: 'unreadable', error: 'Read failed, not a missing-file classification' },
      'Unable to read requirement brief',
      'unreadable',
    ],
    [
      'unsupported',
      400,
      { status: 'unsupported', error: 'Unsupported destination' },
      'Unsupported document destination',
      'unsupported',
    ],
    [
      'forbidden',
      403,
      { status: 'forbidden', error: 'Outside workspace' },
      'Document destination is unavailable',
      'forbidden',
    ],
  ] as const) {
    it(`explains ${name} without substituting a task or losing the requirement context`, async () => {
      const { fixture, value, host } = await load();
      const requirement = value.requirements[0];
      click(host, requirement.document.path);
      await fixture.whenStable();
      request(requirement.document.path).flush(
        { path: requirement.document.path, ...response },
        { status: code, statusText: 'Response' },
      );
      await fixture.whenStable();
      expect(host.textContent).toContain(text);
      expect(host.querySelector('app-document-reader')!.getAttribute('data-reader-state')).toBe(
        state,
      );
      expect(
        host
          .querySelector(`.requirement-rail [data-document-path="${requirement.document.path}"]`)
          ?.getAttribute('aria-current'),
      ).toBe('page');
      const read = fixture.componentInstance.reader();
      expect(read.status).toBe('received');
      if (read.status !== 'received') throw new Error('Expected request result');
      expect(read.selection.requirement).toBe(requirement);
      expect(read.selection.task).toBeNull();
      expect(read.selection.document.path).toBe(requirement.document.path);
      expect(host.querySelector('.source-path')!.textContent).toContain(requirement.document.path);
      TestBed.inject(HttpTestingController).expectNone(
        (request) => request.url === '/api/document',
      );
    });
  }

  it('renders an error reason as inert text and recovers on a new explicit request', async () => {
    const { fixture, value, host } = await load();
    const path = value.requirements[0].document.path;
    click(host, path);
    await fixture.whenStable();
    request(path).flush(
      { path, status: 'unreadable', error: '<img src=x onerror="alert(1)">' },
      { status: 403, statusText: 'Denied' },
    );
    await fixture.whenStable();
    expect(host.querySelector('app-document-reader img')).toBeNull();
    expect(host.textContent).toContain('<img src=x onerror="alert(1)">');
    click(host, path);
    await fixture.whenStable();
    request(path).flush({ path, status: 'ok', source: '# Available now' });
    await fixture.whenStable();
    expect(host.querySelector('app-document-reader')!.getAttribute('data-reader-state')).toBe(
      'loaded',
    );
  });

  it('keeps transport failure distinct from file absence and emptiness', async () => {
    const { fixture, value, host } = await load();
    const path = value.document.path;
    click(host, path);
    await fixture.whenStable();
    request(path).error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(host.querySelector('app-document-reader')!.getAttribute('data-reader-state')).toBe(
      'request-error',
    );
    expect(host.textContent).toContain('Unable to load project document');
    expect(host.textContent).not.toContain('is empty');
    expect(host.textContent).not.toContain('not found');
    const read = fixture.componentInstance.reader();
    if (read.status === 'idle') throw new Error('Expected selected document');
    expect(read.selection.document.path).toBe(path);
  });

  it('presents Markdown through Angular without activating document HTML or templates', async () => {
    const { fixture, value, host } = await load();
    const path = value.document.path;
    const source =
      '# Safe reading\r\n\r\n**Original** {{ 1 + 1 }}\r\n\r\n' +
      '<script>alert(1)</script>\r\n\r\n' +
      '<img src=x onerror="alert(1)"><iframe src="file:///tmp/program"></iframe>\r\n\r\n' +
      '```sh\necho "display only"\n```\nText\x00';
    click(host, path);
    await fixture.whenStable();
    request(path).flush({ path, status: 'ok', source });
    await fixture.whenStable();

    const reader = host.querySelector('app-document-reader')!;
    expect(reader.querySelector('h1')?.textContent).toBe('Safe reading');
    expect(reader.querySelector('strong')?.textContent).toBe('Original');
    expect(reader.textContent).toContain('{{ 1 + 1 }}');
    expect(reader.textContent).toContain('<script>alert(1)</script>');
    expect(reader.querySelector('script,img,iframe,[src],[onerror]')).toBeNull();
    expect(reader.querySelector('pre code')?.textContent).toBe('echo "display only"\n');
    const read = fixture.componentInstance.reader();
    if (read.status !== 'received' || read.response.status !== 'ok') {
      throw new Error('Expected successful read');
    }
    expect(read.response.source).toBe(source);
    expect(read.selection.document).toBe(value.document);
  });

  it('blocks executable and encoded schemes without navigation or another read', async () => {
    const { fixture, value, host } = await load();
    const path = value.document.path;
    click(host, path);
    await fixture.whenStable();
    request(path).flush({
      path,
      status: 'ok',
      source:
        '[Script](JaVaScRiPt:alert%281%29) [Encoded](javascript%3Aalert%281%29) ' +
        '[Entity](java&#x73;cript:alert%281%29) [File](file:///tmp/script.sh)',
    });
    await fixture.whenStable();
    const before = fixture.componentInstance.reader();
    const location = window.location.href;
    const open = vi.spyOn(window, 'open');
    try {
      const links = host.querySelectorAll<HTMLAnchorElement>('app-document-reader a');
      expect(links).toHaveLength(4);
      for (const link of links) {
        expect(link.getAttribute('role')).toBe('link');
        expect(link.hasAttribute('href')).toBe(false);
        link.click();
        link.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }));
        link.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      }
      await fixture.whenStable();
      expect(open).not.toHaveBeenCalled();
      expect(window.location.href).toBe(location);
      expect(fixture.componentInstance.reader()).toBe(before);
      expect(host.textContent).toContain('Unsupported document destination');
      TestBed.inject(HttpTestingController).expectNone(
        (request) => request.url === '/api/document',
      );
    } finally {
      open.mockRestore();
    }
  });

  for (const [destination, path] of [
    ['guide.md', '.worktree/guide.md'],
    ['../guide.md', 'guide.md'],
    ['../guide%20one.md', 'guide one.md'],
    ['../guide%2520one.md', 'guide%20one.md'],
    ['guide.md?version=2', '.worktree/guide.md'],
    ['guide.md?version=2#installation', '.worktree/guide.md'],
  ]) {
    it(`opens a source-relative standalone document without a second GET: ${destination}`, async () => {
      const { fixture, value, host } = await loadedSource(`[Guide](${destination})`);
      const original = JSON.stringify(value);
      const before = fixture.componentInstance.reader();
      follow(host, 'Guide');
      await fixture.whenStable();
      expect(fixture.componentInstance.reader()).toBe(before);
      request(path).flush({ path, status: 'ok', source: '# Installation\n' });
      await fixture.whenStable();
      const read = fixture.componentInstance.reader();
      if (read.status !== 'received') throw new Error('Expected destination');
      expect(read.selection.document.kind).toBe('standalone');
      expect(read.selection.document.path).toBe(path);
      expect(host.querySelector('app-document-reader h1')?.id).toBe('installation');
      expect(JSON.stringify(value)).toBe(original);
      expect(host.querySelector('.context')?.textContent).toContain('standalone document');
      TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
    });
  }

  it('uses established context when an internal link targets a discovered task document', async () => {
    const { fixture, value, host } = await loadedSource(
      '[Task](requirements/REQ-002/tasks/TASK-005/task.md)',
    );
    follow(host, 'Task');
    await fixture.whenStable();
    const task = value.requirements[0].tasks[0];
    const path = task.documents[0].path;
    request(path).flush({ path, status: 'ok', source: '# Task' });
    await fixture.whenStable();
    const read = fixture.componentInstance.reader();
    if (read.status !== 'received') throw new Error('Expected task');
    expect(read.selection.requirement).toBe(value.requirements[0]);
    expect(read.selection.task).toBe(task);
    expect(read.selection.document).toBe(task.documents[0]);
  });

  for (const [status, code, destination] of [
    ['missing', 404, 'Missing.md'],
    ['unreadable', 403, 'unreadable.md'],
    ['unreadable', 500, 'changed.md'],
    ['unsupported', 400, 'guide.MD'],
    ['unsupported', 400, 'folder'],
    ['unsupported', 400, 'script.sh'],
    ['forbidden', 403, 'escaping-symlink.md'],
  ] as const) {
    it(`preserves the current reading after ${status}: ${destination}`, async () => {
      const { fixture, host } = await loadedSource(
        `# Current\n\n[Target](${destination}#installation)`,
      );
      const reading = host.querySelector<HTMLElement>('main.reading')!;
      reading.scrollTop = 73;
      const content = host.querySelector('.markdown');
      const before = fixture.componentInstance.reader();
      follow(host, 'Target');
      await fixture.whenStable();
      const path = '.worktree/' + destination;
      request(path).flush(
        { path, status, error: 'Typed destination failure' },
        { status: code, statusText: 'Failure' },
      );
      await fixture.whenStable();
      expect(fixture.componentInstance.reader()).toBe(before);
      expect(host.querySelector('.markdown')).toBe(content);
      expect(reading.scrollTop).toBe(73);
      expect(host.textContent).toContain(`Destination ${status}: Typed destination failure`);
      expect(host.textContent).not.toContain('Section not found');
    });
  }

  it('preserves the current reading on protocol and transport failures', async () => {
    const { fixture, host } = await loadedSource('# Current\n\n[Target](guide.md)');
    const before = fixture.componentInstance.reader();
    for (const malformed of [false, true]) {
      follow(host, 'Target');
      await fixture.whenStable();
      const pending = request('.worktree/guide.md');
      if (malformed) pending.flush({ path: 'wrong.md', status: 'ok', source: 'Wrong identity' });
      else pending.error(new ProgressEvent('error'));
      await fixture.whenStable();
      expect(fixture.componentInstance.reader()).toBe(before);
      expect(host.textContent).toContain('Unable to load destination');
    }
  });

  it('rejects traversal without issuing a read and preserves the current selection', async () => {
    const { fixture, host } = await loadedSource('[Escape](../../escape.md)');
    const before = fixture.componentInstance.reader();
    follow(host, 'Escape');
    await fixture.whenStable();
    expect(fixture.componentInstance.reader()).toBe(before);
    expect(host.textContent).toContain('outside the selected workspace');
  });

  it('opens an empty successful destination instead of substituting another document', async () => {
    const { fixture, host } = await loadedSource('[Empty](empty.md#absent)');
    follow(host, 'Empty');
    await fixture.whenStable();
    request('.worktree/empty.md').flush({ path: '.worktree/empty.md', status: 'ok', source: '' });
    await fixture.whenStable();
    expect(host.textContent).toContain('Document is empty');
    expect(host.textContent).toContain('Section not found');
    const read = fixture.componentInstance.reader();
    if (read.status !== 'received') throw new Error('Expected empty destination');
    expect(read.selection.document.path).toBe('.worktree/empty.md');
    expect(read.response).toEqual({ path: '.worktree/empty.md', status: 'ok', source: '' });
  });

  it('scrolls local fragments without a read and preserves position when a section is absent', async () => {
    const { fixture, host } = await loadedSource(
      '# Installation\n\n## Installation\n\n[Section](#installation-1) [Missing](#absent)',
    );
    const headings = host.querySelectorAll<HTMLElement>(
      'app-document-reader h1,app-document-reader h2',
    );
    const scroll = vi.fn();
    headings[1].scrollIntoView = scroll;
    const before = fixture.componentInstance.reader();
    follow(host, 'Section');
    await fixture.whenStable();
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    expect(fixture.componentInstance.reader()).toBe(before);
    const reading = host.querySelector<HTMLElement>('main.reading')!;
    reading.scrollTop = 91;
    follow(host, 'Missing');
    await fixture.whenStable();
    expect(reading.scrollTop).toBe(91);
    expect(fixture.componentInstance.reader()).toBe(before);
    expect(host.textContent).toContain('Section not found');
    TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
  });

  it('retains a readable destination when its fragment is absent', async () => {
    const { fixture, host } = await loadedSource('[Destination](guide.md#absent)');
    follow(host, 'Destination');
    await fixture.whenStable();
    request('.worktree/guide.md').flush({
      path: '.worktree/guide.md',
      status: 'ok',
      source: '# Other section',
    });
    await fixture.whenStable();
    expect(host.textContent).toContain('Other section');
    expect(host.textContent).toContain('Section not found');
    const read = fixture.componentInstance.reader();
    if (read.status !== 'received') throw new Error('Expected destination');
    expect(read.selection.document.path).toBe('.worktree/guide.md');
  });

  it('cancels rapid link requests and pending reads when the user changes selection', async () => {
    const { fixture, value, host } = await loadedSource('[First](first.md) [Second](second.md)');
    follow(host, 'First');
    await fixture.whenStable();
    const first = request('.worktree/first.md');
    follow(host, 'Second');
    await fixture.whenStable();
    expect(first.cancelled).toBe(true);
    const second = request('.worktree/second.md');
    click(host, value.requirements[1].document.path);
    await fixture.whenStable();
    expect(second.cancelled).toBe(true);
    const path = value.requirements[1].document.path;
    request(path).flush({ path, status: 'ok', source: '# Explicit selection' });
    await fixture.whenStable();
    expect(host.querySelector('app-document-reader h1')?.textContent).toBe('Explicit selection');
  });

  it('ignores a fragment attempt superseded before the next render', async () => {
    const { fixture, value, host } = await loadedSource(
      '# Installation\n\n[Section](#installation)',
    );
    const heading = host.querySelector<HTMLElement>('app-document-reader h1')!;
    const scroll = vi.fn();
    heading.scrollIntoView = scroll;
    follow(host, 'Section');
    click(host, value.requirements[1].document.path);
    await fixture.whenStable();
    const path = value.requirements[1].document.path;
    request(path).flush({ path, status: 'ok', source: '# New document' });
    await fixture.whenStable();
    expect(scroll).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Section not found');
  });

  it('scrolls a cross-document fragment only after destination headings are rendered', async () => {
    const { fixture, host } = await loadedSource(
      '[Destination](guide.md?version=2#installation-1)',
    );
    const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    const targets: HTMLElement[] = [];
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: function (this: HTMLElement) {
        targets.push(this);
      },
    });
    try {
      follow(host, 'Destination');
      await fixture.whenStable();
      expect(targets).toHaveLength(0);
      request('.worktree/guide.md').flush({
        path: '.worktree/guide.md',
        status: 'ok',
        source: '# Installation\n\n## Installation',
      });
      await fixture.whenStable();
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('installation-1');
      expect(host.querySelector('.markdown')?.contains(targets[0])).toBe(true);
      expect(host.textContent).not.toContain('Section not found');
    } finally {
      if (previous) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', previous);
      else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    }
  });

  it('exposes native external and mail/phone links without a Go document read', async () => {
    const { fixture, host } = await loadedSource(
      '[Web](https://example.invalid/path) [Mail](mailto:a@example.invalid) [Call](tel:+1234)',
    );
    const before = fixture.componentInstance.reader();
    const links = [...host.querySelectorAll<HTMLAnchorElement>('app-document-reader a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://example.invalid/path',
      'mailto:a@example.invalid',
      'tel:+1234',
    ]);
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel).toBe('noopener noreferrer');
    for (const link of links) {
      let preventedByReader: boolean | undefined;
      // Observe the reader's decision, then suppress jsdom's native navigation
      // in the test harness. This does not claim an actual browser launch.
      const observe = (event: Event) => {
        preventedByReader = event.defaultPrevented;
        event.preventDefault();
      };
      host.addEventListener('click', observe);
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      host.removeEventListener('click', observe);
      expect(preventedByReader).toBe(false);
    }
    await fixture.whenStable();
    expect(fixture.componentInstance.reader()).toBe(before);
    TestBed.inject(HttpTestingController).expectNone((req) => req.url === '/api/document');
  });

  it('activates internal links from the keyboard and preserves standalone task context', async () => {
    const { fixture, value, host } = await loadedSource('# Project');
    const requirement = value.requirements[0];
    const task = requirement.tasks[0];
    const path = task.documents[1].path;
    fixture.componentInstance.select(task.documents[1], requirement, task);
    await fixture.whenStable();
    request(path).flush({ path, status: 'ok', source: '[Note](note.md)' });
    await fixture.whenStable();
    const link = host.querySelector('app-document-reader a')!;
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    const target = '.worktree/requirements/REQ-002/tasks/TASK-005/note.md';
    request(target).flush({ path: target, status: 'ok', source: '# Note' });
    await fixture.whenStable();
    const read = fixture.componentInstance.reader();
    if (read.status !== 'received') throw new Error('Expected standalone');
    expect(read.selection.document.kind).toBe('standalone');
    expect(read.selection.requirement).toBe(requirement);
    expect(read.selection.task).toBe(task);
    expect(host.querySelector('.context')?.textContent).not.toContain('TASK-005');
  });

  it('cancels a superseded request and cleans up an outstanding request on destruction', async () => {
    const { fixture, value, host } = await load();
    click(host, value.document.path);
    await fixture.whenStable();
    const first = request(value.document.path);
    const path = value.requirements[0].document.path;
    click(host, path);
    await fixture.whenStable();
    expect(first.cancelled).toBe(true);
    const second = request(path);
    fixture.destroy();
    expect(second.cancelled).toBe(true);
  });

  it('keeps standalone identity outside the hierarchy while retaining navigation context', async () => {
    const { fixture, value, host } = await load();
    const original = JSON.stringify(value);
    const requirement = value.requirements[0];
    const task = requirement.tasks[0];
    click(host, task.documents[0].path);
    await fixture.whenStable();
    request(task.documents[0].path).flush({
      path: task.documents[0].path,
      status: 'ok',
      source: '# Task',
    });
    await fixture.whenStable();
    const standalone = {
      path: 'notes/Standalone.md',
      kind: 'standalone',
      title: 'Standalone.md',
    } as const;
    fixture.componentInstance.select(standalone);
    await fixture.whenStable();
    request(standalone.path).flush({
      path: standalone.path,
      status: 'ok',
      source: '# REQ-999 — Template-looking standalone',
    });
    await fixture.whenStable();
    const read = fixture.componentInstance.reader();
    if (read.status !== 'received') throw new Error('Expected standalone result');
    expect(read.selection.document).toBe(standalone);
    expect(read.selection.requirement).toBe(requirement);
    expect(read.selection.task).toBe(task);
    expect(host.querySelector('.context')!.textContent).toContain('standalone document');
    expect(host.querySelector('.context')!.textContent).not.toContain(requirement.id);
    expect(host.querySelector('nav')!.textContent).not.toContain('REQ-999');
    expect(JSON.stringify(value)).toBe(original);
  });

  for (const [name, taskFrom, expectedTaskFrom] of [
    ['a different requirement without a task', null, null],
    ['an explicit requirement and its matching task', 1, 1],
    ['an explicit requirement with a mismatched task', 0, null],
  ] as const) {
    it(`keeps standalone context consistent for ${name}`, async () => {
      const { fixture, value, host } = await load();
      const previousTask = value.requirements[0].tasks[0];
      click(host, previousTask.documents[0].path);
      await fixture.whenStable();
      request(previousTask.documents[0].path).flush({
        path: previousTask.documents[0].path,
        status: 'ok',
        source: '# Previous task',
      });
      await fixture.whenStable();

      const requirement = value.requirements[1];
      const task = taskFrom === null ? null : value.requirements[taskFrom].tasks[0];
      const standalone = {
        path: 'notes/context.md',
        kind: 'standalone',
        title: 'Context',
      } as const;
      fixture.componentInstance.select(standalone, requirement, task);
      await fixture.whenStable();
      request(standalone.path).flush({
        path: standalone.path,
        status: 'ok',
        source: '# Standalone',
      });
      await fixture.whenStable();

      const read = fixture.componentInstance.reader();
      if (read.status !== 'received') throw new Error('Expected standalone result');
      expect(read.selection.document).toBe(standalone);
      expect(read.selection.requirement).toBe(requirement);
      expect(read.selection.task).toBe(
        expectedTaskFrom === null ? null : value.requirements[expectedTaskFrom].tasks[0],
      );
    });
  }

  it('does not restore an old task/document when switching requirements', async () => {
    const { fixture, value, host } = await load();
    const first = value.requirements[0];
    const implementation = first.tasks[0].documents[1];
    for (const doc of [
      first.tasks[0].documents[0],
      implementation,
      value.requirements[1].document,
      first.document,
    ]) {
      click(host, doc.path);
      await fixture.whenStable();
      request(doc.path).flush({ path: doc.path, status: 'ok', source: '# Content' });
      await fixture.whenStable();
    }
    const read = fixture.componentInstance.reader();
    if (read.status === 'idle') throw new Error('Expected requirement selection');
    expect(read.selection.document).toBe(first.document);
    expect(read.selection.task).toBeNull();
  });
});

describe('out-of-order document responses', () => {
  it('ignores stale link success/failure across newer links and A-B-A selections', async () => {
    const value = workspace();
    const requests: { path: string; result: Subject<DocumentResponse> }[] = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WorkspaceApi,
          useValue: {
            read: () => of({ workspace: value }),
            readDocument: (path: string) => {
              const result = new Subject<DocumentResponse>();
              requests.push({ path, result });
              return result;
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.select(value.document);
    await fixture.whenStable();
    requests[0].result.next({ path: value.document.path, status: 'ok', source: '# Source' });
    await fixture.whenStable();
    const initial = app.reader();
    if (initial.status !== 'received') throw new Error('Expected initial document');
    app.followDocument({ selection: initial.selection, destination: 'first.md' });
    app.followDocument({ selection: initial.selection, destination: 'second.md' });
    requests[1].result.next({ path: '.worktree/first.md', status: 'ok', source: '# Stale' });
    requests[1].result.error(new Error('Stale failure'));
    expect(app.reader()).toBe(initial);
    requests[2].result.next({ path: '.worktree/second.md', status: 'ok', source: '# Second' });
    await fixture.whenStable();
    expect(requests).toHaveLength(3);
    const second = app.reader();
    if (second.status !== 'received') throw new Error('Expected second document');
    app.followDocument({ selection: second.selection, destination: 'third.md' });
    app.select(value.requirements[0].document, value.requirements[0]);
    await fixture.whenStable();
    app.select(value.document);
    await fixture.whenStable();
    requests[3].result.next({ path: '.worktree/third.md', status: 'ok', source: '# Stale third' });
    requests[3].result.error(new Error('Stale third failure'));
    const current = app.reader();
    if (current.status === 'idle') throw new Error('Expected selection');
    expect(current.selection.document).toBe(value.document);
    expect(current.status).toBe('loading');
    requests[5].result.next({ path: value.document.path, status: 'ok', source: '# Current' });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Unable to load destination',
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-document-reader h1')?.textContent,
    ).toBe('Current');
  });

  it('does not apply a cross-document fragment after a newer explicit selection', async () => {
    const value = workspace();
    const requests: Subject<DocumentResponse>[] = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WorkspaceApi,
          useValue: {
            read: () => of({ workspace: value }),
            readDocument: () => {
              const result = new Subject<DocumentResponse>();
              requests.push(result);
              return result;
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.select(value.document);
    await fixture.whenStable();
    requests[0].next({ path: value.document.path, status: 'ok', source: '# Original' });
    await fixture.whenStable();
    const original = app.reader();
    if (original.status !== 'received') throw new Error('Expected original');
    app.followDocument({ selection: original.selection, destination: 'guide.md#absent' });
    requests[1].next({ path: '.worktree/guide.md', status: 'ok', source: '# Destination' });
    app.select(value.document);
    await fixture.whenStable();
    requests[2].next({ path: value.document.path, status: 'ok', source: '# Original again' });
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('Section not found');
    expect(host.querySelector('app-document-reader h1')?.textContent).toBe('Original again');
  });

  it('keeps the current selection authoritative before scheduled delivery and across A-B-A requests', async () => {
    const value = workspace();
    const requests: { path: string; result: Subject<DocumentResponse> }[] = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WorkspaceApi,
          useValue: {
            read: () => of({ workspace: value }),
            readDocument: (path: string) => {
              const result = new Subject<DocumentResponse>();
              requests.push({ path, result });
              return result;
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    const first = value.document;
    const second = value.requirements[0];
    app.select(first);
    await fixture.whenStable();
    app.select(second.document, second);
    requests[0].result.next({ path: first.path, status: 'ok', source: 'STALE FIRST' });
    const immediate = app.reader();
    expect(immediate.status).toBe('loading');
    if (immediate.status === 'idle') throw new Error('Expected current selection');
    expect(immediate.selection.document).toBe(second.document);
    await fixture.whenStable();
    requests[1].result.next({ path: second.document.path, status: 'ok', source: 'CURRENT SECOND' });
    await fixture.whenStable();
    requests[0].result.next({ path: first.path, status: 'missing', error: 'Late failure' });
    const current = app.reader();
    if (current.status !== 'received') throw new Error('Expected current result');
    expect(current.response).toEqual({
      path: second.document.path,
      status: 'ok',
      source: 'CURRENT SECOND',
    });
    app.select(first);
    await fixture.whenStable();
    requests[0].result.next({ path: first.path, status: 'ok', source: 'STALE SAME PATH' });
    expect(app.reader().status).toBe('loading');
    requests[2].result.next({ path: first.path, status: 'ok', source: 'NEW FIRST' });
    await fixture.whenStable();
    const latest = app.reader();
    if (latest.status !== 'received') throw new Error('Expected latest result');
    expect(latest.response).toEqual({ path: first.path, status: 'ok', source: 'NEW FIRST' });
    requests[0].result.error(new Error('Late transport failure'));
    expect(app.reader()).toBe(latest);
  });
});
