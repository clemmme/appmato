// Simple ID generator (no uuid dependency needed)
let counter = 0;
export function v4Fallback(): string {
  counter++;
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return `${ts}-${rnd}-${counter}`;
}
