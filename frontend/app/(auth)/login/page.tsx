"use client";

import dynamic from "next/dynamic";
import { AuthDecorativePanel } from "@/components/auth/AuthDecorativePanel";


const AuthForm = dynamic(() =>
  import("@/components/auth/AuthForm").then((mod) => mod.AuthForm),
  { ssr: false }
);

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Decorative panel — left 40% */}
      <AuthDecorativePanel />

      {/* Form — right 60% */}
      <div className="flex-1 flex bg-background">
        <AuthForm />
      </div>
    </div>
  );
}
