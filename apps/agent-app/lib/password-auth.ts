export const AUTH_COOKIE_NAME = "orchard_password_auth";
export const AUTH_COOKIE_VALUE = "orchard-authenticated";

export function getAppPassword(): string {
  return process.env.APP_PASSWORD ?? "Orchardagents123";
}
