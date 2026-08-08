// Swipe matching is an exact string comparison against ArtistProfile.category
// (see backend swipe.service.ts), so this list has to mirror the real
// category values artist profiles are actually seeded/created with — not an
// independent, free-form picklist. Keep it in sync with that vocabulary.
export const CATEGORIES = [
	"3D animator",
	"Calligrapher",
	"Ceramicist",
	"Collage artist",
	"Comic artist",
	"Concept artist",
	"Fashion illustrator",
	"Graphic designer",
	"Illustrator",
	"Installation artist",
	"Jewelry designer",
	"Motion designer",
	"Muralist",
	"Painter",
	"Photographer",
	"Portrait painter",
	"Printmaker",
	"Puppet maker",
	"Sculptor",
	"Set designer",
	"Sound artist",
	"Street artist",
	"Tattoo artist",
	"Textile artist",
	"Videographer",
] as const;

export const DURATION_PRESETS = [
	"~1 week",
	"~2 weeks",
	"~3 weeks",
	"~1 month",
	"~2-3 months",
	"3+ months",
] as const;

export const TAGS = [
	"Mural",
	"Illustration",
	"Botanical",
	"Editorial",
	"3D/Motion",
	"Set design",
	"Lettering",
	"Large-scale",
] as const;

export const MAX_TAGS = 4;
