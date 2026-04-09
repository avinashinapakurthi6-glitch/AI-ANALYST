CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`userId` int NOT NULL,
	`query` text NOT NULL,
	`result` text,
	`chartType` varchar(50),
	`chartConfig` json,
	`status` enum('pending','completed','failed') DEFAULT 'pending',
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`ownerId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`rowCount` int,
	`columnCount` int,
	`columnNames` json,
	`isAnonymized` boolean DEFAULT false,
	`piiColumns` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `datasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `piiDetectionLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`detectedColumns` json,
	`severity` enum('low','medium','high') DEFAULT 'medium',
	`notified` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `piiDetectionLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','analyst','viewer') NOT NULL DEFAULT 'viewer';