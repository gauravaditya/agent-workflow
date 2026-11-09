import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { WorkspaceApi } from './workspace-api';

describe('workspace document API', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests one exactly preserved path and accepts an empty successful source', async () => {
    const path = 'notes/Topic café %2e&+.md';
    const result = firstValueFrom(TestBed.inject(WorkspaceApi).readDocument(path));
    const request = TestBed.inject(HttpTestingController).expectOne(
      (request) => request.url === '/api/document',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.getAll('path')).toEqual([path]);
    expect(
      new URL(request.request.urlWithParams, 'http://localhost').searchParams.get('path'),
    ).toBe(path);
    request.flush({ path, status: 'ok', source: '' });
    expect(await result).toEqual({ path, status: 'ok', source: '' });
  });

  it('preserves the typed missing response instead of treating it as a transport failure', async () => {
    const path = '.worktree/requirements/REQ-002/req.md';
    const result = firstValueFrom(TestBed.inject(WorkspaceApi).readDocument(path));
    const request = TestBed.inject(HttpTestingController).expectOne(
      (request) => request.url === '/api/document',
    );
    const response = { path, status: 'missing', error: 'Document not found' };
    request.flush(response, { status: 404, statusText: 'Not found' });
    expect(await result).toEqual(response);
  });

  it('retains the exact original source including NUL, comments and line endings', async () => {
    const path = 'notes/topic.md';
    const source = '# Topic\r\n<!-- source -->\n\x00';
    const result = firstValueFrom(TestBed.inject(WorkspaceApi).readDocument(path));
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url === '/api/document')
      .flush({ path, status: 'ok', source });
    expect(await result).toEqual({ path, status: 'ok', source });
  });

  for (const [status, code] of [
    ['unreadable', 403],
    ['unreadable', 500],
    ['unsupported', 400],
    ['unsupported', 405],
    ['forbidden', 403],
  ] as const) {
    it(`preserves ${code}/${status} without interpreting its reason`, async () => {
      const path = 'notes/topic.md';
      const result = firstValueFrom(TestBed.inject(WorkspaceApi).readDocument(path));
      const response = { path, status, error: 'Reason text does not determine availability' };
      TestBed.inject(HttpTestingController)
        .expectOne((request) => request.url === '/api/document')
        .flush(response, { status: code, statusText: 'Failure' });
      expect(await result).toEqual(response);
    });
  }

  it('retains null identity for an unsupported malformed request result', async () => {
    const result = firstValueFrom(TestBed.inject(WorkspaceApi).readDocument(''));
    const response = { path: null, status: 'unsupported', error: 'Empty request path' };
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url === '/api/document')
      .flush(response, { status: 400, statusText: 'Bad request' });
    expect(await result).toEqual(response);
  });

  for (const [name, code, body] of [
    ['wrong identity', 200, { path: 'other.md', status: 'ok', source: 'wrong content' }],
    ['null source', 200, { path: 'a.md', status: 'ok', source: null }],
    ['missing source', 200, { path: 'a.md', status: 'ok' }],
    ['mixed success', 200, { path: 'a.md', status: 'ok', source: '', error: 'wrong' }],
    ['mixed failure', 404, { path: 'a.md', status: 'missing', error: 'missing', source: '' }],
    ['inconsistent HTTP status', 200, { path: 'a.md', status: 'missing', error: 'missing' }],
    ['unknown status', 500, { path: 'a.md', status: 'other', error: 'wrong' }],
    ['non-JSON failure', 502, '<html>Proxy failure</html>'],
  ] as const) {
    it(`rejects ${name} rather than assigning content or availability to the request`, async () => {
      const result = firstValueFrom(TestBed.inject(WorkspaceApi).readDocument('a.md'));
      const rejection = expect(result).rejects.toThrow('Unexpected document response');
      TestBed.inject(HttpTestingController)
        .expectOne((request) => request.url === '/api/document')
        .flush(body, { status: code, statusText: 'Response' });
      await rejection;
    });
  }

  it('keeps network failures outside the filesystem availability outcomes', async () => {
    const result = firstValueFrom(TestBed.inject(WorkspaceApi).readDocument('a.md'));
    const rejection = expect(result).rejects.toMatchObject({ status: 0 });
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url === '/api/document')
      .error(new ProgressEvent('error'));
    await rejection;
  });
});
