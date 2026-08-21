export type NotificationType =
	"new_match" | "new_message" | "gig_closed" | "swipe_liked" | "new_invite" | "invite_accepted";

export interface NotificationActor {
	id: string;
	displayName: string;
	avatarUrl: string | null;
}

export interface NotificationDto {
	id: string;
	type: NotificationType;
	isRead: boolean;
	createdAt: string;
	actor?: NotificationActor;
	matchId?: string;
	gigId?: string;
	gigTitle?: string;
	preview?: string;
}
