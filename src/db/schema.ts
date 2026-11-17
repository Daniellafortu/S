import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("cuidador"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parkSettings = pgTable("park_settings", {
  id: integer("id").primaryKey().default(1),
  name: varchar("name", { length: 60 }).notNull().default("MotoPark"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
}, (table) => [check("park_settings_single_row", sql`${table.id} = 1`)]);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const rates = pgTable("rates", {
  id: serial("id").primaryKey(),
  hourlyValue: integer("hourly_value").notNull(),
  previousValue: integer("previous_value"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

export const parkingRecords = pgTable("parking_records", {
  id: serial("id").primaryKey(),
  plate: varchar("plate", { length: 6 }).notNull(),
  enteredAt: timestamp("entered_at", { withTimezone: true }).notNull().defaultNow(),
  exitedAt: timestamp("exited_at", { withTimezone: true }),
  helmet: varchar("helmet", { length: 20 }).notNull().default("sin_especificar"),
  billableHours: integer("billable_hours"),
  amount: integer("amount"),
  paymentMethod: varchar("payment_method", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default("dentro"),
  entryUserId: integer("entry_user_id").notNull().references(() => users.id),
  exitUserId: integer("exit_user_id").references(() => users.id),
  rateId: integer("rate_id").references(() => rates.id),
}, (table) => [
  uniqueIndex("one_active_record_per_plate").on(table.plate).where(sql`${table.status} = 'dentro'`),
  index("parking_records_entered_at_idx").on(table.enteredAt),
  index("parking_records_exited_at_idx").on(table.exitedAt),
]);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull().references(() => parkingRecords.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  userId: integer("user_id").notNull().references(() => users.id),
}, (table) => [index("comments_record_id_idx").on(table.recordId)]);

export const dailyClosures = pgTable("daily_closures", {
  id: serial("id").primaryKey(),
  day: date("day").notNull().unique(),
  calculatedCash: integer("calculated_cash").notNull(),
  calculatedTransfer: integer("calculated_transfer").notNull(),
  actualCash: integer("actual_cash").notNull(),
  actualTransfer: integer("actual_transfer").notNull(),
  note: text("note"),
  closedBy: integer("closed_by").notNull().references(() => users.id),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const closureAudits = pgTable("closure_audits", {
  id: serial("id").primaryKey(),
  closureId: integer("closure_id").notNull().references(() => dailyClosures.id),
  userId: integer("user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  before: jsonb("before").notNull(),
  after: jsonb("after").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
