export const metadata = {
  title: "Privacy Policy — RentMitra",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-sm text-gray-700">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mb-6 text-xs text-gray-400">Last updated: October 2024</p>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-gray-900">What RentMitra is</h2>
        <p>
          RentMitra is a property and rent management tool for individual landlords and
          property owners. It helps you track properties, tenants, and rent payments.
          Only the property owner has an account — tenants do not log in.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-gray-900">Data we collect</h2>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Google account information</strong> — your name and email address,
            collected when you sign in with Google, used only to identify your account.
          </li>
          <li>
            <strong>Property data</strong> — property names, addresses, and details you
            enter yourself.
          </li>
          <li>
            <strong>Tenant data</strong> — names, phone numbers, room numbers, rent
            amounts, and move-in dates that you enter for your own tenants.
          </li>
          <li>
            <strong>Payment records</strong> — rent due dates and payment history you
            record within the app.
          </li>
        </ul>
        <p className="mt-2">
          We do not collect payment card numbers, bank account details, or any financial
          credentials. The "Mark Paid" feature records that rent was received — it does
          not process any money.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-gray-900">How we use your data</h2>
        <p>
          All data you enter is stored in your private account and is never shared with
          other users. It is used solely to display your dashboard, payments, and reports
          back to you.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-gray-900">Third-party services</h2>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Supabase</strong> — database and authentication hosting. Your data is
            stored in Supabase's secure cloud infrastructure.
          </li>
          <li>
            <strong>Google Sign-In</strong> — used for authentication only. We receive
            your Google name and email; we do not access your Google Drive, Gmail, or any
            other Google services.
          </li>
          <li>
            <strong>Vercel</strong> — web hosting for the application.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-gray-900">Data retention and deletion</h2>
        <p>
          Your data is retained as long as your account exists. You can delete your
          account from the Settings tab, which permanently removes all your data within
          30 days.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-gray-900">Children's privacy</h2>
        <p>
          RentMitra is intended for property owners and is not directed at children under
          13. We do not knowingly collect data from children.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-gray-900">Contact</h2>
        <p>
          For privacy questions or data deletion requests, contact us at{" "}
          <a href="mailto:support.hdmtech@gmail.com" className="text-blue-600 underline">
            support.hdmtech@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
