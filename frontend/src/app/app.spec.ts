import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('foundation exchange', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('presents the Go response', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/example');
    expect(request.request.method).toBe('GET');
    request.flush({ message: 'Connected to Go.' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Connected to Go.');
  });

  it('shows exchange failure without pretending it succeeded', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/example')
      .flush({ error: 'not available' }, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Connection unavailable.');
    expect(fixture.nativeElement.textContent).not.toContain('Connected to Go.');
  });
});
