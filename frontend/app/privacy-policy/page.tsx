import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | ClipCraft Studio",
  description: "Privacy policy for the ClipCraft Studio application.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] px-6 py-12 text-white sm:px-10">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-purple-300 hover:text-white">
            Back to ClipCraft Studio
          </Link>
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-gray-400">Last updated: September 20, 2026</p>
        </header>
        <section className="space-y-4 text-gray-300">
          <p>
            ClipCraft Studio is an application for researching topics and
            preparing original short-form video content. This policy explains
            what information the application uses and how it is handled.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Information we use</h2>
          <p>
            The application may process account and content information that you
            explicitly authorize through connected services. For Facebook and
            Instagram, this may include your Page ID, Instagram professional
            account ID, owned Page posts, owned Instagram media, captions,
            timestamps, permalinks, and available engagement counts.
          </p>
          <p>
            We also process information that you enter into the application,
            such as video preferences, research topics, generated scripts, and
            production prompts.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">How we use information</h2>
          <p>
            Information is used to provide research, generate original content
            drafts, display owned-account performance signals, and improve the
            content workflow. We do not sell personal information or use social
            media data to build profiles of unrelated users.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Data protection and retention</h2>
          <p>
            Access tokens and application secrets are stored on the backend and
            are not intended to be exposed in the browser. We retain only the
            information needed to operate the application and its research
            workflow. You may disconnect an account or request deletion of data
            associated with your connection by contacting the application owner.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Third-party services</h2>
          <p>
            The application may connect to Meta services and other APIs selected
            by the application owner. Those services process information under
            their own terms and privacy policies. The application does not
            request access to unrelated personal accounts without authorization.
          </p>

          <h2 className="pt-4 text-2xl font-semibold text-white">Contact</h2>
          <p>
            For privacy questions or deletion requests, contact the owner using
            the email address associated with the ClipCraft Studio account.
          </p>
        </section>
      </article>
    </main>
  );
}