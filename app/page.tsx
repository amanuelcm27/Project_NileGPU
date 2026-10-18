import { Navbar } from "@/components/navigation/Navbar";
import { FinalCta } from "@/components/sections/FinalCta";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { LocalAccess } from "@/components/sections/LocalAccess";
import { SurveySection } from "@/components/sections/SurveySection";
import { Workloads } from "@/components/sections/Workloads";

/**
 * Landing page.
 *
 * Kept as a Server Component: only the interactive pieces (navigation, workload
 * selector, survey, 3D visual) ship JavaScript to the browser.
 */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <Workloads />
        <HowItWorks />
        <LocalAccess />
        <SurveySection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
