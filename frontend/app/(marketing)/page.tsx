import { Navbar } from "@/components/marketing/Navbar";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { FeaturesRow } from "@/components/marketing/FeaturesRow";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Footer } from "@/components/marketing/Footer";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: BRAND.title,
  },
  description: BRAND.metaDescription,
  openGraph: {
    title: BRAND.title,
    description: BRAND.metaDescription,
    siteName: BRAND.name,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: BRAND.title,
    description: BRAND.metaDescription,
  },
};

export default function MarketingPage() {
  return (
    <div className="overflow-x-hidden w-full min-h-screen bg-background">
      <Navbar />
      {/* Cinematic scroll hero — pins for ~7000px scroll distance */}
      <CinematicHero />
      {/* Remaining marketing sections */}
      <FeaturesRow />
      <HowItWorks />
      <Footer />
    </div>
  );
}
