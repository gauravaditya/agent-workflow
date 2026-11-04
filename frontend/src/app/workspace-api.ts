import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { WorkspaceResponse } from './workspace';

@Service()
export class WorkspaceApi {
  private readonly http = inject(HttpClient);

  read() {
    return this.http.get<WorkspaceResponse>('/api/workspace');
  }
}
