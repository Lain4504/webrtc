/**
 * Configuration for server-livekit API
 */
export const getServerLiveKitUrl = (): string => {
  // In Next.js, NEXT_PUBLIC_* variables are available on both client and server
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const url = (process?.env?.NEXT_PUBLIC_SERVER_LIVEKIT_URL as string) || 'http://localhost:3001';
  // Remove trailing slash
  return url.replace(/\/$/, '');
};
