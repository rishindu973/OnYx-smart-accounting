export type ApiNotification = {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  code?: string;
};

export class HttpError extends Error {
  public status: number;
  public code: string;
  public notification?: ApiNotification;
  public details?: unknown;

  constructor(args: { status: number; code: string; message: string; notification?: ApiNotification; details?: unknown }) {
    super(args.message);
    this.name = "HttpError";
    this.status = args.status;
    this.code = args.code;
    this.notification = args.notification;
    this.details = args.details;
  }
}

export function isHttpError(e: unknown): e is HttpError {
  return typeof e === "object" && e !== null && (e as any).name === "HttpError";
}
