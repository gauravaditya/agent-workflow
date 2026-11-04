import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { DocumentChoice } from './document-choice';
import {
  DocumentSelection,
  WorkspaceDocument,
  WorkspaceRequirement,
  WorkspaceTask,
} from './workspace';
import { WorkspaceApi } from './workspace-api';

@Component({
  imports: [DocumentChoice],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly state = toSignal(
    inject(WorkspaceApi)
      .read()
      .pipe(
        map((response) => ({ workspace: response.workspace, loaded: true, error: false })),
        catchError(() => of({ workspace: null, loaded: true, error: true })),
      ),
    { initialValue: { workspace: null, loaded: false, error: false } },
  );
  protected readonly navigationOpen = signal(true);
  protected readonly selected = signal<DocumentSelection | null>(null);

  protected select(
    document: WorkspaceDocument,
    requirement: WorkspaceRequirement | null = null,
    task: WorkspaceTask | null = null,
  ) {
    if (document.readable) {
      this.selected.set({ document, requirement, task });
    }
  }
}
