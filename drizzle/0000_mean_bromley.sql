CREATE TABLE `mindmitra_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerKey` varchar(128) NOT NULL,
	`activityType` varchar(64) NOT NULL,
	`memoryExternalId` varchar(128),
	`game` varchar(32),
	`score` int,
	`accuracy` int,
	`language` varchar(16),
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mindmitra_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mindmitra_memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerKey` varchar(128) NOT NULL,
	`externalId` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(80) NOT NULL,
	`memoryDate` varchar(64) NOT NULL,
	`memoryTime` varchar(32),
	`language` varchar(16),
	`source` varchar(16) NOT NULL DEFAULT 'typed',
	`pinned` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mindmitra_memories_id` PRIMARY KEY(`id`),
	CONSTRAINT `mindmitra_owner_external_idx` UNIQUE(`ownerKey`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
