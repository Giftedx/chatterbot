// Provide a minimal global jest namespace for tests that reference jest.Mock, jest.Mocked, etc.
// This avoids TS compile errors in ESM test configs that import @jest/globals but still use jest namespace types.
// These are intentionally loose to satisfy typing only.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace jest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Mock<T = any, Y extends any[] = any> = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Mocked<T> = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type SpyInstance<T = any> = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type MockedClass<T = any> = any;
  // Provide a minimal alias for jest.MockedFunction used in some tests
  // This maps a function type T to a jest.Mock with the same parameters and return type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type MockedFunction<T extends (...args: any[]) => any> = Mock<ReturnType<T>, Parameters<T>>;
}
