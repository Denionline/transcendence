import { z } from "zod";

export const opportunitySchema = z.object({
	title: z.string().min(1, "Title is required").max(120, "Keep the title under 120 characters"),
	description: z
		.string()
		.min(1, "Description is required")
		.max(2000, "Keep the description under 2000 characters"),
	workTypes: z.array(z.string()).min(1, "Select at least one work type"),
	duration: z.string().min(1, "Duration is required"),
	commitment: z.enum(["on-site", "remote", "hybrid"]),
	location: z.string().min(1, "Location is required"),
});

export type OpportunityFormValues = z.input<typeof opportunitySchema>;
export type OpportunityFormOutput = z.output<typeof opportunitySchema>;
