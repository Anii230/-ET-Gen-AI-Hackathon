import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — ET AI News",
  description: "Create your AI-powered personalised news account",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
