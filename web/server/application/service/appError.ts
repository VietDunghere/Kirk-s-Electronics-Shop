// application.service — error a service raises; the controller turns it into an HTTP response.
export class AppError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}
