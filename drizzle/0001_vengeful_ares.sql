CREATE TABLE `mindmitra_family_memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerKey` varchar(128) NOT NULL,
	`externalId` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`personName` varchar(160) NOT NULL,
	`memoryDate` varchar(64) NOT NULL,
	`language` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mindmitra_family_memories_id` PRIMARY KEY(`id`),
	CONSTRAINT `mindmitra_family_owner_external_idx` UNIQUE(`ownerKey`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `mindmitra_family_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerKey` varchar(128) NOT NULL,
	`memoryExternalId` varchar(128) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mindmitra_family_photos_id` PRIMARY KEY(`id`)
);
