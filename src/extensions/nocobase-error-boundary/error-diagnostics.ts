export type PortalErrorDiagnosticContext = {
  componentStack?: string | null;
  occurredAt?: string;
  route?: string;
  templateName?: string;
  templateVersion?: string;
};

export type NormalizedPortalError = {
  message: string;
  name: string;
  stack?: string;
};

const UNKNOWN_ERROR_MESSAGE = "An unknown error occurred.";

const readStringProperty = (value: object, property: string) => {
  try {
    const candidate = (value as Record<string, unknown>)[property];
    return typeof candidate === "string" ? candidate : undefined;
  } catch {
    return undefined;
  }
};

export function normalizePortalError(error: unknown): NormalizedPortalError {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || UNKNOWN_ERROR_MESSAGE,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { name: "Error", message: error || UNKNOWN_ERROR_MESSAGE };
  }

  if (error && typeof error === "object") {
    return {
      name: readStringProperty(error, "name") || "Error",
      message: readStringProperty(error, "message") || UNKNOWN_ERROR_MESSAGE,
      stack: readStringProperty(error, "stack"),
    };
  }

  return {
    name: "Error",
    message:
      error === null || typeof error === "undefined"
        ? UNKNOWN_ERROR_MESSAGE
        : String(error),
  };
}

export function redactPortalErrorText(value: string) {
  return value
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(
      /^(\s*(?:authorization|cookie|set-cookie)\s*:).*$/gim,
      "$1 [REDACTED]"
    )
    .replace(
      /([?&](?:access[_-]?token|refresh[_-]?token|token|api[_-]?key|password|secret)=)[^&#\s]+/gi,
      "$1[REDACTED]"
    )
    .replace(
      /((?:access[_-]?token|refresh[_-]?token|api[_-]?key|password|secret)\s*[:=]\s*)[^,;\n]+/gi,
      "$1[REDACTED]"
    )
    .replace(/(https?:\/\/[^\s?#]+)\?[^#\s]*/gi, "$1?[REDACTED]");
}

const appendDiagnosticLine = (
  lines: string[],
  label: string,
  value?: string | null
) => {
  if (value) lines.push(`${label}: ${redactPortalErrorText(value)}`);
};

export function formatPortalErrorDiagnostic(
  error: unknown,
  context: PortalErrorDiagnosticContext = {}
) {
  const normalized = normalizePortalError(error);
  const lines = ["Portal runtime error", ""];

  appendDiagnosticLine(lines, "Time", context.occurredAt);
  appendDiagnosticLine(
    lines,
    "Route",
    context.route?.replace(/[?#].*$/, "")
  );
  if (context.templateName || context.templateVersion) {
    appendDiagnosticLine(
      lines,
      "Template",
      [context.templateName, context.templateVersion]
        .filter(Boolean)
        .join(" ")
    );
  }

  lines.push(
    "",
    redactPortalErrorText(`${normalized.name}: ${normalized.message}`)
  );

  if (normalized.stack) {
    lines.push(
      "",
      "JavaScript stack:",
      redactPortalErrorText(normalized.stack)
    );
  }
  if (context.componentStack) {
    lines.push(
      "",
      "React component stack:",
      redactPortalErrorText(context.componentStack)
    );
  }

  return lines.join("\n");
}
