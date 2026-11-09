import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { catchError, map, of, throwError } from 'rxjs';
import { DocumentResponse } from './document-response';
import { WorkspaceResponse } from './workspace';

@Service()
export class WorkspaceApi {
  private readonly http = inject(HttpClient);

  read() {
    return this.http.get<WorkspaceResponse>('/api/workspace');
  }

  readDocument(path: string) {
    return this.http.get<unknown>('/api/document', { params: { path }, observe: 'response' }).pipe(
      map((response) => this.documentResponse(response.body, response.status, path)),
      catchError((failure: unknown) => {
        if (failure instanceof HttpErrorResponse && failure.status !== 0) {
          return of(this.documentResponse(failure.error, failure.status, path));
        }
        return throwError(() => failure);
      }),
    );
  }

  private documentResponse(body: unknown, code: number, requested: string): DocumentResponse {
    const invalid = () => new Error('Unexpected document response');
    if (typeof body !== 'object' || body === null) throw invalid();
    const value = body as Record<string, unknown>;
    const status = value['status'];
    if (status === 'ok') {
      if (
        code !== 200 ||
        value['path'] !== requested ||
        typeof value['source'] !== 'string' ||
        'error' in value
      )
        throw invalid();
      return { path: requested, status, source: value['source'] };
    }
    let codes: number[];
    switch (status) {
      case 'missing':
        codes = [404];
        break;
      case 'unreadable':
        codes = [403, 500];
        break;
      case 'unsupported':
        codes = [400, 405];
        break;
      case 'forbidden':
        codes = [403];
        break;
      default:
        throw invalid();
    }
    if (
      !codes.includes(code) ||
      (value['path'] !== requested && !(status === 'unsupported' && value['path'] === null)) ||
      typeof value['error'] !== 'string' ||
      !value['error'].trim() ||
      'source' in value
    )
      throw invalid();
    return body as DocumentResponse;
  }
}
