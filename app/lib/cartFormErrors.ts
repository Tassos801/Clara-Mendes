const DEFAULT_CART_ERROR = 'We could not update the cart. Please try again.';

export function getCartFormErrorMessages(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];

  const errors = (data as {errors?: unknown}).errors;
  if (!Array.isArray(errors)) return [];

  return errors.map(formatCartFormError);
}

function formatCartFormError(error: unknown) {
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const message = (error as {message?: unknown}).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  return DEFAULT_CART_ERROR;
}
