import type { Metadata } from "next";

import { ResetForm } from "@/components/auth-form";
import { resetPasswordAction } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetForm action={resetPasswordAction} token={token ?? ""} />;
}
