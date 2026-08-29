import { Card } from "@/components/ui";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="wrap section" style={{ maxWidth: "440px" }}>
      <h1>Reset your password</h1>
      <p className="muted">
        Enter your email address and we will send a single-use reset link that expires in 60
        minutes.
      </p>
      <Card>
        <ForgotPasswordForm />
      </Card>
    </div>
  );
}
