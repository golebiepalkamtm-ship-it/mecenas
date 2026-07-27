export function logInfo(message: string, ...args: any[]): void {
  console.error(`[INFO] ${message}`, ...args);
}

export function logError(message: string, ...args: any[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}
