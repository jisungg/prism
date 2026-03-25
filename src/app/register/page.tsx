import { RegisterFlow } from "@/components/register-flow";
import { redirectIfAuthenticated } from "@/lib/auth";

export default async function RegisterPage() {
  await redirectIfAuthenticated();
  return <RegisterFlow />;
}
