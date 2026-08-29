import { z } from "zod";
import { guard, errorResponse, ok, parseBody } from "@/lib/api";
import { queueEmail, verifySmtp } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { audit } from "@/lib/audit";

const schema = z.object({ to: z.string().email() });

/** Admin test-send (section 15). Never echoes credentials back to the client. */
export async function POST(req: Request) {
  try {
    const actor = await guard("settings.manage");
    const { to } = await parseBody(req, schema);

    const check = await verifySmtp();
    const mail = templates.generic(
      "NetaTrack SMTP test",
      `This is a test message sent by ${actor.fullName} to confirm transactional email delivery.`
    );
    await queueEmail({ to, type: "admin.smtp_test", userId: actor.userId, ...mail });

    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "settings.smtp_test",
      summary: `to=${to}; transport=${check.ok ? "verified" : "not configured"}`,
    });

    return ok({ ok: true, transportVerified: check.ok, reason: check.ok ? null : check.reason });
  } catch (error) {
    return errorResponse(error);
  }
}
