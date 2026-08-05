import { z } from "zod";
import { CATEGORIES } from "./constants";

// Only fields the backend's Gig model actually persists — title and category
// are required, the rest are optional.
export const opportunitySchema = z.object({
	title: z.string().min(1, "Title is required").max(120, "Keep the title under 120 characters"),
	category: z.enum(CATEGORIES, "Select a category"),
	description: z.string().max(2000, "Keep the description under 2000 characters"),
	location: z.string().max(120, "Keep the location under 120 characters"),
	rate: z.string().refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 0), {
		message: "Rate must be a whole number of 0 or more",
	}),
});

export type OpportunityFormValues = z.input<typeof opportunitySchema>;
export type OpportunityFormOutput = z.output<typeof opportunitySchema>;
