export const AUTH_COOKIE_NAME = "orchard_password_auth";

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) {
    return undefined;
  }
  return process.env[name];
}

export function getAuthCookieValue(): string {
  return readEnv("APP_AUTH_COOKIE_VALUE") ?? "orchard-authenticated";
}

export function getAppPassword(): string {
  return readEnv("APP_PASSWORD") ?? "Orchardagents123";
}
