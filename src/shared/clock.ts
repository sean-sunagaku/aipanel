export const systemClock = {
  nowIso(): string {
    return new Date().toISOString();
  },
};
