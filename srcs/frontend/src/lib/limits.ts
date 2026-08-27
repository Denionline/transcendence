//	A mirror of LIMITS in srcs/backend/src/lib/schemas.ts, and the only place
//	the client writes these numbers down. srcs/frontend/src/test/parity.test.ts
//	compares the two objects key by key, so a bound that moves on one side and
//	not the other fails the test run rather than becoming a 400 the form had no
//	way to predict.

export const LIMITS = {
	id: 64,
	//	RFC 5321's upper bound on a whole address.
	email: 254,
	username: 40,
	//	Titles, locations, organisation names.
	shortText: 120,
	//	Bios, gig descriptions, chat messages.
	longText: 2000,
	url: 2048,
	rate: 1_000_000,
} as const;
