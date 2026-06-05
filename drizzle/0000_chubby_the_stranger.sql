CREATE TABLE `price_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`open` decimal(12,6) NOT NULL,
	`high` decimal(12,6) NOT NULL,
	`low` decimal(12,6) NOT NULL,
	`close` decimal(12,6) NOT NULL,
	`volume` int,
	`timeframe` varchar(10) NOT NULL,
	CONSTRAINT `price_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`modelId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`side` enum('BUY','SELL') NOT NULL,
	`entryPrice` decimal(12,6) NOT NULL,
	`exitPrice` decimal(12,6),
	`quantity` decimal(12,4) NOT NULL,
	`stopLoss` decimal(12,6) NOT NULL,
	`takeProfit` decimal(12,6),
	`riskAmount` decimal(12,2) NOT NULL,
	`profitLoss` decimal(12,2),
	`profitLossPercent` decimal(8,4),
	`status` enum('open','closed','cancelled') DEFAULT 'open',
	`reason` varchar(255),
	`entryTime` timestamp NOT NULL,
	`exitTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`modelType` varchar(50) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`accuracy` decimal(5,4),
	`winRate` decimal(5,4),
	`profitFactor` decimal(8,4),
	`modelPath` text,
	`hyperparameters` json,
	`trainingMetrics` json,
	`status` enum('training','active','archived') DEFAULT 'training',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trading_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`modelId` int NOT NULL,
	`sessionType` enum('backtest','live','simulation') NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`initialCapital` decimal(12,2) NOT NULL,
	`finalBalance` decimal(12,2),
	`totalTrades` int DEFAULT 0,
	`winningTrades` int DEFAULT 0,
	`losingTrades` int DEFAULT 0,
	`winRate` decimal(5,4),
	`totalProfit` decimal(12,2),
	`totalReturn` decimal(8,4),
	`maxDrawdown` decimal(8,4),
	`sharpeRatio` float,
	`profitFactor` decimal(8,4),
	`status` enum('running','completed','stopped') DEFAULT 'running',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trading_sessions_id` PRIMARY KEY(`id`)
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
