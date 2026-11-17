CREATE TABLE "closure_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"closure_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reason" text NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_closures" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"calculated_cash" integer NOT NULL,
	"calculated_transfer" integer NOT NULL,
	"actual_cash" integer NOT NULL,
	"actual_transfer" integer NOT NULL,
	"note" text,
	"closed_by" integer NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_closures_day_unique" UNIQUE("day")
);
--> statement-breakpoint
CREATE TABLE "parking_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"plate" varchar(6) NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exited_at" timestamp with time zone,
	"helmet" varchar(20) DEFAULT 'sin_especificar' NOT NULL,
	"billable_hours" integer,
	"amount" integer,
	"payment_method" varchar(20),
	"status" varchar(20) DEFAULT 'dentro' NOT NULL,
	"entry_user_id" integer NOT NULL,
	"exit_user_id" integer,
	"rate_id" integer
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"hourly_value" integer NOT NULL,
	"previous_value" integer,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"username" varchar(60) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'cuidador' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "closure_audits" ADD CONSTRAINT "closure_audits_closure_id_daily_closures_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."daily_closures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closure_audits" ADD CONSTRAINT "closure_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_record_id_parking_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."parking_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closures" ADD CONSTRAINT "daily_closures_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_records" ADD CONSTRAINT "parking_records_entry_user_id_users_id_fk" FOREIGN KEY ("entry_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_records" ADD CONSTRAINT "parking_records_exit_user_id_users_id_fk" FOREIGN KEY ("exit_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_records" ADD CONSTRAINT "parking_records_rate_id_rates_id_fk" FOREIGN KEY ("rate_id") REFERENCES "public"."rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_record_id_idx" ON "comments" USING btree ("record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_record_per_plate" ON "parking_records" USING btree ("plate") WHERE "parking_records"."status" = 'dentro';--> statement-breakpoint
CREATE INDEX "parking_records_entered_at_idx" ON "parking_records" USING btree ("entered_at");--> statement-breakpoint
CREATE INDEX "parking_records_exited_at_idx" ON "parking_records" USING btree ("exited_at");