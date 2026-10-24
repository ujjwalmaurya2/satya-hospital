// Minimal Deno globals so the Edge Functions type-check under Node's tsc.
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
