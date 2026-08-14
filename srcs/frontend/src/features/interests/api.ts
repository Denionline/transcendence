import { apiRequest } from "../../lib/apiClient";
import { postSwipe } from "../swipes/api";
import type { SwipeResult } from "../swipes/types";
import type { PendingInterestDto } from "./types";

/** Likes received that the caller hasn't answered yet — see GET /swipes/interests. */
export async function listPendingInterests(): Promise<PendingInterestDto[]> {
	const { items } = await apiRequest<{ items: PendingInterestDto[] }>("/swipes/interests");
	return items;
}

/**
 * Accept or decline a pending interest. Under the hood this is just the same
 * swipe the rest of the app records — "accepting" is a like back (creating
 * the match), "declining" is a pass. `targetUserId` is harmless to send even
 * as an artist; the backend only reads it for a hirer's swipe.
 */
export function respondToInterest(
	interest: PendingInterestDto,
	liked: boolean,
): Promise<SwipeResult> {
	return postSwipe({ gigId: interest.gigId, liked, targetUserId: interest.otherUser.id });
}
