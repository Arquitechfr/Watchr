import { Platform } from "react-native";

if (Platform.OS === "web") {
  if (!Array.prototype.at) {
    Array.prototype.at = function (n: number) {
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    };
  }

  if (!String.prototype.at) {
    String.prototype.at = function (n: number) {
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    };
  }
}
