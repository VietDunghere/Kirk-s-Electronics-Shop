// domain — error a domain rule raises (stock limit, item not in cart...). The service turns it into an HTTP error.
export class DomainError extends Error {
  constructor(message: string, public readonly notFound = false) {
    super(message);
  }
}
