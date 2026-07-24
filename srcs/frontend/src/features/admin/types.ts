import type { User } from "../auth/types";

export type ManagedUser = User & { isActive: boolean };
