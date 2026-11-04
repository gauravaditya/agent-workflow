import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiExample } from './api-example';

describe('foundation exchange API', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('receives the Go response', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    let message = '';
    TestBed.inject(ApiExample)
      .read()
      .subscribe((response) => {
        message = response.message;
      });
    const request = TestBed.inject(HttpTestingController).expectOne('/api/example');
    expect(request.request.method).toBe('GET');
    request.flush({ message: 'Connected to Go.' });
    expect(message).toBe('Connected to Go.');
  });

  it('reports exchange failure without pretending it succeeded', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    let succeeded = false;
    let failed = false;
    TestBed.inject(ApiExample)
      .read()
      .subscribe({
        next: () => {
          succeeded = true;
        },
        error: () => {
          failed = true;
        },
      });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/example')
      .flush({ error: 'not available' }, { status: 503, statusText: 'Unavailable' });
    expect(failed).toBe(true);
    expect(succeeded).toBe(false);
  });
});
