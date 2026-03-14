"use client";

import { useState } from "react";
import { Surface } from "@bluesnake-studios/ui";

import { formatDebugError } from "@/lib/client/api-error";
import { listAdminActivity } from "@/lib/client/web-api";
import type { AuditEventRecord, ReplayNonceRecord } from "@/lib/server/operations-store";
import type { StorefrontOrder } from "@/lib/storefront/types";

interface AdminActivityConsoleProps {
  initialAuditEvents: AuditEventRecord[];
  initialOrders: StorefrontOrder[];
  initialReplayNonces: ReplayNonceRecord[];
}

export function AdminActivityConsole({ initialAuditEvents, initialOrders, initialReplayNonces }: AdminActivityConsoleProps) {
  const [adminToken, setAdminToken] = useState("");
  const [adminActor, setAdminActor] = useState("admin-audit");
  const [actorFilter, setActorFilter] = useState("");
  const [orderListingFilter, setOrderListingFilter] = useState("");
  const [orderOwnerFilter, setOrderOwnerFilter] = useState("");
  const [scopeKeyFilter, setScopeKeyFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [auditAction, setAuditAction] = useState<"all" | AuditEventRecord["action"]>("all");
  const [auditStatus, setAuditStatus] = useState<"all" | AuditEventRecord["status"]>("all");
  const [replayStatus, setReplayStatus] = useState<"all" | ReplayNonceRecord["status"]>("all");
  const [auditEvents, setAuditEvents] = useState(initialAuditEvents);
  const [orders, setOrders] = useState(initialOrders);
  const [replayNonces, setReplayNonces] = useState(initialReplayNonces);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRefresh() {
    setPending(true);
    setMessage(null);

    try {
      const payload = await listAdminActivity(
        { adminToken, adminActor },
        {
          limit: 50,
          actorId: actorFilter.trim() || undefined,
          auditAction: auditAction === "all" ? undefined : auditAction,
          auditStatus: auditStatus === "all" ? undefined : auditStatus,
          orderListingId: orderListingFilter.trim() || undefined,
          orderOwnerPublicKey: orderOwnerFilter.trim() || undefined,
          scopeKey: scopeKeyFilter.trim() || undefined,
          replayStatus: replayStatus === "all" ? undefined : replayStatus,
          search: searchText.trim() || undefined
        }
      );
      setAuditEvents(payload.auditEvents);
      setOrders(payload.orders);
      setReplayNonces(payload.replayNonces);
      setMessage(`Loaded ${payload.auditEvents.length} audit events, ${payload.orders.length} orders, and ${payload.replayNonces.length} replay records.`);
    } catch (error) {
      setMessage(formatDebugError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="template-showcase">
      <Surface className="stacked-card">
        <h2>Activity explorer</h2>
        <div className="form-grid">
          <label className="showcase-field">
            <span>Admin token</span>
            <input className="showcase-input" onChange={(event) => setAdminToken(event.target.value)} type="password" value={adminToken} />
          </label>
          <label className="showcase-field">
            <span>Actor id</span>
            <input className="showcase-input" onChange={(event) => setAdminActor(event.target.value)} value={adminActor} />
          </label>
          <label className="showcase-field">
            <span>Search</span>
            <input className="showcase-input" onChange={(event) => setSearchText(event.target.value)} placeholder="actor, nonce, details" value={searchText} />
          </label>
          <label className="showcase-field">
            <span>Actor filter</span>
            <input className="showcase-input" onChange={(event) => setActorFilter(event.target.value)} placeholder="admin-console" value={actorFilter} />
          </label>
          <label className="showcase-field">
            <span>Scope key</span>
            <input className="showcase-input" onChange={(event) => setScopeKeyFilter(event.target.value)} placeholder="owner public key" value={scopeKeyFilter} />
          </label>
          <label className="showcase-field">
            <span>Order listing</span>
            <input className="showcase-input" onChange={(event) => setOrderListingFilter(event.target.value)} placeholder="moss60-aura" value={orderListingFilter} />
          </label>
          <label className="showcase-field">
            <span>Order owner</span>
            <input className="showcase-input" onChange={(event) => setOrderOwnerFilter(event.target.value)} placeholder="owner public key" value={orderOwnerFilter} />
          </label>
          <label className="showcase-field">
            <span>Audit action</span>
            <select className="showcase-select" onChange={(event) => setAuditAction(event.target.value as typeof auditAction)} value={auditAction}>
              <option value="all">all</option>
              <option value="mint">mint</option>
              <option value="transfer">transfer</option>
            </select>
          </label>
          <label className="showcase-field">
            <span>Audit status</span>
            <select className="showcase-select" onChange={(event) => setAuditStatus(event.target.value as typeof auditStatus)} value={auditStatus}>
              <option value="all">all</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label className="showcase-field">
            <span>Replay status</span>
            <select className="showcase-select" onChange={(event) => setReplayStatus(event.target.value as typeof replayStatus)} value={replayStatus}>
              <option value="all">all</option>
              <option value="accepted">accepted</option>
              <option value="replayed">replayed</option>
              <option value="expired">expired</option>
            </select>
          </label>
        </div>
        <div className="action-row">
          <button className="action-button" disabled={pending || adminToken.trim().length === 0} onClick={() => void handleRefresh()} type="button">
            {pending ? "Refreshing..." : "Apply server filters"}
          </button>
        </div>
        <p className="muted-copy">Filters are sent to `/api/admin/activity`, so actor, status, scope, order, and search narrowing happen in the route and repository layer before results reach the browser.</p>
        {message ? <p className="status-banner">{message}</p> : null}
      </Surface>

      <div className="card-grid card-grid--wide">
        <Surface className="stacked-card">
          <h2>Audit events</h2>
          <p className="muted-copy">Showing {auditEvents.length} events from the latest server query.</p>
          {auditEvents.length === 0 ? <p className="muted-copy">No audit events match the current filters.</p> : null}
          <ul className="plain-list activity-list">
            {auditEvents.map((event) => (
              <li className="activity-item" key={event.id}>
                <div>
                  <strong>{event.action}</strong>
                  <p className="muted-copy">{event.status} by {event.actorId}</p>
                </div>
                <div className="activity-item__meta">
                  <span className="ui-stat-pill">{event.loggedAt}</span>
                  <code>{JSON.stringify(event.details)}</code>
                </div>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface className="stacked-card">
          <h2>Storefront orders</h2>
          <p className="muted-copy">Showing {orders.length} orders from the latest server query.</p>
          {orders.length === 0 ? <p className="muted-copy">No orders match the current filters.</p> : null}
          <ul className="plain-list activity-list">
            {orders.map((order) => (
              <li className="activity-item" key={order.id}>
                <div>
                  <strong>{order.listingId}</strong>
                  <p className="muted-copy">{order.ownerPublicKey} bought {order.addonId}</p>
                </div>
                <div className="activity-item__meta">
                  <span className="ui-stat-pill">order {order.id}</span>
                  <span className="ui-stat-pill">edition {order.edition}</span>
                  <span className="ui-stat-pill">{order.currency} {order.amountCents / 100}</span>
                  {order.signerKeyId ? <span className="ui-stat-pill">key {order.signerKeyId}</span> : null}
                  <span className="ui-stat-pill">{order.createdAt}</span>
                </div>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface className="stacked-card">
          <h2>Replay ledger</h2>
          <p className="muted-copy">Showing {replayNonces.length} records from the latest server query.</p>
          {replayNonces.length === 0 ? <p className="muted-copy">No replay records match the current filters.</p> : null}
          <ul className="plain-list activity-list">
            {replayNonces.map((record) => (
              <li className="activity-item" key={record.id}>
                <div>
                  <strong>{record.operation}</strong>
                  <p className="muted-copy">{record.status} for {record.scopeKey}</p>
                </div>
                <div className="activity-item__meta">
                  <span className="ui-stat-pill">nonce {record.nonce}</span>
                  <span className="ui-stat-pill">attempts {record.attempts}</span>
                  <span className="ui-stat-pill">last seen {record.lastSeenAt}</span>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </div>
    </section>
  );
}
