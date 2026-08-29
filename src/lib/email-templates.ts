/**
 * Transactional email templates (section 10). Every template returns an HTML
 * body and a plain-text fallback.
 */

const BRAND = {
  navy: "#0B2A5B",
  red: "#E31B23",
  blue: "#1D5FA7",
  lightBlue: "#F4F8FF",
  border: "#DCE5F5",
  muted: "#5A6B85",
};

export type RenderedEmail = { subject: string; html: string; text: string };

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:${BRAND.lightBlue};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${BRAND.navy}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden">
    <tr><td style="background:${BRAND.navy};padding:18px 24px">
      <span style="color:#fff;font-size:19px;font-weight:700;letter-spacing:-.3px">Neta<span style="color:${BRAND.red}">Track</span></span>
      <span style="color:#9FB4D6;font-size:12px;margin-left:10px">Know. Vote. Track.</span>
    </td></tr>
    <tr><td style="padding:26px 24px">
      <h1 style="margin:0 0 14px;font-size:19px;line-height:1.35">${title}</h1>
      ${bodyHtml}
      ${
        cta
          ? `<p style="margin:24px 0 8px"><a href="${cta.url}" style="display:inline-block;background:${BRAND.red};color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:14px">${cta.label}</a></p>
             <p style="margin:8px 0 0;font-size:12px;color:${BRAND.muted};word-break:break-all">If the button does not work, paste this link into your browser:<br>${cta.url}</p>`
          : ""
      }
    </td></tr>
    <tr><td style="padding:16px 24px;border-top:1px solid ${BRAND.border};font-size:12px;color:${BRAND.muted}">
      NetaTrack is an independent civic platform. It is not an election authority, and
      public-opinion figures are not official election results.<br>
      <a href="${appUrl}" style="color:${BRAND.blue}">${appUrl}</a>
    </td></tr>
  </table>
</body></html>`;
}

const p = (s: string) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">${s}</p>`;

function kv(rows: [string, string][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin:6px 0 14px">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 0;color:${BRAND.muted};width:42%">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`
      )
      .join("")}
  </table>`;
}

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export const templates = {
  verifyAccount(name: string, token: string): RenderedEmail {
    const url = `${appUrl()}/verify?token=${token}`;
    return {
      subject: "Verify your NetaTrack account",
      html: layout(
        "Verify your account",
        p(`Hello ${escape(name)},`) +
          p("Confirm this email address to activate your NetaTrack account. The link expires in 24 hours."),
        { label: "Verify my account", url }
      ),
      text: `Hello ${name},\n\nVerify your NetaTrack account (link expires in 24 hours):\n${url}\n\nIf you did not create this account, ignore this email.`,
    };
  },

  passwordReset(name: string, token: string): RenderedEmail {
    const url = `${appUrl()}/reset-password?token=${token}`;
    return {
      subject: "Reset your NetaTrack password",
      html: layout(
        "Password reset request",
        p(`Hello ${escape(name)},`) +
          p("Use the link below to choose a new password. It expires in 60 minutes and can be used once.") +
          p("If you did not request this, no action is needed — your password has not changed."),
        { label: "Set a new password", url }
      ),
      text: `Hello ${name},\n\nReset your NetaTrack password (expires in 60 minutes, single use):\n${url}\n\nIf you did not request this, ignore this email.`,
    };
  },

  complaintCreated(trackingId: string, title: string): RenderedEmail {
    const url = `${appUrl()}/track?id=${trackingId}`;
    return {
      subject: `NetaTrack — issue received (${trackingId})`,
      html: layout(
        "Your issue has been received",
        p("Thank you for reporting an issue. Keep the tracking ID below — it is how you follow progress.") +
          kv([
            ["Tracking ID", trackingId],
            ["Issue", escape(title)],
            ["Status", "Submitted"],
          ]),
        { label: "Track this issue", url }
      ),
      text: `Your issue has been received.\n\nTracking ID: ${trackingId}\nIssue: ${title}\nStatus: Submitted\n\nTrack it: ${url}`,
    };
  },

  complaintStatus(
    trackingId: string,
    status: string,
    publicUpdate: string | null
  ): RenderedEmail {
    const url = `${appUrl()}/track?id=${trackingId}`;
    const label = status.replace(/_/g, " ").toLowerCase();
    return {
      subject: `NetaTrack — ${trackingId} is now ${label}`,
      html: layout(
        "Your issue status has changed",
        kv([
          ["Tracking ID", trackingId],
          ["New status", escape(label)],
        ]) + (publicUpdate ? p(`<strong>Update:</strong> ${escape(publicUpdate)}`) : ""),
        { label: "View the full timeline", url }
      ),
      text: `Issue ${trackingId} is now ${label}.\n${publicUpdate ?? ""}\n\nTimeline: ${url}`,
    };
  },

  complaintResolved(trackingId: string, resolutionNote: string | null): RenderedEmail {
    const url = `${appUrl()}/track?id=${trackingId}`;
    return {
      subject: `NetaTrack — issue ${trackingId} resolved`,
      html: layout(
        "Your issue has been marked resolved",
        kv([["Tracking ID", trackingId], ["Status", "Resolved"]]) +
          (resolutionNote ? p(`<strong>Resolution:</strong> ${escape(resolutionNote)}`) : "") +
          p("If the issue is not actually resolved, you can request that it be reopened from the tracking page."),
        { label: "Review and give feedback", url }
      ),
      text: `Issue ${trackingId} has been marked resolved.\n${resolutionNote ?? ""}\n\nReview or request reopening: ${url}`,
    };
  },

  candidateClaim(status: string, candidateName: string, note?: string | null): RenderedEmail {
    return {
      subject: `NetaTrack — profile claim ${status.toLowerCase()}`,
      html: layout(
        `Profile claim ${escape(status.toLowerCase())}`,
        kv([["Candidate", escape(candidateName)], ["Status", escape(status)]]) +
          (note ? p(escape(note)) : "") +
          p("Approved claims allow you to edit permitted profile fields only. Independent fact-checks, official results and verification records remain editorially controlled."),
        { label: "Open candidate portal", url: `${appUrl()}/portal/candidate` }
      ),
      text: `Your claim for ${candidateName} is ${status}.\n${note ?? ""}\n\n${appUrl()}/portal/candidate`,
    };
  },

  securityAlert(name: string, detail: string): RenderedEmail {
    return {
      subject: "NetaTrack security alert",
      html: layout(
        "Security alert on your account",
        p(`Hello ${escape(name)},`) + p(escape(detail)) +
          p("If this was not you, reset your password immediately and revoke all sessions from your account settings."),
        { label: "Review account security", url: `${appUrl()}/account/security` }
      ),
      text: `Security alert: ${detail}\n\nReview: ${appUrl()}/account/security`,
    };
  },

  generic(subject: string, message: string): RenderedEmail {
    return { subject, html: layout(escape(subject), p(escape(message))), text: message };
  },
};

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
