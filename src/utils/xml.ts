import { format } from "date-fns";
import { kebabCase } from "lodash";

/** A value that can be serialized to a string */
export type Value =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Value[]
  | { [key: string]: Value };

export function objectToXML(attributes: Record<string, Value>) {
  function convertValue(key: string, value: Value): string | undefined {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && !value.trim())
    ) {
      return undefined;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return undefined;
      }
      return value.map((item) => convertValue(key, item)).join("\n");
    }

    if (value instanceof Date) {
      value = format(value, "yyyy-MM-dd HH:mm");
    }

    if (typeof value === "object") {
      value = objectToXML(value);
    }

    const tag = kebabCase(key);

    value = String(value);
    if (value.includes("\n")) {
      return `<${tag}>\n${value}\n</${tag}>`;
    }

    return `<${tag}>${value}</${tag}>`;
  }

  return Object.entries(attributes)
    .map(([key, value]) => convertValue(key, value))
    .filter(Boolean)
    .join("\n");
}
