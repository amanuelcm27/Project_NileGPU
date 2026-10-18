/** Tiny class-name joiner — avoids pulling in a dependency for string concat. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
