import { apiRequest } from "../../lib/apiClient";
import type { MatchDto } from "./types";

/** The caller's confirmed (mutual) matches — GET /api/matches. */
export async function listMatches(): Promise<MatchDto[]> {
	const { items } = await apiRequest<{ items: MatchDto[] }>("/matches");
	return items;
}

/**
 * Unmatch — DELETE /api/matches/:id. Cascades to the chat history on the
 * backend; the gig itself is left closed, there's no "reopen" flow.
 */
export function deleteMatch(matchId: string): Promise<void> {
	return apiRequest<void>(`/matches/${matchId}`, { method: "DELETE" });
}
