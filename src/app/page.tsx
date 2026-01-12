import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TelemetryGrid from '@/components/TelemetryGrid';
import ChaosToClarity from '@/components/ChaosToClarity';
import ArchitectureShowcase from '@/components/ArchitectureShowcase';
import ChangeLog from '@/components/ChangeLog';
import SystemKernel from '@/components/SystemKernel';
import SystemMonitor from '@/components/SystemMonitor';
import HookSection from '@/components/HookSection';
import Footer from '@/components/Footer';
import PiEasterEgg from '@/components/PiEasterEgg';

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-12">
        <Hero />
        <TelemetryGrid />
        <ChaosToClarity />
        <ArchitectureShowcase />
        <ChangeLog />
        <SystemKernel />
        <SystemMonitor />
        <HookSection />
      </main>
      <Footer />
      <PiEasterEgg />
    </>
  );
}
