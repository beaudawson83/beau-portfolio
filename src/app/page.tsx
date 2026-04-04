import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TelemetryGrid from '@/components/TelemetryGrid';
import CaseStudies from '@/components/CaseStudies';
import BadLabsShowcase from '@/components/BadLabsShowcase';
import SystemKernel from '@/components/SystemKernel';
import Timeline from '@/components/Timeline';
import Footer from '@/components/Footer';
import PiEasterEgg from '@/components/PiEasterEgg';

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-12">
        <Hero />
        <TelemetryGrid />
        <CaseStudies />
        <BadLabsShowcase />
        <SystemKernel />
        <Timeline />
      </main>
      <Footer />
      <PiEasterEgg />
    </>
  );
}
