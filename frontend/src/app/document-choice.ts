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
      display: block;
      width: 100%;
      padding: 0.55rem 0.65rem;
      border: 0;
      border-left: 3px solid transparent;
      background: transparent;
      text-align: left;
      color: inherit;
      font: inherit;
      font-size: 0.9rem;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: #e6ebe5;
    }
    button[aria-current] {
      background: #e2e9e0;
      border-left-color: #315447;
      font-weight: 600;
    }
    button:focus-visible {
      outline: 2px solid #315447;
      outline-offset: -2px;
    }
    button:disabled {
      opacity: 0.55;
      cursor: default;
    }
    small {
      display: block;
      font-weight: 400;
    }
  `,
  template: `
    <button
      type="button"
      [disabled]="!document().readable"
      [attr.data-document-path]="document().path"
      [attr.aria-current]="selected() ? 'page' : null"
      [title]="document().path"
      (click)="pick.emit(document())"
    >
      {{ label() }}
      @if (!document().readable) {
        <small>Unavailable</small>
      }
    </button>
  `,
})
export class DocumentChoice {
  readonly document = input.required<WorkspaceDocument>();
  readonly label = input.required<string>();
  readonly selected = input(false);
  readonly pick = output<WorkspaceDocument>();
}
