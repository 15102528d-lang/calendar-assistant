CREATE TABLE `calendar_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shareId` varchar(64) NOT NULL,
	`icsContent` text NOT NULL,
	`eventCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `calendar_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `calendar_shares_shareId_unique` UNIQUE(`shareId`)
);
--> statement-breakpoint
CREATE TABLE `extracted_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(32),
	`startTime` varchar(16),
	`endTime` varchar(16),
	`title` text,
	`location` text,
	`startLocation` text,
	`endLocation` text,
	`notes` text,
	`confidence` int DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extracted_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`fileType` varchar(64) NOT NULL,
	`fileSize` int NOT NULL,
	`fileUrl` text,
	`fileKey` varchar(512),
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`rawText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `upload_records_id` PRIMARY KEY(`id`)
);
