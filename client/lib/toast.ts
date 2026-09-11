import { toast as sonner } from "sonner";

/*
 * A thin, typed facade over sonner.
 *
 * The app previously used window.alert() for every success and
 * failure, which blocks the page, cannot be styled, and on mobile
 * looks like a browser warning rather than part of the product.
 */
export const toast = {
  success(message: string, description?: string) {
    sonner.success(message, { description });
  },

  error(message: string, description?: string) {
    sonner.error(message, { description });
  },

  info(message: string, description?: string) {
    sonner(message, { description });
  },

  warning(message: string, description?: string) {
    sonner.warning(message, { description });
  },

  /* Shows pending / success / failure for an in-flight request. */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((value: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) {
    return sonner.promise(promise, messages);
  },
};
