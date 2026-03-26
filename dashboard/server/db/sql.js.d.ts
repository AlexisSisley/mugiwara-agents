// Minimal type declarations for sql.js — used by tsconfig.hooks.json compilation
// The real sql.js types are complex; this provides just enough for our usage.
declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface Statement {
    bind(params?: Record<string, unknown> | unknown[]): boolean;
    step(): boolean;
    getAsObject(params?: Record<string, unknown>): Record<string, unknown>;
    free(): void;
    run(params?: Record<string, unknown> | unknown[]): void;
  }

  interface Database {
    run(sql: string, params?: Record<string, unknown> | unknown[]): Database;
    exec(sql: string, params?: Record<string, unknown> | unknown[]): QueryExecResult[];
    prepare(sql: string): Statement;
    close(): void;
    export(): Uint8Array;
  }

  interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  interface SqlJsConfig {
    locateFile?: (filename: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
  export type { Database as Database, QueryExecResult, SqlJsStatic, Statement };
}
