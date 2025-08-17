// Augment @jest/globals spyOn to allow string property names with accessor type without over-constraining
declare module '@jest/globals' {
  function spyOn<T extends object>(object: T, property: string, accessType?: 'get' | 'set'): any;
}
