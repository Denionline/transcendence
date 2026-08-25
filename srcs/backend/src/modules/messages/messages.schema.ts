import { z } from "zod";
import { LIMITS, id, requiredParagraph } from "../../lib/schemas.js";

const content = requiredParagraph("content", LIMITS.longText);

export const createMessageBody = z.object({ content });

export const sendMessageEvent = z.object({ matchId: id, content });

export type CreateMessageBody = z.infer<typeof createMessageBody>;
