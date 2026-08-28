import LegalPageLayout from "../layouts/LegalPageLayout";
import LegalSection from "../components/LegalSection";

const LAST_UPDATED = "2026-08-28";

export default function PrivacyPolicyPage() {
	return (
		<LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
			<p>
				This Privacy Policy explains what information Artmate (&ldquo;Artmate&rdquo;,
				&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, why we collect it, and what you can do about
				it. Artmate is a platform that connects people offering creative work (&ldquo;hirers&rdquo;)
				with the artists who carry it out. By creating an account you agree to the handling of your
				information as described below.
			</p>

			<LegalSection heading="Information we collect">
				<p>We only collect what the platform needs to work:</p>
				<ul className="list-disc space-y-1 pl-6">
					<li>
						<strong>Account details</strong> — the email address, display name and password you
						provide when registering, and whether your account is an artist or a hirer. Passwords
						are never stored in readable form (see &ldquo;How we protect your information&rdquo;).
					</li>
					<li>
						<strong>Profile information</strong> — anything you choose to add to your profile, such
						as your location, disciplines, availability, rate, an avatar, and portfolio files you
						upload.
					</li>
					<li>
						<strong>Activity on the platform</strong> — the opportunities you post, the swipes you
						make, the matches they produce, and the messages you exchange with people you have
						matched with.
					</li>
					<li>
						<strong>Technical data</strong> — basic information your browser sends with each request
						(such as your IP address), used to keep sessions secure and to apply rate limits against
						abuse.
					</li>
				</ul>
			</LegalSection>

			<LegalSection heading="How we use your information">
				<p>Your information is used to provide the service, specifically to:</p>
				<ul className="list-disc space-y-1 pl-6">
					<li>create and secure your account and keep you signed in;</li>
					<li>
						show your profile to relevant hirers or artists so that mutual matches can happen;
					</li>
					<li>match opportunities with candidates and enable chat between matched users;</li>
					<li>send in-app notifications about activity relevant to you;</li>
					<li>protect the platform against fraud, abuse and automated attacks.</li>
				</ul>
				<p>
					We do not sell your personal information, and we do not use it to show third-party
					advertising.
				</p>
			</LegalSection>

			<LegalSection heading="What other users can see">
				<p>
					Artmate is a matching platform, so some information is meant to be seen by others. Your
					profile — display name, avatar, disciplines, location, availability and any portfolio
					files you add — is visible to the users you can be matched with. Messages you send are
					visible to the user you matched with. Your email address and password are never shown to
					other users.
				</p>
			</LegalSection>

			<LegalSection heading="How we protect your information">
				<p>
					Passwords are stored only as a salted hash, never in plain text, so they cannot be read
					even by us. All connections between your browser and Artmate use HTTPS. Authentication
					uses short-lived access tokens and a separate refresh token stored in a secure,
					browser-managed cookie. Access to other users&rsquo; data is restricted by role and
					ownership checks on the server.
				</p>
			</LegalSection>

			<LegalSection heading="Data retention">
				<p>
					We keep your information for as long as your account exists. When you delete your account,
					your personal information, profile and uploaded files are removed, and content tied to
					your account (such as your gigs, swipes and matches) is deleted along with it. Some
					minimal technical logs may persist briefly for security purposes before being discarded.
				</p>
			</LegalSection>

			<LegalSection heading="Your rights">
				<p>
					You can view and update most of your information at any time from your profile and
					settings. You can delete your account, which removes your personal data as described
					above. If you have questions about your data or want to exercise any rights available to
					you under applicable law, contact us using the details below.
				</p>
			</LegalSection>

			<LegalSection heading="Children">
				<p>
					Artmate is not directed at children. You must be old enough to enter into a binding
					agreement in your country to create an account, and you should not use Artmate if you are
					under that age.
				</p>
			</LegalSection>

			<LegalSection heading="Changes to this policy">
				<p>
					We may update this Privacy Policy as the platform evolves. When we make material changes
					we will update the &ldquo;Last updated&rdquo; date at the top of this page. Continuing to
					use Artmate after a change means you accept the updated policy.
				</p>
			</LegalSection>

			<LegalSection heading="Contact">
				<p>
					Artmate is a non-commercial project built as part of the 42 curriculum. For any question
					about this policy or your data, contact the project team through the repository or the
					address provided in the project&rsquo;s README.
				</p>
			</LegalSection>
		</LegalPageLayout>
	);
}
