export interface PostgresQueryResult<T extends Record<string, unknown> = Record<string, unknown>> {
  rowCount: number | null;
  rows: T[];
}

export interface PostgresQueryable {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: readonly unknown[]
  ): Promise<PostgresQueryResult<T>>;
}

export interface PostgresTransactionClient extends PostgresQueryable {
  release(): void;
}

export interface PostgresClient extends PostgresQueryable {
  connect(): Promise<PostgresTransactionClient>;
  end(): Promise<void>;
}

export async function createPostgresClient(connectionString: string): Promise<PostgresClient> {
  const { Pool } = await import("pg");

  return new Pool({
    connectionString,
    max: 10
  });
}
