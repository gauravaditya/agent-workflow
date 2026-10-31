import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { ApiExample } from './api-example';

@Component({
  imports: [],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly message = toSignal(
    inject(ApiExample)
      .read()
      .pipe(
        map((response) => response.message),
        catchError(() => of('Connection unavailable.')),
      ),
    { initialValue: 'Connecting…' },
  );
}
