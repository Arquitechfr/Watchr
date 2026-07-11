/* eslint-disable no-console */

import { Platform } from "react-native";

export function log(tag: string, message?: unknown, extra?: unknown): void {
  if (!__DEV__ || Platform.OS === "web") return;
  if (extra !== undefined) {
    console.log(`[${tag}] ${message}`, extra);
  } else if (message !== undefined) {
    console.log(`[${tag}] ${message}`);
  } else {
    console.log(`[${tag}]`);
  }
}

export function warn(tag: string, message?: unknown, extra?: unknown): void {
  if (!__DEV__ || Platform.OS === "web") return;
  if (extra !== undefined) {
    console.warn(`[${tag}] ${message}`, extra);
  } else if (message !== undefined) {
    console.warn(`[${tag}] ${message}`);
  } else {
    console.warn(`[${tag}]`);
  }
}

export function error(tag: string, message?: unknown, extra?: unknown): void {
  if (extra !== undefined) {
    console.error(`[${tag}] ${message}`, extra);
  } else if (message !== undefined) {
    console.error(`[${tag}] ${message}`);
  } else {
    console.error(`[${tag}]`);
  }
}
