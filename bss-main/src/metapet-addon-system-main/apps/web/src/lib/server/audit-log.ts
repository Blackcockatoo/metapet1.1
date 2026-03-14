import { getAppDatabaseAdapter } from "@/lib/server/app-database-adapter";
import type { AuditEvent, AuditEventRecord } from "@/lib/server/operations-store";

export type { AuditEvent, AuditEventRecord } from "@/lib/server/operations-store";

export interface AuditEventQuery {
  actorId?: string;
  action?: AuditEvent["action"];
  limit?: number;
  search?: string;
  status?: AuditEvent["status"];
}

export async function recordAuditEvent(event: AuditEvent): Promise<AuditEventRecord> {
  const record: AuditEventRecord = {
    ...event,
    id: `audit-${crypto.randomUUID()}`,
    loggedAt: new Date().toISOString()
  };

  await getAppDatabaseAdapter().insertAuditEvent(record);

  return record;
}

export async function listAuditEvents(query: AuditEventQuery = {}): Promise<AuditEventRecord[]> {
  return getAppDatabaseAdapter().queryAuditEvents(query);
}

export async function clearAuditEvents(): Promise<void> {
  await getAppDatabaseAdapter().clearAuditEvents();
}
