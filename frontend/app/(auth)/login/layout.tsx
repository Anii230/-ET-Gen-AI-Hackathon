import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — ET AI News",
  description: "Sign in to your personalised AI news feed",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
