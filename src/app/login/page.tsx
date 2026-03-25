import { AuthFlow } from "@/components/auth-flow";
import { redirectIfAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  await redirectIfAuthenticated();
  return <AuthFlow />;
}
