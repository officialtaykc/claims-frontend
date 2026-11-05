import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string; error?: string } | null;
    return body?.message ?? body?.error ?? (error.status
      ? `The request failed (${error.status}). Check the backend connection and try again.`
      : 'The backend could not be reached. Check that the API is running on localhost:8080.');
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
