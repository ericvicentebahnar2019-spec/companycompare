import type { Metadata } from "next";

import { ForgotForm } from "@/components/auth-form";
import { requestPasswordResetAction } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPage() {
  return <ForgotForm action={requestPasswordResetAction} />;
}
