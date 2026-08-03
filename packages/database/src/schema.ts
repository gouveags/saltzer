import type { AiPermission } from "@saltzer/domain";
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const contractStatus = pgEnum("contract_status", ["open", "closed"]);
export const outcomeStatus = pgEnum("outcome_status", ["planned", "completed", "released"]);
export const outcomeEventType = pgEnum("outcome_event_type", [
  "created",
  "edited",
  "completed",
  "released",
  "rescheduled",
  "added_to_day",
]);

export const dailyContracts = pgTable(
  "daily_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    localDate: date("local_date", { mode: "string" }).notNull(),
    status: contractStatus("status").notNull().default("open"),
    capacityMinutes: integer("capacity_minutes"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("daily_contracts_user_date_unique").on(table.userId, table.localDate),
    index("daily_contracts_user_date_idx").on(table.userId, table.localDate),
  ],
);

export const outcomes = pgTable(
  "outcomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id").references(() => dailyContracts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    desiredOutcome: text("desired_outcome").notNull().default(""),
    context: text("context").notNull().default(""),
    constraints: text("constraints").notNull().default(""),
    estimateMinutes: integer("estimate_minutes"),
    aiPermissions: jsonb("ai_permissions")
      .$type<AiPermission[]>()
      .notNull()
      .default(sql`'["read_context", "suggest"]'::jsonb`),
    status: outcomeStatus("status").notNull().default("planned"),
    scheduledFor: date("scheduled_for", { mode: "string" }),
    position: integer("position").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("outcomes_contract_position_idx").on(table.contractId, table.position),
    index("outcomes_user_scheduled_idx").on(table.userId, table.scheduledFor),
    index("outcomes_user_status_idx").on(table.userId, table.status),
  ],
);

export const outcomeEvents = pgTable(
  "outcome_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outcomeId: uuid("outcome_id")
      .notNull()
      .references(() => outcomes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: outcomeEventType("type").notNull(),
    fromDate: date("from_date", { mode: "string" }),
    toDate: date("to_date", { mode: "string" }),
    note: text("note"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("outcome_events_outcome_created_idx").on(table.outcomeId, table.createdAt)],
);

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default(["daily:read", "daily:write"]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("api_tokens_user_id_idx").on(table.userId)],
);
