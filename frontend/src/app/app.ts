import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, Subscription, switchMap } from 'rxjs';
import { DocumentChoice } from './document-choice';
import { DocumentReader, FragmentNavigation } from './document-reader';
import { markdownDestination } from './document-markdown';
import {
  DocumentReadState,
  DocumentSelection,
  WorkspaceRequirement,
  WorkspaceTask,
} from './workspace';
import { WorkspaceApi } from './workspace-api';

@Component({
  imports: [DocumentChoice, DocumentReader],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly injector = inject(Injector);
  private readonly reading = viewChild<ElementRef<HTMLElement>>('reading');
  private readonly api = inject(WorkspaceApi);
  protected readonly state = toSignal(
    this.api.read().pipe(
      map((response) => ({ workspace: response.workspace, loaded: true, error: false })),
      catchError(() => of({ workspace: null, loaded: true, error: true })),
    ),
    { initialValue: { workspace: null, loaded: false, error: false } },
  );
  protected readonly navigationOpen = signal(true);
  protected readonly selected = signal<DocumentSelection | null>(null);
  protected readonly sequentialNavigation = computed(() => {
    const selection = this.selected();
    const workspace = this.state().workspace;
    if (!selection || !workspace) return null;

    const { document, requirement, task } = selection;
    if (
      (document.kind !== 'task' && document.kind !== 'implementation') ||
      !requirement?.taskOrder ||
      !workspace.requirements.includes(requirement) ||
      !task ||
      !requirement.tasks.includes(task) ||
      !task.documents.includes(document)
    )
      return null;

    const order = requirement.taskOrder;
    const index = order.indexOf(task.id);
    if (index === -1) return null;

    const destination = (id: string | undefined) => {
      const neighbour = requirement.tasks.find((candidate) => candidate.id === id);
      const brief = neighbour?.documents.find((candidate) => candidate.kind === document.kind);
      return neighbour && brief?.readable ? { task: neighbour, document: brief } : null;
    };
    const previous = destination(order[index - 1]);
    const next = destination(order[index + 1]);
    return previous || next ? { requirement, previous, next } : null;
  });
  protected readonly breadcrumbs = computed(() => {
    const workspace = this.state().workspace;
    const selection = this.selected();
    if (!workspace || !selection || selection.document.kind === 'standalone') return [];
    const ancestors = [{ label: workspace.name, document: workspace.document }];
    const requirement = workspace.requirements.find((parent) => parent === selection.requirement);
    const task = requirement?.tasks.find((child) => child === selection.task);
    const taskDocument = task?.documents.some((document) => document === selection.document);
    // Use only the discovery snapshot's established relationships, not IDs,
    // titles or retained context supplied for an unrelated document.
    if (!requirement || (selection.document !== requirement.document && !taskDocument))
      return ancestors;
    ancestors.push({ label: requirement.id, document: requirement.document });
    const brief = taskDocument
      ? task?.documents.find((document) => document.kind === 'task')
      : undefined;
    if (brief) ancestors.push({ label: task!.id, document: brief });
    return ancestors;
  });
  protected readonly navigationMessage = signal<string | null>(null);
  protected readonly fragmentNavigation = signal<FragmentNavigation | null>(null);
  private readonly linkedRead = signal<Extract<DocumentReadState, { status: 'received' }> | null>(
    null,
  );
  private linkRequest?: Subscription;
  private navigationToken = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelNavigation());
    afterRenderEffect(() => {
      const selection = this.selected();
      const reading = this.reading()?.nativeElement;
      if (reading && selection && untracked(this.fragmentNavigation)?.selection !== selection) {
        reading.scrollTop = 0;
      }
    });
  }

  protected toggleNavigation() {
    const reading = this.reading()?.nativeElement;
    const selection = this.selected();
    const position = reading?.scrollTop;
    this.navigationOpen.update((open) => !open);
    afterNextRender(
      () => {
        if (reading && position !== undefined && this.selected() === selection) {
          reading.scrollTop = position;
        }
      },
      { injector: this.injector },
    );
  }

  protected navigationTitle(id: string, title: string) {
    const prefix = id + ' — ';
    if (title === id) return '';
    return title.startsWith(prefix) ? title.slice(prefix.length) : title;
  }

  private readonly requested = toSignal(
    toObservable(this.selected).pipe(
      switchMap((selection) => {
        if (!selection) return of<DocumentReadState>({ status: 'idle' });
        const confirmed = this.linkedRead();
        if (confirmed?.selection === selection) return of<DocumentReadState>(confirmed);
        return this.api.readDocument(selection.document.path).pipe(
          map((response): DocumentReadState => ({ status: 'received', selection, response })),
          startWith<DocumentReadState>({ status: 'loading', selection }),
          catchError(() =>
            of<DocumentReadState>({
              status: 'request-error',
              selection,
              error: 'Check that Worktree is running, then select the document again.',
            }),
          ),
        );
      }),
    ),
    { initialValue: { status: 'idle' } as DocumentReadState },
  );

  readonly reader = computed<DocumentReadState>(() => {
    const selection = this.selected();
    if (!selection) return { status: 'idle' };
    const confirmed = this.linkedRead();
    const result = confirmed?.selection === selection ? confirmed : this.requested();
    // Signal-to-observable delivery is scheduled. Hide old results even before
    // switchMap receives the new selection and cancels the previous request.
    return result.status !== 'idle' && result.selection === selection
      ? result
      : { status: 'loading', selection };
  });

  select(
    document: DocumentSelection['document'],
    requirement: WorkspaceRequirement | null = null,
    task: WorkspaceTask | null = null,
  ) {
    this.cancelNavigation();
    this.linkedRead.set(null);
    if (document.kind === 'standalone') {
      const previous = this.selected();
      requirement ??= previous?.requirement ?? null;
      if (!task && requirement?.id === previous?.requirement?.id) {
        task = previous?.task ?? null;
      }
      if (task && !requirement?.tasks.includes(task)) {
        task = null;
      }
    }
    // Explicit requests retain identity even when discovery found them
    // unavailable. The Go reader determines their current access result.
    this.selected.set({ document, requirement, task });
  }

  protected showRequirements() {
    this.cancelNavigation();
    this.linkedRead.set(null);
    this.selected.set(null);
  }

  private cancelNavigation() {
    this.navigationToken++;
    this.linkRequest?.unsubscribe();
    this.linkRequest = undefined;
    this.fragmentNavigation.set(null);
    this.navigationMessage.set(null);
  }

  openAncestor(document: DocumentSelection['document']) {
    const selection = this.selected();
    const workspace = this.state().workspace;
    if (
      !selection ||
      !workspace ||
      (document !== workspace.document &&
        !this.breadcrumbs().some((item) => item.document === document))
    )
      return;
    const source = selection.document.path.split('/').slice(0, -1);
    const target = document.path.split('/');
    while (source.length && target.length && source[0] === target[0]) {
      source.shift();
      target.shift();
    }
    const destination = [...source.map(() => '..'), ...target].map(encodeURIComponent).join('/');
    // Reuse 5B's confirmed-read transition and cancellation. Unavailable
    // ancestors preserve the current document rather than selecting a fallback.
    this.followDocument({ selection, destination });
  }

  followDocument(link: { selection: DocumentSelection; destination: string }) {
    if (this.selected() !== link.selection) return;
    this.cancelNavigation();
    const token = this.navigationToken;
    const destination = markdownDestination(link.destination, link.selection.document.path);
    if (destination.kind === 'external' || destination.kind === 'browser') return;
    if (destination.kind === 'blocked') {
      this.navigationMessage.set(destination.reason);
      return;
    }
    if (destination.kind === 'fragment') {
      this.fragmentNavigation.set({
        selection: link.selection,
        fragment: destination.fragment,
        token,
      });
      return;
    }
    const current = () => this.navigationToken === token && this.selected() === link.selection;
    this.linkRequest = this.api.readDocument(destination.path).subscribe({
      next: (response) => {
        if (!current()) return;
        if (response.status !== 'ok') {
          this.navigationMessage.set(`Destination ${response.status}: ${response.error}`);
          return;
        }
        const workspace = this.state().workspace!;
        let document: DocumentSelection['document'] = {
          path: destination.path,
          kind: 'standalone',
          title: destination.path.split('/').at(-1)!,
        };
        let requirement: WorkspaceRequirement | null = null;
        let task: WorkspaceTask | null = null;
        if (workspace.document.path === destination.path) document = workspace.document;
        for (const parent of workspace.requirements) {
          if (parent.document.path === destination.path) {
            document = parent.document;
            requirement = parent;
          }
          for (const child of parent.tasks) {
            const found = child.documents.find((candidate) => candidate.path === destination.path);
            if (found) {
              document = found;
              requirement = parent;
              task = child;
            }
          }
        }
        this.select(document, requirement, task);
        const selection = this.selected()!;
        // A response is cached only for this selection object. This is read
        // state, not another selection authority, and avoids a second GET.
        this.linkedRead.set({ status: 'received', selection, response });
        if (destination.fragment !== null) {
          this.fragmentNavigation.set({
            selection,
            fragment: destination.fragment,
            token: this.navigationToken,
          });
        }
      },
      error: () => {
        if (current())
          this.navigationMessage.set('Unable to load destination. Check that Worktree is running.');
      },
    });
  }

  sectionMissing(request: FragmentNavigation) {
    if (this.fragmentNavigation() === request && this.selected() === request.selection) {
      this.navigationMessage.set('Section not found in this document.');
    }
  }
}
