"use client";

import { ActionButton } from "./form-kit";

export function MarkAllRead() {
  return <ActionButton url="/api/notifications/read" body={{}} label="Mark all read" className="btn btn-sm btn-ghost" />;
}

export function MarkRead({ id }: { id: string }) {
  return <ActionButton url="/api/notifications/read" body={{ id }} label="Mark read" className="btn btn-sm btn-quiet" />;
}
