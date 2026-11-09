// GET /api/document echoes the exact decoded request path, never a replacement.
// Empty source is a successful read; meaningful-content classification is UI work.
export type DocumentResponse =
  | {
      path: string;
      status: 'ok';
      source: string;
      error?: never;
    }
  | {
      path: string;
      status: 'missing' | 'unreadable' | 'forbidden';
      error: string;
      source?: never;
    }
  | {
      // Null is reserved for requests without one unambiguous path value.
      path: string | null;
      status: 'unsupported';
      error: string;
      source?: never;
    };
