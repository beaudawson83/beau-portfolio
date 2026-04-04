import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TelemetryGrid from '@/components/TelemetryGrid';
import BadLabsShowcase from '@/components/BadLabsShowcase';
import ChangeLog from '@/components/ChangeLog';
import SystemKernel from '@/components/SystemKernel';
import Footer from '@/components/Footer';
import PiEasterEgg from '@/components/PiEasterEgg';

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-12">
        <Hero />
        <TelemetryGrid />
        <BadLabsShowcase />
        <ChangeLog />
        <SystemKernel />
      </main>
      <Footer />
      <PiEasterEgg />
    </>
  );
}
