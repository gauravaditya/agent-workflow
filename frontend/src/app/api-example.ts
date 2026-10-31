import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';

@Service()
export class ApiExample {
  private readonly http = inject(HttpClient);

  read() {
    return this.http.get<{ message: string }>('/api/example');
  }
}
