import { delay } from "../../lib/delay";
import type { Opportunity } from "./types";
import type { OpportunityFormOutput } from "./schemas";

const DB_KEY = "artmate_db_opportunities";

function readOpportunities(): Opportunity[] {
	const raw = localStorage.getItem(DB_KEY);
	return raw ? (JSON.parse(raw) as Opportunity[]) : [];
}

function writeOpportunities(opportunities: Opportunity[]): void {
	localStorage.setItem(DB_KEY, JSON.stringify(opportunities));
}

export async function createOpportunity(
	hirerId: string,
	values: OpportunityFormOutput,
): Promise<Opportunity> {
	await delay(undefined);
	const opportunity: Opportunity = {
		...values,
		id: crypto.randomUUID(),
		hirerId,
		createdAt: new Date().toISOString(),
	};
	writeOpportunities([opportunity, ...readOpportunities()]);
	return opportunity;
}
