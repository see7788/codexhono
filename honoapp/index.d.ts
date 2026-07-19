export const serviceStart: (input: { workspacePath: string }) => Promise<{
  origin: string;
  stop: () => Promise<void>;
}>;
