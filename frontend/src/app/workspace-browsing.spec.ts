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
    const reading = host.querySelector<HTMLElement>('[aria-label="Document selection"]')!;
    reading.scrollTop = 75;
    expect(reading.textContent).toContain('TASK-004');
    expect(reading.textContent).toContain(choice.dataset['documentPath']);
    const toggle = host.querySelector<HTMLButtonElement>('[aria-controls="workspace-navigation"]')!;
    toggle.click();
    await fixture.whenStable();
    expect(host.querySelector<HTMLElement>('#workspace-navigation')!.hidden).toBe(true);
    toggle.click();
    await fixture.whenStable();
    expect(host.querySelector('[aria-label="Document selection"]')).toBe(reading);
    expect(reading.scrollTop).toBe(75);
    expect(choice.getAttribute('aria-current')).toBe('page');
    expect(host.textContent).toContain('Missing required section: Scope');
    expect(
      host.querySelector<HTMLButtonElement>(
        'button[data-document-path$="TASK-004/implementation.md"]',
      )!.disabled,
    ).toBe(true);
    expect(reading.textContent).toContain('Document reading will be available');
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
