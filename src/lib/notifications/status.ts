export function isTerminalNotificationEmailStatus(status: string) {
  return status === "SENT" || status === "SKIPPED";
}
