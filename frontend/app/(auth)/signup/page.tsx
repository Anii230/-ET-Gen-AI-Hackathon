"use client";

import dynamic from "next/dynamic";
import { AuthDecorativePanel } from "@/components/auth/AuthDecorativePanel";

const AuthForm = dynamic(() =>
  import("@/components/auth/AuthForm").then((mod) => mod.AuthForm),
  { ssr: false }
);

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Decorative panel */}
      <AuthDecorativePanel />

      {/* Form */}
      <div className="flex-1 flex bg-background">
        <AuthForm />
      </div>
    </div>
  );
}
