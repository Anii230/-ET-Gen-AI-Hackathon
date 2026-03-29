import { Navbar } from "@/components/marketing/Navbar";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { FeaturesRow } from "@/components/marketing/FeaturesRow";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Footer } from "@/components/marketing/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ET AI News — News that knows you",
  description:
    "AI-powered briefings, personalised to how you think. Cut through noise, get depth and intelligence.",
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
