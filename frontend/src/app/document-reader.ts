import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { markdownDestination, renderDocumentMarkdown } from './document-markdown';
import { analyzeDocument } from './document-template';
import { DocumentReadState, DocumentSelection } from './workspace';

export interface FragmentNavigation {
  selection: DocumentSelection;
  fragment: string;
  token: number;
}

@Component({
  selector: 'app-document-reader',
  host: {
    '[attr.data-reader-state]': 'availability()',
    '[attr.aria-busy]': 'state().status === "loading"',
  },
  styles: `
    :host {
      display: block;
    }
    .markdown {
      line-height: 1.8;
      overflow-wrap: anywhere;
      overflow-x: auto;
    }
    .document-metadata {
      font-size: 0.925em;
      border-block-end: 1px solid var(--line);
    }
    .document-header,
    .document-section {
      display: flow-root;
    }
    .requirement [data-section='Intent'],
    .task [data-section='Purpose'],
    .implementation [data-section='Objective'] {
      font-size: 1.0625em;
    }
    .requirement [data-section='Desired outcome'],
    .task [data-section='Expected outcome'],
    .task [data-section='Implementation brief'],
    .implementation [data-section='Constraints and exclusions'] {
      border-inline-start: 1px solid var(--line);
      padding-inline-start: 0.85rem;
    }
  `,
  template: `
    @let read = state();
    @switch (read.status) {
      @case ('loading') {
        <p role="status">Loading {{ label().toLowerCase() }}…</p>
      }
      @case ('request-error') {
        <h3>Unable to load {{ label().toLowerCase() }}</h3>
        <p role="alert">{{ read.error }}</p>
      }
      @case ('received') {
        @switch (read.response.status) {
          @case ('ok') {
            @if (content(); as document) {
              <div
                #markdown
                class="markdown"
                (click)="activate($event)"
                (auxclick)="activate($event)"
                (keydown.enter)="activate($event)"
              >
                @if (document.formattingError) {
                  <p role="status">{{ document.formattingError }}</p>
                }
                @if (document.presentation === 'general') {
                  <div [innerHTML]="document.html"></div>
                } @else {
                  <article [class]="document.presentation">
                    @for (region of document.regions; track region.range.start) {
                      @switch (region.kind) {
                        @case ('header') {
                          <header class="document-header" [innerHTML]="region.html"></header>
                        }
                        @case ('metadata') {
                          <div class="document-metadata" [innerHTML]="region.html"></div>
                        }
                        @case ('section') {
                          <section
                            class="document-section"
                            [attr.data-section]="region.label"
                            [innerHTML]="region.html"
                          ></section>
                        }
                      }
                    }
                  </article>
                }
              </div>
            } @else {
              <h3>{{ label() }} is empty</h3>
            }
          }
          @case ('missing') {
            <h3>{{ label() }} not found</h3>
            <p role="alert">{{ read.response.error }}</p>
          }
          @case ('unreadable') {
            <h3>Unable to read {{ label().toLowerCase() }}</h3>
            <p role="alert">{{ read.response.error }}</p>
          }
          @case ('unsupported') {
            <h3>Unsupported document destination</h3>
            <p role="alert">{{ read.response.error }}</p>
          }
          @case ('forbidden') {
            <h3>Document destination is unavailable</h3>
            <p role="alert">{{ read.response.error }}</p>
          }
        }
      }
    }
  `,
})
export class DocumentReader {
  readonly state = input.required<DocumentReadState>();
  readonly fragment = input<FragmentNavigation | null>(null);
  readonly follow = output<{ selection: DocumentSelection; destination: string }>();
  readonly sectionMissing = output<FragmentNavigation>();
  private readonly markdown = viewChild<ElementRef<HTMLDivElement>>('markdown');
  private completedFragment: FragmentNavigation | null = null;

  constructor() {
    afterRenderEffect(() => {
      const read = this.state();
      const root = this.markdown()?.nativeElement;
      const content = this.content();
      const headings = root ? [...root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')] : [];
      // Angular sanitizes innerHTML and strips IDs. Assign generated identifiers
      // through the DOM property, without bypassing HTML sanitization.
      headings.forEach((heading, index) => {
        heading.id = content?.headings[index] ?? '';
      });
      const request = this.fragment();
      if (
        !request ||
        request === this.completedFragment ||
        read.status !== 'received' ||
        read.response.status !== 'ok' ||
        read.selection !== request.selection
      )
        return;
      this.completedFragment = request;
      const target = headings.find((heading) => heading.id === request.fragment);
      if (target) target.scrollIntoView?.({ block: 'start' });
      else this.sectionMissing.emit(request);
    });
  }

  protected activate(event: Event) {
    const root = this.markdown()?.nativeElement;
    const anchor = event.target instanceof Element ? event.target.closest('a') : null;
    const read = this.state();
    if (
      !root ||
      !anchor ||
      !root.contains(anchor) ||
      read.status !== 'received' ||
      read.response.status !== 'ok'
    )
      return;
    const marker = [...anchor.classList].find((name) => /^worktree-link-\d+$/.test(name));
    const destination = marker
      ? this.content()?.links[Number(marker.slice('worktree-link-'.length))]
      : undefined;
    if (destination === undefined) {
      event.preventDefault();
      return;
    }
    const policy = markdownDestination(destination, read.selection.document.path);
    this.follow.emit({ selection: read.selection, destination });
    if (policy.kind === 'external' || policy.kind === 'browser') return;
    event.preventDefault();
  }

  protected readonly content = computed(() => {
    const read = this.state();
    if (read.status !== 'received' || read.response.status !== 'ok') return null;
    const analysis = analyzeDocument(read.response.source, read.selection.document);
    return analysis.meaningful ? renderDocumentMarkdown(analysis) : null;
  });

  protected readonly label = computed(() => {
    const read = this.state();
    if (read.status === 'idle') return 'Document';
    return {
      project: 'Project document',
      requirement: 'Requirement brief',
      task: 'Task brief',
      implementation: 'Implementation brief',
      standalone: 'Document',
    }[read.selection.document.kind];
  });

  protected readonly availability = computed(() => {
    const read = this.state();
    if (read.status !== 'received') return read.status;
    if (read.response.status !== 'ok') return read.response.status;
    return this.content() ? 'loaded' : 'empty';
  });
}
