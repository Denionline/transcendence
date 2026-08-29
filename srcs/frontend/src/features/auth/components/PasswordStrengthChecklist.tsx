import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const COMMON_PASSWORDS = [
	"password",
	"passw0rd",
	"qwerty",
	"azerty",
	"123456",
	"12345678",
	"letmein",
	"welcome",
	"iloveyou",
	"admin",
	"artmate",
	"transcendence",
];

const MIN_PERSONAL_TOKEN_LENGTH = 4;

interface PasswordStrengthChecklistProps {
	password: string;
	name: string;
	email: string;
}

function personalTokens(name: string, email: string) {
	const localPart = email.split("@")[0] ?? "";
	return [localPart, name]
		.map((token) => token.trim().toLowerCase())
		.filter((token) => token.length >= MIN_PERSONAL_TOKEN_LENGTH);
}

function getRules(password: string, name: string, email: string) {
	const lowered = password.toLowerCase();
	return [
		{ id: "minLength", passed: password.length >= 12 },
		{ id: "lowercase", passed: /[a-z]/.test(password) },
		{ id: "uppercase", passed: /[A-Z]/.test(password) },
		{ id: "digit", passed: /[0-9]/.test(password) },
		{ id: "symbol", passed: /[^a-zA-Z0-9]/.test(password) },
		{
			id: "notCommon",
			passed: password.length > 0 && !COMMON_PASSWORDS.some((common) => lowered.includes(common)),
		},
		{
			id: "notPersonal",
			passed:
				password.length > 0 &&
				!personalTokens(name, email).some((token) => lowered.includes(token)),
		},
	];
}

export default function PasswordStrengthChecklist({
	password,
	name,
	email,
}: PasswordStrengthChecklistProps) {
	const { t } = useTranslation();

	if (!password) return null;

	const rules = getRules(password, name, email);

	return (
		<ul className="mt-2 flex flex-col gap-1">
			{rules.map((rule) => (
				<li
					key={rule.id}
					className={`flex items-center gap-2 text-xs ${
						rule.passed ? "text-success" : "text-base-content/50"
					}`}
				>
					{rule.passed ? <Check size={12} /> : <X size={12} />}
					{t(`password.${rule.id}`)}
				</li>
			))}
		</ul>
	);
}
