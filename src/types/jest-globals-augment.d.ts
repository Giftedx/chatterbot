// Minimal type augmentation to unblock ESM @jest/globals named imports in TS
// This is compile-time only and does not affect runtime behavior.
declare module '@jest/globals' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const jest: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const describe: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const test: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const it: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const expect: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const beforeEach: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const afterEach: any;
  // Allow legacy callback-style tests with `done` parameter without strict typing
  // by providing a permissive overload signature.
  // Note: This is a lightweight augmentation for test files only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function it(name: string, fn: (done?: any) => any, timeout?: number): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function test(name: string, fn: (done?: any) => any, timeout?: number): void;
}
