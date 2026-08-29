import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const actor = await getActor();
  if (actor) redirect("/account");
  const { next } = await searchParams;

  return (
    <div className="wrap section" style={{ maxWidth: "440px" }}>
      <h1>Log in</h1>
      <p className="muted">Access your issues, ratings and account settings.</p>
      <Card>
        <LoginForm next={next} />
      </Card>
      <p className="small muted center" style={{ marginTop: "1rem" }}>
        Privileged accounts require multi-factor authentication.{" "}
        <Link href="/about">Learn about roles</Link>.
      </p>
    </div>
  );
}
