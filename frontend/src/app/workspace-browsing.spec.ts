import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Workspace, WorkspaceDocument } from './workspace';

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

function workspace(): Workspace {
  return {
    name: 'Example project',
    document: document('.worktree/project.md', 'project'),
    requirements: [
      {
        id: 'REQ-002',
        title: 'REQ-002 — Browsing',
        document: document('.worktree/requirements/REQ-002/req.md', 'requirement'),
        taskOrder: ['TASK-005', 'TASK-004'],
        tasks: ['TASK-005', 'TASK-004'].map((id) => ({
          id,
          title: `${id} — A task`,
          documents: [
            document(`.worktree/requirements/REQ-002/tasks/${id}/task.md`, 'task'),
            document(
              `.worktree/requirements/REQ-002/tasks/${id}/implementation.md`,
              'implementation',
              false,
            ),
          ],
        })),
      },
    ],
    issues: [
      {
        path: '.worktree/requirements/REQ-002/tasks/TASK-004/task.md',
        message: 'Missing required section: Scope',
      },
    ],
  };
}

describe('workspace browsing', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function load(value: Workspace | null) {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/workspace');
    expect(request.request.method).toBe('GET');
    request.flush({ workspace: value });
    await fixture.whenStable();
    return fixture;
  }

  it('explains the CLI command when no workspace was supplied', async () => {
    const fixture = await load(null);
    expect(fixture.nativeElement.textContent).toContain('Welcome to Worktree');
    expect(fixture.nativeElement.textContent).toContain('./worktree --workspace /path/to/project');
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('keeps readable non-template documents selectable despite issues and preserves state across collapse', async () => {
    const fixture = await load(workspace());
    const host: HTMLElement = fixture.nativeElement;
    const choices = [...host.querySelectorAll<HTMLButtonElement>('button[data-document-path]')];
    expect(
      choices.findIndex((button) => button.dataset['documentPath']?.includes('TASK-005/task.md')),
    ).toBeLessThan(
      choices.findIndex((button) => button.dataset['documentPath']?.includes('TASK-004/task.md')),
    );
    const choice = choices.find((button) =>
      button.dataset['documentPath']?.endsWith('TASK-004/task.md'),
    )!;
    expect(choice.disabled).toBe(false);
    choice.click();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url === '/api/document')
      .flush({
        path: choice.dataset['documentPath'],
        status: 'ok',
        source: '# Readable content\n',
      });
    await fixture.whenStable();
    const reading = host.querySelector<HTMLElement>('[aria-label="Document selection"]')!;
    reading.scrollTop = 75;
    expect(reading.textContent).toContain('TASK-004');
    expect(reading.textContent).toContain(choice.dataset['documentPath']);
    const toggle = host.querySelector<HTMLButtonElement>('[aria-controls="workspace-navigation"]')!;
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('.requirement-ribbon')?.textContent).toContain('REQ-002');
    expect(host.querySelector('[aria-label="Document selection"]')).toBe(reading);
    expect(reading.scrollTop).toBe(75);
    toggle.click();
    await fixture.whenStable();
    expect(host.querySelector('[aria-label="Document selection"]')).toBe(reading);
    expect(reading.scrollTop).toBe(75);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('.requirement-ribbon')).toBeNull();
    expect(
      host
        .querySelector(`.task-strip [data-document-path="${choice.dataset['documentPath']}"]`)
        ?.getAttribute('aria-current'),
    ).toBe('page');
    expect(host.textContent).toContain('Missing required section: Scope');
    expect(
      host.querySelector<HTMLButtonElement>(
        'button[data-document-path$="TASK-004/implementation.md"]',
      )!.disabled,
    ).toBe(false);
    expect(reading.querySelector('app-document-reader h1')?.textContent).toBe('Readable content');
    TestBed.inject(HttpTestingController).expectNone((request) => request.url === '/api/document');
  });

  for (const status of ['missing', 'unreadable'] as const) {
    it(`selects either ${status} brief in the reading surface without substituting its sibling`, async () => {
      const value = workspace();
      const requirement = value.requirements[0];
      const task = requirement.tasks[0];
      for (const document of task.documents) document.readable = false;
      const fixture = await load(value);
      const host: HTMLElement = fixture.nativeElement;
      const http = TestBed.inject(HttpTestingController);
      host
        .querySelector<HTMLButtonElement>(`[data-document-path="${task.documents[0].path}"]`)!
        .click();
      await fixture.whenStable();
      const entry = task.documents[0].path;
      http
        .expectOne((req) => req.params.get('path') === entry)
        .flush({ path: entry, status: 'ok', source: '# Entry' });
      await fixture.whenStable();
      const reading = host.querySelector<HTMLElement>('main.reading')!;
      const choices = [
        ...reading.querySelectorAll<HTMLButtonElement>('[aria-label="Task document"] button'),
      ];
      expect(choices).toHaveLength(2);
      for (const index of [1, 0]) {
        const path = task.documents[index].path;
        reading.scrollTop = 75;
        expect(choices[index].disabled).toBe(false);
        choices[index].click();
        await fixture.whenStable();
        http
          .expectOne((req) => req.params.get('path') === path)
          .flush(
            { path, status, error: 'Fixture availability' },
            { status: status === 'missing' ? 404 : 403, statusText: 'Unavailable' },
          );
        await fixture.whenStable();
        expect(choices.map((choice) => choice.getAttribute('aria-pressed'))).toEqual(
          index === 0 ? ['true', 'false'] : ['false', 'true'],
        );
        expect(reading.scrollTop).toBe(0);
        expect(reading.querySelector('.source-path')?.textContent).toBe(path);
        expect(
          reading.querySelector('app-document-reader')?.getAttribute('data-reader-state'),
        ).toBe(status);
        expect(reading.textContent).toContain('Fixture availability');
        expect(fixture.componentInstance.reader()).toMatchObject({
          selection: { document: task.documents[index], requirement, task },
          response: { path, status },
        });
        http.expectNone((req) => req.url === '/api/document');
      }
    });
  }

  it('opens the index, enters tasks directly, and returns without remembering a task document', async () => {
    const value = workspace();
    const requirement = value.requirements[0];
    const secondPath = '.worktree/requirements/REQ-003/req.md';
    value.requirements.push({
      id: 'REQ-003',
      title: 'Another requirement',
      document: document(secondPath, 'requirement', false),
      tasks: [],
      taskOrder: [],
    });
    const fixture = await load(value);
    const host: HTMLElement = fixture.nativeElement;
    const http = TestBed.inject(HttpTestingController);
    expect(host.querySelector('[aria-label="Requirement index"]')).not.toBeNull();
    http.expectNone((request) => request.url === '/api/document');
    async function open(path: string, missing = false) {
      const button = host.querySelector<HTMLButtonElement>(`button[data-document-path="${path}"]`)!;
      expect(button.disabled).toBe(false);
      button.click();
      await fixture.whenStable();
      const request = http.expectOne(
        (req) => req.url === '/api/document' && req.params.get('path') === path,
      );
      if (missing)
        request.flush(
          { path, status: 'missing', error: 'Missing' },
          { status: 404, statusText: 'Not Found' },
        );
      else request.flush({ path, status: 'ok', source: '# Readable' });
      await fixture.whenStable();
      expect(host.querySelector('.source-path')?.textContent).toBe(path);
    }
    const [first, second] = requirement.tasks;
    await open(first.documents[0].path);
    expect(host.querySelector('[aria-label="Requirement index"]')).toBeNull();
    await open(second.documents[0].path);
    expect(fixture.componentInstance.reader()).toMatchObject({
      selection: { requirement, task: second },
    });
    await open(second.documents[1].path, true);
    expect(host.querySelector('app-document-reader')?.getAttribute('data-reader-state')).toBe(
      'missing',
    );
    await open(secondPath, true);
    expect(host.querySelector('app-document-reader')?.getAttribute('data-reader-state')).toBe(
      'missing',
    );
    await open(requirement.document.path);
    expect(fixture.componentInstance.reader()).toMatchObject({
      selection: { requirement, task: null },
    });
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'All requirements')!
      .click();
    await fixture.whenStable();
    expect(host.querySelector('[aria-label="Requirement index"]')).not.toBeNull();
    expect(fixture.componentInstance.reader()).toEqual({ status: 'idle' });
    http.expectNone((request) => request.url === '/api/document');
  });

  it('keeps the project document reachable with zero requirements', async () => {
    const value = { ...workspace(), requirements: [] };
    const fixture = await load(value);
    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent).toContain('No requirements found.');
    host.querySelector<HTMLButtonElement>('button[data-document-path]')!.click();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.params.get('path') === value.document.path)
      .flush({ path: value.document.path, status: 'ok', source: '# Project' });
    await fixture.whenStable();
    expect(host.querySelector('app-document-reader h1')?.textContent).toBe('Project');
    expect(host.querySelector('.task-strip')).toBeNull();
    expect(fixture.componentInstance.reader()).toMatchObject({
      selection: { requirement: null, task: null },
    });
  });

  it('does not misrepresent an API failure as a no-argument welcome', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/workspace')
      .flush({ error: 'unavailable' }, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Workspace information could not be loaded',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Welcome to Worktree');
  });
});
