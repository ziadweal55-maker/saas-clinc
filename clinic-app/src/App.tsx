import { useEffect, useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EcosystemSection } from './components/EcosystemSection';
import { FeaturesGrid } from './components/FeaturesGrid';
import { WorkflowSection } from './components/WorkflowSection';
import { PlansSection } from './components/PlansSection';
import { DemoBookingSection } from './components/DemoBookingSection';
import { Footer } from './components/Footer';
import { WhatsAppFloat } from './components/WhatsAppFloat';
import { fetchMarketingMedia } from './lib/supabase';
import type { MarketingMediaAsset } from './config/cloudinary';

function LandingPage() {
  const [mediaAssets, setMediaAssets] = useState<
    Record<string, MarketingMediaAsset>
  >({});
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useEffect(() => {
    let active = true;
    fetchMarketingMedia().then((assets) => {
      if (active) {
        setMediaAssets(assets);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7F6] text-[#0B2F24]">
      <Navbar />
      <main className="flex-1">
        <HeroSection mediaAssets={mediaAssets} />
        <EcosystemSection />
        <FeaturesGrid />
        <WorkflowSection mediaAssets={mediaAssets} />
        <PlansSection onSelectPlan={setSelectedPlan} />
        <DemoBookingSection selectedPlan={selectedPlan} />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <LandingPage />
    </LanguageProvider>
  );
}
