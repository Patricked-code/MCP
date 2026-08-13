import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export type CapturedToolContract = {
  description: string | null;
  inputSchema: Record<string, unknown>;
};

type ToolRegistration = (server: McpServer) => void;

function isRawShape(value: unknown): value is z.ZodRawShape {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => entry instanceof z.ZodType);
}

export function captureToolContracts(
  register: ToolRegistration
): Record<string, CapturedToolContract> {
  const contracts: Record<string, CapturedToolContract> = {};
  function capture(
    name: string,
    description: string | null,
    rawShape: z.ZodRawShape
  ) {
    if (contracts[name]) {
      throw new Error(`Outil enregistré deux fois pendant la capture : ${name}`);
    }
    contracts[name] = {
      description,
      inputSchema: z.toJSONSchema(z.object(rawShape)) as Record<string, unknown>
    };
  }
  const fakeServer = {
    tool(name: string, ...rawArguments: unknown[]) {
      const args = [...rawArguments];
      const description = typeof args[0] === 'string'
        ? String(args.shift())
        : null;

      args.pop();
      const rawShape = args.find(isRawShape) ?? {};
      capture(name, description, rawShape);
      return undefined;
    },
    registerTool(name: string, config: Record<string, unknown>) {
      capture(
        name,
        typeof config.description === 'string' ? config.description : null,
        isRawShape(config.inputSchema) ? config.inputSchema : {}
      );
      return undefined;
    },
    registerResource() {
      return undefined;
    }
  } as unknown as McpServer;

  register(fakeServer);

  return Object.fromEntries(
    Object.entries(contracts).sort(([left], [right]) => left.localeCompare(right))
  );
}
