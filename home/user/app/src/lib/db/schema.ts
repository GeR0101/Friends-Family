import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  pairCode: text("pair_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => families.id)
    .notNull(),
  role: text("role", { enum: ["kid", "parent"] }).notNull(),
  name: text("name").notNull(),
  pushToken: text("push_token"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => families.id)
    .notNull(),
  kidDeviceId: uuid("kid_device_id")
    .references(() => devices.id)
    .notNull(),
  status: text("status", {
    enum: [
      "REQUESTED",
      "NOTIFIED",
      "ACCEPTED",
      "IN_CALL",
      "TIMEOUT",
      "DECLINED",
      "ENDED",
    ],
  })
    .notNull()
    .default("REQUESTED"),
  roomName: text("room_name").notNull(),
  roomUrl: text("room_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  endedAt: timestamp("ended_at"),
});

export type Family = typeof families.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type CallStatus = Call["status"];
