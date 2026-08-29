import Link from "next/link";
import { Card } from "@/components/ui";
import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="wrap section" style={{ maxWidth: "440px" }}>
      <h1>Set a new password</h1>
      <Card>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="small muted">
            This page needs a reset link. <Link href="/forgot-password">Request a new one</Link>.
          </p>
        )}
      </Card>
      <p className="small muted" style={{ marginTop: "1rem" }}>
        Changing your password signs out every other session on your account.
      </p>
    </div>
  );
}
