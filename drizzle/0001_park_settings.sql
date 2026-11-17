CREATE TABLE "park_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" varchar(60) DEFAULT 'MotoPark' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "park_settings_single_row" CHECK ("park_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "park_settings" ADD CONSTRAINT "park_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;