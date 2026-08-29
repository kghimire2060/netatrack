import { prisma } from "./db";
import type { RenderedEmail } from "./email-templates";

/**
 * SMTP delivery (section 10).
 *
 * Every message is first written to the `Notification` table (the queue), then
 * delivered. `scripts/mail-worker.ts` retries anything left in QUEUED/FAILED,
 * so a transient SMTP outage never loses a lifecycle notification.
 *
 * Credentials are read from the environment only. They are never sent to the
 * browser, never logged, and never committed.
 */

type QueueArgs = {
  to: string;
  type: string;
  userId?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
} & RenderedEmail;

let transportPromise: Promise<import("nodemailer").Transporter | null> | null = null;

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

async function getTransport() {
  if (!smtpConfigured()) return null;
  transportPromise ??= (async () => {
    const nodemailer = (await import("nodemailer")).default;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  })();
  return transportPromise;
}

/** Enqueue then attempt immediate delivery. Never throws into the caller. */
export async function queueEmail(args: QueueArgs) {
  const notification = await prisma.notification.create({
    data: {
      userId: args.userId ?? null,
      toEmail: args.to,
      channel: "EMAIL",
      type: args.type,
      subject: args.subject,
      body: args.html,
      relatedType: args.relatedType ?? null,
      relatedId: args.relatedId ?? null,
      status: "QUEUED",
    },
  });

  await deliver(notification.id, args).catch(() => undefined);
  return notification.id;
}

/** In-app-only notification (no email). */
export async function notifyInApp(args: {
  userId: string;
  type: string;
  subject: string;
  body: string;
  relatedType?: string;
  relatedId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: args.userId,
      channel: "IN_APP",
      type: args.type,
      subject: args.subject,
      body: args.body,
      relatedType: args.relatedType ?? null,
      relatedId: args.relatedId ?? null,
      status: "SENT",
      sentAt: new Date(),
    },
  });
}

export async function deliver(
  notificationId: string,
  mail: { to: string; subject: string; html: string; text: string }
) {
  const transport = await getTransport();

  if (!transport) {
    // Development: no SMTP host configured. Log instead of sending, and mark
    // the row SENT so lifecycle flows can be exercised end to end locally.
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `\n[email:dev] to=${mail.to}\n  subject: ${mail.subject}\n  ${mail.text.replace(/\n/g, "\n  ")}\n`
      );
    }
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "SENT", sentAt: new Date(), error: "dev: SMTP not configured" },
    });
    return { delivered: false, dev: true };
  }

  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "SENDING", attempts: { increment: 1 } },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "NetaTrack <no-reply@netatrack.example>",
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "SENT", sentAt: new Date(), error: null },
    });
    return { delivered: true, dev: false };
  } catch (error) {
    // Log the failure reason, never the message contents.
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "FAILED", error: String((error as Error).message).slice(0, 400) },
    });
    return { delivered: false, dev: false };
  }
}

/** Admin "test send" from the notification settings screen. */
export async function verifySmtp() {
  const transport = await getTransport();
  if (!transport) return { ok: false, reason: "SMTP_HOST is not configured" };
  try {
    await transport.verify();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, reason: String((error as Error).message) };
  }
}

export { smtpConfigured };
