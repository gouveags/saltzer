ALTER TYPE "public"."outcome_event_type" ADD VALUE 'focus_started';--> statement-breakpoint
ALTER TYPE "public"."outcome_event_type" ADD VALUE 'progressed';--> statement-breakpoint
ALTER TYPE "public"."outcome_event_type" ADD VALUE 'blocked';--> statement-breakpoint
ALTER TYPE "public"."outcome_event_type" ADD VALUE 'focus_paused';--> statement-breakpoint
ALTER TABLE "outcomes" ADD COLUMN "next_action" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "outcomes" ADD COLUMN "focus_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outcomes" ADD COLUMN "last_progress_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "outcomes" ADD COLUMN "last_progress_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outcomes" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "outcomes_one_active_focus_per_user" ON "outcomes" USING btree ("user_id") WHERE "outcomes"."focus_started_at" is not null;