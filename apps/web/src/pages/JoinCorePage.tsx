import { Layout } from '@/components/layout/Layout';
import { GateBar } from '@/components/tesseract';
import { CoreApplicationForm } from '@/components/join/CoreApplicationForm';

/**
 * /join/core — the standalone Core Team application, reached from the
 * Member-vs-Core chooser at /join. The form itself is shared with /recruitment
 * (see components/join/CoreApplicationForm.tsx) so the two never drift apart.
 */
export default function JoinCorePage() {
  return (
    <Layout>
      <GateBar />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <CoreApplicationForm
          signInNext="/join/core"
          backLink={{ to: '/join', label: 'BACK TO ENTRY VECTORS' }}
        />
      </section>
    </Layout>
  );
}
