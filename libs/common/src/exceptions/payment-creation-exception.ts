export class PaymentCreationException extends Error {
  constructor(message?: string) {
    super(message || 'Payment creation failed');
  }
}
