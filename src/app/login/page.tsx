import { AuthFlow } from "@/components/auth-flow";
import { redirectIfAuthenticated } from "@/lib/auth";
import "./auth-flow.css";

export default async function LoginPage() {
  await redirectIfAuthenticated();
  return <AuthFlow />;
}
