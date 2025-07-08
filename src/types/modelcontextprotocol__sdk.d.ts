// Ambient type declarations for @modelcontextprotocol/sdk
// These are minimal stubs so that the TypeScript compiler can succeed.
// Replace with real typings once the MCP SDK ships official TypeScript type definitions.

declare module '@modelcontextprotocol/sdk' {
  /**
   * Generic options for MCP client construction.
   * We keep it as an index signature so user code can pass anything.
   */
  export interface ClientOptions {
    [key: string]: unknown;
  }

  /**
   * Very small stub of the MCP SDK Client used in this project.
   * Extend as you add real MCP integration.
   */
  export class Client {
    constructor(options?: ClientOptions);

    /**
     * Placeholder request method – replace with actual signature.
     */
    request(endpoint: string, payload?: unknown): Promise<unknown>;

    /** Close connection / cleanup */
    close(): Promise<void>;
  }
}
