import AuthPanel from "@/features/auth/AuthPanel";

export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ reason?: string | string[] }>;
}) {
  const { reason } = await searchParams;
  // Only explicitly supported categories cross the server/client boundary.
  const callbackReason = reason === "callback_missing_code" || reason === "callback_exchange_failed" || reason === "auth_unavailable"
    ? reason : undefined;
  return <AuthPanel mode="sign-in" {...(callbackReason ? { callbackReason } : {})} />;
}
