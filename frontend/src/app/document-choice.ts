import { Component, input, output } from '@angular/core';
import { WorkspaceDocument } from './workspace';

@Component({
  selector: 'app-document-choice',
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.4rem 0.65rem;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: var(--nav-muted);
      font: inherit;
      font-size: 0.85rem;
      font-weight: 500;
      text-align: start;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    button:hover {
      color: var(--accent);
    }
    button[aria-pressed='true'] {
      background: var(--accent);
      color: var(--paper);
      font-weight: 650;
    }
    button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .icon {
      inline-size: 16px;
      block-size: 16px;
      flex: 0 0 16px;
      background: currentColor;
      mask: url('/icons/file-text.svg') center / contain no-repeat;
    }
    .icon.implementation {
      mask-image: url('/icons/code-xml.svg');
    }
  `,
  template: `
    <button
      type="button"
      [attr.data-document-path]="document().path"
      [attr.aria-pressed]="selected()"
      [title]="document().path"
      (click)="pick.emit(document())"
    >
      <span
        class="icon"
        [class.implementation]="document().kind === 'implementation'"
        aria-hidden="true"
      ></span>
      {{ label() }}
    </button>
  `,
})
export class DocumentChoice {
  readonly document = input.required<WorkspaceDocument>();
  readonly label = input.required<string>();
  readonly selected = input(false);
  readonly pick = output<WorkspaceDocument>();
}
