ALTER TABLE `brand_kit_revision` ADD `revision_type` text DEFAULT 'initial' NOT NULL;--> statement-breakpoint
ALTER TABLE `brand_kit_revision` ADD `section_id` text;--> statement-breakpoint
ALTER TABLE `brand_kit_revision` ADD `target_item_id` text;--> statement-breakpoint
ALTER TABLE `brand_kit_revision` ADD `source_revision_id` text;--> statement-breakpoint
UPDATE `brand_kit_revision`
SET
	`revision_type` = CASE
		WHEN `trigger_type` = 'initial_generation' THEN 'initial'
		WHEN `trigger_type` LIKE 'refine_%' THEN 'refinement'
		WHEN `trigger_type` LIKE 'restore_full:%' THEN 'full_restore'
		WHEN `trigger_type` LIKE 'restore_%' THEN 'section_restore'
		ELSE 'initial'
	END,
	`section_id` = CASE
		WHEN `trigger_type` LIKE 'refine_%:%' THEN substr(substr(`trigger_type`, 8), 1, instr(substr(`trigger_type`, 8), ':') - 1)
		WHEN `trigger_type` LIKE 'restore_%' AND `trigger_type` NOT LIKE 'restore_full:%' THEN substr(`trigger_type`, 9)
		ELSE NULL
	END,
	`source_revision_id` = CASE
		WHEN `trigger_type` LIKE 'restore_full:%' THEN substr(`trigger_type`, 14)
		ELSE NULL
	END,
	`label` = COALESCE(
		`label`,
		CASE
			WHEN `trigger_type` = 'initial_generation' THEN 'Initial generation'
			WHEN `trigger_type` LIKE 'refine_%:%' THEN 'Refined ' || replace(substr(substr(`trigger_type`, 8), 1, instr(substr(`trigger_type`, 8), ':') - 1), '-', ' ')
			WHEN `trigger_type` LIKE 'restore_full:%' THEN 'Restored full kit'
			WHEN `trigger_type` LIKE 'restore_%' THEN 'Restored ' || replace(substr(`trigger_type`, 9), '-', ' ')
			ELSE 'Brand kit version'
		END
	);--> statement-breakpoint
CREATE UNIQUE INDEX `brand_kit_refinement_result_revision_unique` ON `brand_kit_refinement` (`result_revision_id`);
