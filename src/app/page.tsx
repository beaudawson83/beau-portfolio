import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TelemetryGrid from '@/components/TelemetryGrid';
import CaseStudies from '@/components/CaseStudies';
import BadLabsShowcase from '@/components/BadLabsShowcase';
import Modules from '@/components/Modules';
import SystemKernel from '@/components/SystemKernel';
import Timeline from '@/components/Timeline';
import Footer from '@/components/Footer';
import PiEasterEgg from '@/components/PiEasterEgg';
import { getModuleTelemetry } from '@/lib/module-telemetry';

// Re-render the module-telemetry block every 15 minutes — telemetry is a
// rough freshness signal, not real-time, and the surrounding page is
// otherwise static.
export const revalidate = 900;

export default async function Home() {
  const telemetry = await getModuleTelemetry();
  return (
    <>
      <Header />
      <main className="pt-12">
        <Hero />
        <TelemetryGrid />
        <CaseStudies />
        <BadLabsShowcase />
        <Modules telemetry={telemetry} />
        <SystemKernel />
        <Timeline />
      </main>
      <Footer />
      <PiEasterEgg />
    </>
  );
}
