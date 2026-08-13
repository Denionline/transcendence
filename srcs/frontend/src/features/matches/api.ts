import { apiRequest } from "../../lib/apiClient";
import type { MatchDto } from "./types";

/** The caller's confirmed (mutual) matches — GET /api/matches. */
export async function listMatches(): Promise<MatchDto[]> {
	const { items } = await apiRequest<{ items: MatchDto[] }>("/matches");
	return items;
}
