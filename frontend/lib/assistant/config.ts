export function isAssistantEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ASSISTANT_ENABLED !== 'false';
}
