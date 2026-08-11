// Categories are no longer listed here. They live in the database and are
// served by GET /api/categories — see useCategories(). Keeping a copy in the
// frontend is what made the old list drift out of sync with the real values.

export const DURATION_PRESETS = [
	"~1 week",
	"~2 weeks",
	"~3 weeks",
	"~1 month",
	"~2-3 months",
	"3+ months",
] as const;
