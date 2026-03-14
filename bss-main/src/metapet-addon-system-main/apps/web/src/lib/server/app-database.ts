import { getAppDatabaseAdapter } from "@/lib/server/app-database-adapter";
import type { AppDatabase } from "@/lib/server/app-database-types";

export type { AppDatabase } from "@/lib/server/app-database-types";

/**
 * Legacy whole-database snapshot read kept for tests and migration helpers.
 * Runtime repositories should prefer targeted adapter methods instead.
 */
export async function readLegacyAppDatabaseSnapshot(): Promise<AppDatabase> {
  return getAppDatabaseAdapter().read();
}

/**
 * Legacy whole-database snapshot write kept for tests and migration helpers.
 * Runtime repositories should prefer targeted adapter methods instead.
 */
export async function writeLegacyAppDatabaseSnapshot(database: AppDatabase): Promise<void> {
  await getAppDatabaseAdapter().write(database);
}

let appDatabaseQueue = Promise.resolve();

/**
 * Legacy queued snapshot mutation helper kept for adapter tests.
 * Runtime repositories should prefer targeted adapter methods instead.
 */
export async function updateLegacyAppDatabaseSnapshot<T>(mutate: (database: AppDatabase) => T | Promise<T>): Promise<T> {
  const previous = appDatabaseQueue;
  let releaseQueue: () => void = () => undefined;

  appDatabaseQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previous;

  try {
    const database = await readLegacyAppDatabaseSnapshot();
    const result = await mutate(database);
    await writeLegacyAppDatabaseSnapshot(database);
    return result;
  } finally {
    releaseQueue();
  }
}

export const readAppDatabase = readLegacyAppDatabaseSnapshot;
export const writeAppDatabase = writeLegacyAppDatabaseSnapshot;
export const updateAppDatabase = updateLegacyAppDatabaseSnapshot;
