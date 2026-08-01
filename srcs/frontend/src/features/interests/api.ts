import { apiRequest } from "../../lib/apiClient";
import type { InterestDto } from "./types";

export async function sendInterest(recipientId: string): Promise<InterestDto> {
	return apiRequest<InterestDto>("/interests", {
		method: "POST",
		body: JSON.stringify({ recipientId }),
	});
}
