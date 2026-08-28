import LegalPageLayout from "../layouts/LegalPageLayout";
import LegalSection from "../components/LegalSection";

// NOTE FOR THE TEAM: real, project-specific terms for what Artmate actually is
// — a matching platform between hirers and artists, built for the 42 curriculum.
// Not legal advice and not lawyer-reviewed; check against your jurisdiction
// before any real launch. For the evaluation it satisfies "real content, not
// placeholders".

const LAST_UPDATED = "2026-08-28";

export default function TermsOfServicePage() {
	return (
		<LegalPageLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
			<p>
				These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Artmate
				(&ldquo;Artmate&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), a platform that connects hirers
				offering creative work with artists who carry it out. By creating an account or using
				Artmate, you agree to these Terms. If you do not agree, please do not use the platform.
			</p>

			<LegalSection heading="Who can use Artmate">
				<p>
					You must be old enough to form a binding agreement in your country to use Artmate. You
					agree to provide accurate account information and to keep your login credentials secure.
					You are responsible for activity that happens under your account.
				</p>
			</LegalSection>

			<LegalSection heading="Your account">
				<p>
					You register as either an artist or a hirer. You may update your profile at any time and
					delete your account whenever you choose. We may suspend or remove accounts that breach
					these Terms, that are used for abuse, or that put other users or the platform at risk.
				</p>
			</LegalSection>

			<LegalSection heading="Content you provide">
				<p>
					You keep ownership of the content you add to Artmate — your profile information, portfolio
					files, opportunities and messages. By posting content, you grant Artmate the limited
					permission needed to store and display it for the purpose of operating the platform (for
					example, showing your profile to users you can be matched with). You are responsible for
					ensuring you have the right to share anything you upload.
				</p>
			</LegalSection>

			<LegalSection heading="Acceptable use">
				<p>When using Artmate, you agree not to:</p>
				<ul className="list-disc space-y-1 pl-6">
					<li>impersonate others or misrepresent your identity, skills or intentions;</li>
					<li>
						post content that is unlawful, infringing, hateful, harassing, or otherwise harmful;
					</li>
					<li>
						use the platform to send spam, or to access, scrape or disrupt it by automated means
						beyond the documented public API and its limits;
					</li>
					<li>
						attempt to break, bypass or probe the platform&rsquo;s security or other users&rsquo;
						accounts;
					</li>
					<li>use Artmate for any purpose that is illegal where you live.</li>
				</ul>
			</LegalSection>

			<LegalSection heading="Matches and arrangements between users">
				<p>
					Artmate introduces artists and hirers and provides chat once there is a mutual match. Any
					agreement, payment, or working arrangement that results is strictly between the users
					involved. Artmate is not a party to those arrangements, does not employ artists or hirers,
					and does not guarantee the quality, legality, or outcome of any work arranged through the
					platform.
				</p>
			</LegalSection>

			<LegalSection heading="The public API">
				<p>
					Artmate offers a documented public API. If you use it, you must stay within its published
					rate limits and use it only in ways consistent with these Terms. We may change, limit, or
					withdraw API access to protect the platform.
				</p>
			</LegalSection>

			<LegalSection heading="Service availability">
				<p>
					Artmate is a student project provided on an &ldquo;as is&rdquo; and &ldquo;as
					available&rdquo; basis. We do not promise that it will be uninterrupted, error-free, or
					permanently available, and we may change or discontinue features at any time.
				</p>
			</LegalSection>

			<LegalSection heading="Limitation of liability">
				<p>
					To the fullest extent permitted by law, Artmate and its contributors are not liable for
					any indirect or consequential loss arising from your use of the platform, including any
					dispute, loss, or damage resulting from arrangements made between users. Your use of
					Artmate is at your own risk.
				</p>
			</LegalSection>

			<LegalSection heading="Changes to these Terms">
				<p>
					We may update these Terms as the platform evolves. When we make material changes we will
					update the &ldquo;Last updated&rdquo; date at the top of this page. Continuing to use
					Artmate after a change means you accept the updated Terms.
				</p>
			</LegalSection>

			<LegalSection heading="Contact">
				<p>
					Artmate is a non-commercial project built as part of the 42 curriculum. For any question
					about these Terms, contact the project team through the repository or the address provided
					in the project&rsquo;s README.
				</p>
			</LegalSection>
		</LegalPageLayout>
	);
}
