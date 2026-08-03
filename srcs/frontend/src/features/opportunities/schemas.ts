import { z } from "zod";
import { CATEGORIES, DURATION_PRESETS, MAX_TAGS } from "./constants";

export const opportunitySchema = z.object({
	title: z.string().min(1, "Title is required").max(120, "Keep the title under 120 characters"),
	category: z.enum(CATEGORIES, "Select a category"),
	duration: z.enum(DURATION_PRESETS, "Select a duration"),
	description: z
		.string()
		.min(1, "Description is required")
		.max(2000, "Keep the description under 2000 characters"),
	applicationsClose: z.string().min(1, "Pick an applications-close date"),
	location: z.string().min(1, "Location is required"),
	remoteOk: z.boolean(),
	tags: z
		.array(z.string())
		.min(1, "Select at least one tag")
		.max(MAX_TAGS, `Select up to ${MAX_TAGS} tags`),
});

export type OpportunityFormValues = z.input<typeof opportunitySchema>;
export type OpportunityFormOutput = z.output<typeof opportunitySchema>;
