export async function asyncAutoRetry<T>(
  action: () => Promise<T>,
  options: {
    count?: number;
    isNeedRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const count = options.count ?? 20;
  const isNeedRetry = options.isNeedRetry ?? (() => true);

  let remainingRetryCount = count;
  while (true) {
    try {
      return await action();
    } catch (error) {
      remainingRetryCount -= 1;

      if (remainingRetryCount >= 0 && isNeedRetry(error)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      throw error;
    }
  }
}
