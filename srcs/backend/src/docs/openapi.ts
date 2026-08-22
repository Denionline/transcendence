export const openApiDocument = {
	openapi: "3.1.0",
	info: {
		title: "Artmate API",
		version: "1.0.0",
		description:
			"Public HTTP API for Artmate — the platform matching hirers' gigs with artists.\n\n" +
			"**Authentication.** Every endpoint below except `POST /auth/register` and " +
			"`POST /auth/login` requires a bearer access token. Obtain one from " +
			"`POST /auth/login`, then click **Authorize** above and paste it in. Access " +
			"tokens are short-lived; `POST /auth/refresh` issues a new one using the " +
			"httpOnly `refreshToken` cookie set at login.\n\n" +
			"**Errors.** All failures share one shape: `{ error, message }`, where `error` " +
			"is a stable machine-readable code (`VALIDATION_ERROR`, `GIG_NOT_FOUND`, …) and " +
			"`message` is a human-readable explanation. Match on `error`, never on `message`.",
	},
	servers: [{ url: "/api", description: "Current host" }],
	tags: [
		{ name: "Auth", description: "Registration, login and token lifecycle." },
		{ name: "Gigs", description: "Opportunities posted by hirers." },
	],

	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description:
					"Access token issued by `POST /auth/login`, sent as `Authorization: Bearer <token>`. " +
					"Rejected with `MISSING_TOKEN` when absent or malformed, `TOKEN_EXPIRED` once it " +
					"has aged out, and `INVALID_TOKEN` when the signature does not verify.",
			},
		},

		schemas: {
			Error: {
				type: "object",
				description: "Shape returned by every failing request.",
				required: ["error", "message"],
				properties: {
					error: {
						type: "string",
						description: "Stable machine-readable code. Branch on this.",
						examples: ["VALIDATION_ERROR"],
					},
					message: {
						type: "string",
						description: "Human-readable explanation. Wording may change; do not parse it.",
						examples: ["title is required and must be a string"],
					},
				},
			},

			Category: {
				type: "object",
				required: ["id", "slug", "label"],
				properties: {
					id: { type: "string", format: "uuid" },
					slug: {
						type: "string",
						description: "URL-safe identifier. Accepted as the `category` value on write.",
						examples: ["3d-animator"],
					},
					label: { type: "string", examples: ["3D animator"] },
				},
			},

			User: {
				type: "object",
				description: "Public projection of a user — never includes the password hash.",
				required: ["id", "email", "username", "role", "createdAt"],
				properties: {
					id: { type: "string", format: "uuid" },
					email: { type: "string", format: "email", examples: ["ana@example.com"] },
					username: { type: "string", examples: ["Ana Duarte"] },
					role: {
						type: "string",
						enum: ["artist", "hirer", "admin"],
						description: "Only hirers may create gigs; admins may edit or delete any gig.",
					},
					avatarUrl: { type: ["string", "null"], format: "uri" },
					createdAt: { type: "string", format: "date-time" },
				},
			},

			Session: {
				type: "object",
				description:
					"A logged-in user plus their access token. The refresh token is not in the body — " +
					"it is set as an httpOnly cookie scoped to `/api/auth`.",
				required: ["id", "email", "username", "role", "createdAt", "token"],
				properties: {
					id: { type: "string", format: "uuid" },
					email: { type: "string", format: "email" },
					username: { type: "string" },
					role: { type: "string", enum: ["artist", "hirer", "admin"] },
					avatarUrl: { type: ["string", "null"], format: "uri" },
					createdAt: { type: "string", format: "date-time" },
					token: {
						type: "string",
						description: "Short-lived JWT access token for the `Authorization` header.",
						examples: ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
					},
				},
			},

			Gig: {
				type: "object",
				required: ["id", "hirerId", "title", "categoryId", "category", "status", "createdAt"],
				properties: {
					id: { type: "string", format: "uuid" },
					hirerId: {
						type: "string",
						format: "uuid",
						description: "Owner of the gig. Only they (or an admin) may update or delete it.",
					},
					title: { type: "string", examples: ["Mural for a coworking space"] },
					description: { type: ["string", "null"] },
					categoryId: { type: "string", format: "uuid" },
					category: { $ref: "#/components/schemas/Category" },
					location: { type: ["string", "null"], examples: ["Lisbon"] },
					rate: {
						type: ["integer", "null"],
						minimum: 0,
						description: "Offered rate in whole currency units.",
						examples: [850],
					},
					status: { type: "string", enum: ["open", "closed"] },
					createdAt: { type: "string", format: "date-time" },
					hirer: {
						type: "object",
						properties: {
							username: { type: "string" },
							avatarUrl: { type: ["string", "null"], format: "uri" },
						},
					},
				},
			},

			GigPage: {
				type: "object",
				description: "One page of gigs. `total` counts every match, not just this page.",
				required: ["items", "page", "pageSize", "total"],
				properties: {
					items: { type: "array", items: { $ref: "#/components/schemas/Gig" } },
					page: { type: "integer", minimum: 1, examples: [1] },
					pageSize: { type: "integer", minimum: 1, maximum: 100, examples: [20] },
					total: { type: "integer", minimum: 0, examples: [37] },
				},
			},
		},

		responses: {
			Unauthorized: {
				description: "Missing, malformed or expired access token.",
				content: {
					"application/json": {
						schema: { $ref: "#/components/schemas/Error" },
						examples: {
							missing: {
								summary: "No Authorization header",
								value: {
									error: "MISSING_TOKEN",
									message: "Missing or malformed Authorization header",
								},
							},
							expired: {
								summary: "Access token aged out — call /auth/refresh",
								value: { error: "TOKEN_EXPIRED", message: "Token expired" },
							},
						},
					},
				},
			},
			GigNotFound: {
				description: "No gig exists with that id.",
				content: {
					"application/json": {
						schema: { $ref: "#/components/schemas/Error" },
						examples: {
							notFound: { value: { error: "GIG_NOT_FOUND", message: "gig not found" } },
						},
					},
				},
			},
		},
	},

	// Applies to every operation unless overridden with `security: []`.
	security: [{ bearerAuth: [] }],

	paths: {
		"/auth/register": {
			post: {
				tags: ["Auth"],
				summary: "Create an account",
				description:
					"Registers a user with a hashed password. Rate-limited to 5 accounts per hour per " +
					"IP address. Does **not** log the caller in — follow with `POST /auth/login`.",
				security: [],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["email", "password", "name", "role"],
								properties: {
									email: { type: "string", format: "email", examples: ["ana@example.com"] },
									password: {
										type: "string",
										format: "password",
										description: "Stored only as a bcrypt hash with a per-user salt.",
										examples: ["correct-horse-battery-staple"],
									},
									name: { type: "string", examples: ["Ana Duarte"] },
									role: { type: "string", enum: ["artist", "hirer"], examples: ["hirer"] },
								},
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Account created.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
					},
					"400": {
						description: "Invalid or incomplete registration details.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
					},
					"429": {
						description: "Registration rate limit exceeded for this IP.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
					},
				},
			},
		},

		"/auth/login": {
			post: {
				tags: ["Auth"],
				summary: "Log in and obtain an access token",
				description:
					"Returns the user plus a short-lived access token, and sets the `refreshToken` " +
					"httpOnly cookie used by `POST /auth/refresh`. Rate-limited to 10 attempts per " +
					"15 minutes per IP address.",
				security: [],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["email", "password"],
								properties: {
									email: { type: "string", format: "email", examples: ["ana@example.com"] },
									password: { type: "string", format: "password" },
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Authenticated. Copy `token` into **Authorize** to call the rest.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Session" } } },
					},
					"401": {
						description: "Wrong email or password.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
					},
					"429": {
						description: "Too many failed attempts from this IP.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
					},
				},
			},
		},

		"/gigs": {
			get: {
				tags: ["Gigs"],
				summary: "List gigs",
				description:
					"Returns a page of gigs, newest first. Any logged-in user may browse. Filtering by " +
					"a category that does not exist yields an empty page rather than an error.",
				parameters: [
					{
						name: "page",
						in: "query",
						description: "1-based page number. Out-of-range or unparseable values fall back to 1.",
						schema: { type: "integer", minimum: 1, default: 1 },
					},
					{
						name: "pageSize",
						in: "query",
						description: "Items per page. Values above 100 are clamped to 100.",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
					},
					{
						name: "status",
						in: "query",
						description: "Restrict to open or closed gigs. Unrecognised values are ignored.",
						schema: { type: "string", enum: ["open", "closed"] },
					},
					{
						name: "category",
						in: "query",
						description: "Category slug or label — slugified before matching.",
						schema: { type: "string" },
						example: "muralist",
					},
					{
						name: "mine",
						in: "query",
						description:
							"Present with any value to return only the caller's own gigs. Presence is what " +
							"counts, not the value.",
						schema: { type: "string" },
						example: "1",
					},
				],
				responses: {
					"200": {
						description: "A page of gigs.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/GigPage" } } },
					},
					"401": { $ref: "#/components/responses/Unauthorized" },
				},
			},

			post: {
				tags: ["Gigs"],
				summary: "Create a gig",
				description:
					"Only users with the `hirer` role may post gigs; anyone else is refused with " +
					"`FORBIDDEN`. `title` and `category` are required; the rest is optional.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["title", "category"],
								properties: {
									title: {
										type: "string",
										minLength: 1,
										description: "Trimmed before saving; cannot be blank.",
										examples: ["Mural for a coworking space"],
									},
									description: { type: "string" },
									category: {
										type: "string",
										description: "Category slug or label. Must resolve to an existing category.",
										examples: ["muralist"],
									},
									location: { type: "string", examples: ["Lisbon"] },
									rate: { type: "integer", minimum: 0, examples: [850] },
									status: { type: "string", enum: ["open", "closed"], default: "open" },
								},
							},
							examples: {
								minimal: {
									summary: "Only the required fields",
									value: { title: "Mural for a coworking space", category: "muralist" },
								},
								full: {
									summary: "Every field",
									value: {
										title: "Mural for a coworking space",
										description: "Two interior walls, roughly 40m² total.",
										category: "muralist",
										location: "Lisbon",
										rate: 850,
										status: "open",
									},
								},
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Gig created.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Gig" } } },
					},
					"400": {
						description: "A field failed validation, or the category does not exist.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
								examples: {
									missingTitle: {
										summary: "title absent or not a string",
										value: {
											error: "VALIDATION_ERROR",
											message: "title is required and must be a string",
										},
									},
									badRate: {
										summary: "rate not a non-negative integer",
										value: {
											error: "VALIDATION_ERROR",
											message: "rate must be a non-negative integer",
										},
									},
								},
							},
						},
					},
					"401": { $ref: "#/components/responses/Unauthorized" },
					"403": {
						description: "Caller is not a hirer.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
								examples: {
									notHirer: {
										value: { error: "FORBIDDEN", message: "only hirers can create gigs" },
									},
								},
							},
						},
					},
				},
			},
		},

		"/gigs/{id}": {
			parameters: [
				{
					name: "id",
					in: "path",
					required: true,
					description: "Gig id.",
					schema: { type: "string", format: "uuid" },
				},
			],

			get: {
				tags: ["Gigs"],
				summary: "Get one gig",
				description: "Readable by any logged-in user — no ownership check.",
				responses: {
					"200": {
						description: "The gig.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Gig" } } },
					},
					"401": { $ref: "#/components/responses/Unauthorized" },
					"404": { $ref: "#/components/responses/GigNotFound" },
				},
			},

			put: {
				tags: ["Gigs"],
				summary: "Update a gig",
				description:
					"Restricted to the gig's owner and admins. Send only the fields being changed — " +
					"omitted fields are left as they are. An empty body is rejected, since there would " +
					"be nothing to update.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								minProperties: 1,
								properties: {
									title: { type: "string", minLength: 1 },
									description: { type: "string" },
									category: { type: "string", examples: ["muralist"] },
									location: { type: "string" },
									rate: { type: "integer", minimum: 0 },
									status: { type: "string", enum: ["open", "closed"] },
								},
							},
							examples: {
								closeGig: {
									summary: "Close a filled gig",
									value: { status: "closed" },
								},
								repriceAndRetitle: {
									summary: "Change several fields at once",
									value: { title: "Mural — two interior walls", rate: 950 },
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Updated gig.",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Gig" } } },
					},
					"400": {
						description: "A field failed validation, or no updatable field was supplied.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
								examples: {
									emptyBody: {
										summary: "Nothing to update",
										value: { error: "VALIDATION_ERROR", message: "no valid fields to update" },
									},
								},
							},
						},
					},
					"401": { $ref: "#/components/responses/Unauthorized" },
					"403": {
						description: "Caller neither owns the gig nor is an admin.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
								examples: {
									notOwner: {
										value: { error: "FORBIDDEN", message: "you cannot update this gig" },
									},
								},
							},
						},
					},
					"404": { $ref: "#/components/responses/GigNotFound" },
				},
			},

			delete: {
				tags: ["Gigs"],
				summary: "Delete a gig",
				description:
					"Restricted to the gig's owner and admins. Cascades to the gig's swipes and matches.",
				responses: {
					"204": { description: "Deleted. No response body." },
					"401": { $ref: "#/components/responses/Unauthorized" },
					"403": {
						description: "Caller neither owns the gig nor is an admin.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
								examples: {
									notOwner: {
										value: { error: "FORBIDDEN", message: "you cannot delete this gig" },
									},
								},
							},
						},
					},
					"404": { $ref: "#/components/responses/GigNotFound" },
				},
			},
		},
	},
} as const;
