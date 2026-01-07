import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TelemetryGrid from '@/components/TelemetryGrid';
import ArchitectureShowcase from '@/components/ArchitectureShowcase';
import ChangeLog from '@/components/ChangeLog';
import SystemKernel from '@/components/SystemKernel';
import HookSection from '@/components/HookSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-12">
        <Hero />
        <TelemetryGrid />
        <ArchitectureShowcase />
        <ChangeLog />
        <SystemKernel />
        <HookSection />
      </main>
      <Footer />
    </>
  );
}
