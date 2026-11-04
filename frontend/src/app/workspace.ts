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
  document: WorkspaceDocument;
  requirement: WorkspaceRequirement | null;
  task: WorkspaceTask | null;
}
