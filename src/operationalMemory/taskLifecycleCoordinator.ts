export type TaskLifecycleCoordinator = {
  run<T>(work: () => Promise<T>): Promise<T>;
};

export const NOOP_TASK_LIFECYCLE_COORDINATOR: TaskLifecycleCoordinator = {
  run: (work) => work()
};

export function createTaskLifecycleCoordinator(): TaskLifecycleCoordinator {
  let tail: Promise<void> = Promise.resolve();
  return {
    run<T>(work: () => Promise<T>): Promise<T> {
      const operation = tail.then(work);
      tail = operation.then(() => undefined, () => undefined);
      return operation;
    }
  };
}
