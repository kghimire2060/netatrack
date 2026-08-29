import Link from "next/link";
import { Card } from "@/components/ui";
import { VerifyEmail } from "@/components/verify-email";

export const metadata = { title: "Verify your account" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="wrap section" style={{ maxWidth: "440px" }}>
      <h1>Verify your account</h1>
      <Card>
        {token ? (
          <VerifyEmail token={token} />
        ) : (
          <p className="small muted">
            This page needs a verification link from your email.{" "}
            <Link href="/register">Create an account</Link> if you have not yet registered.
          </p>
        )}
      </Card>
    </div>
  );
}
