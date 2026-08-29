import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { Card } from "@/components/ui";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  if (await getActor()) redirect("/account");

  return (
    <div className="wrap section" style={{ maxWidth: "440px" }}>
      <h1>Create an account</h1>
      <p className="muted">
        An account lets you rate candidates, vote in polls and follow your submitted issues. You can
        report an issue without one.
      </p>
      <Card>
        <RegisterForm />
      </Card>
    </div>
  );
}
