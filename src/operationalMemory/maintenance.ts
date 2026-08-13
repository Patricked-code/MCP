type TimerHandle = { unref?: () => void };

export type OperationalMemoryMaintenanceCycle = {
  expiredSessionCount: number;
  expiredLockCount: number;
};

type MaintenanceOptions<Timer extends TimerHandle> = {
  expireSessions: () => Promise<number>;
  expireLocks?: () => Promise<number>;
  reconcileSessionLockIds?: () => Promise<number>;
  intervalMs?: number;
  setInterval?: (callback: () => void, intervalMs: number) => Timer;
  clearInterval?: (timer: Timer) => void;
  onCycle?: (summary: OperationalMemoryMaintenanceCycle) => void | Promise<void>;
  onError?: (error: unknown) => void;
};

export type OperationalMemoryMaintenance = {
  stop(): void;
};

export function startOperationalMemoryMaintenance<Timer extends TimerHandle = NodeJS.Timeout>(
  options: MaintenanceOptions<Timer>
): OperationalMemoryMaintenance {
  const setTimer = options.setInterval ?? ((callback, intervalMs) => (
    globalThis.setInterval(callback, intervalMs) as unknown as Timer
  ));
  const clearTimer = options.clearInterval ?? ((timer) => {
    globalThis.clearInterval(timer as unknown as NodeJS.Timeout);
  });
  const timer = setTimer(() => {
    void (async () => {
      const [expiredSessionCount, expiredLockCount] = await Promise.all([
        options.expireSessions(),
        options.expireLocks?.() ?? Promise.resolve(0)
      ]);
      await options.reconcileSessionLockIds?.();
      await options.onCycle?.({ expiredSessionCount, expiredLockCount });
    })().catch((error) => options.onError?.(error));
  }, options.intervalMs ?? 60_000);
  timer.unref?.();
  let stopped = false;

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearTimer(timer);
    }
  };
}
