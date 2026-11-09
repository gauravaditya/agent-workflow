import type { DocumentResponse } from './document-response';

export interface WorkspaceDocument {
  path: string;
  kind: 'project' | 'requirement' | 'task' | 'implementation';
  title: string;
  readable: boolean;
  templateValid: boolean;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  documents: WorkspaceDocument[];
}

export interface WorkspaceRequirement {
  id: string;
  title: string;
  document: WorkspaceDocument;
  tasks: WorkspaceTask[];
  // Only this field expresses source-authoritative task order. Null means
  // missing/ambiguous ordering; the sidebar can still show physical artifacts.
  taskOrder: string[] | null;
}

export interface Workspace {
  name: string;
  document: WorkspaceDocument;
  requirements: WorkspaceRequirement[];
  issues: { path: string; message: string }[];
}

export interface WorkspaceResponse {
  workspace: Workspace | null;
}

export interface DocumentSelection {
  document: WorkspaceDocument | { path: string; kind: 'standalone'; title: string };
  requirement: WorkspaceRequirement | null;
  task: WorkspaceTask | null;
}

// Associate results with a selection object, including repeated requests for
// the same path. This is not another selection authority.
export type DocumentReadState =
  | { status: 'idle' }
  | { status: 'loading'; selection: DocumentSelection }
  | { status: 'received'; selection: DocumentSelection; response: DocumentResponse }
  | { status: 'request-error'; selection: DocumentSelection; error: string };
