/* eslint-disable no-console */

export function log(tag: string, message?: unknown, extra?: unknown): void {
  if (extra !== undefined) {
    console.log(`[${tag}] ${message}`, extra);
  } else if (message !== undefined) {
    console.log(`[${tag}] ${message}`);
  } else {
    console.log(`[${tag}]`);
  }
}
