export const systemClock = {
  now(): Date {
    return new Date();
  },

  nowIso(): string {
    return new Date().toISOString();
  },
};
