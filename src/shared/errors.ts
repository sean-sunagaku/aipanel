export class AipanelError extends Error {
  code: string;

  details: unknown;

  constructor(
    message: string,
    {
      code = "AIPANEL_ERROR",
      details = null,
      cause = null,
    }: { code?: string; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, cause ? { cause } : undefined);
    this.name = "AipanelError";
    this.code = code;
    this.details = details;
  }
}
