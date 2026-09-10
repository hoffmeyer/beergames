// Minimal ambient declarations for the Node globals used by the fake D1 test
// double. Deliberately narrow (not the full @types/node) to avoid clashing
// with @cloudflare/workers-types' global fetch/Request/Response declarations.
declare const process: {
  getBuiltinModule(id: string): unknown;
};

interface ImportMeta {
  readonly url: string;
}
