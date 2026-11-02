import Link from "next/link";

export const metadata = {
  title: "Terms of Service | ClipCraft Studio",
  description: "Terms of service for the ClipCraft Studio application.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] px-6 py-12 text-white sm:px-10">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-purple-300 hover:text-white">
            Back to ClipCraft Studio
          </Link>
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="text-sm text-gray-400">Last updated: September 20, 2026</p>
        </header>

        <section className="space-y-4 text-gray-300">
          <p>
            These terms govern your use of ClipCraft Studio, an
            application for research and preparation of original short-form
            video content.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Acceptable use</h2>
          <p>
            You may use the application only for lawful purposes and in
            accordance with the policies of any connected platform. You must
            have permission to connect any Facebook Page, Instagram account, or
            other service that you authorize.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Connected platforms</h2>
          <p>
            Connecting a third-party account authorizes the application to use
            only the permissions you grant and that the platform makes
            available. You can revoke access through the connected platform’s
            settings. Availability of platform features may change without
            notice.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Generated content</h2>
          <p>
            The application may generate research summaries, scripts, prompts,
            and metadata. You are responsible for reviewing generated material,
            verifying factual claims, and ensuring that anything you publish
            complies with applicable laws and platform policies.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Availability</h2>
          <p>
            The application is provided on an as-available basis. API limits,
            service outages, account permissions, or policy changes may prevent
            some features from working.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Changes and contact</h2>
          <p>
            These terms may be updated as the application changes. Continued use
            after an update means you accept the revised terms. For questions,
            contact the owner using the email address associated with the
            ClipCraft Studio account.
          </p>
        </section>
      </article>
    </main>
  );
}