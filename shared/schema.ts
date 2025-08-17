import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  pickup: text("pickup").notNull(),
  pickupZone: text("pickup_zone"),
  destination: text("destination").notNull(),
  destinationZone: text("destination_zone"),
  via1: text("via1"),
  via1Zone: text("via1_zone"),
  via1Note: text("via1_note"),
  via2: text("via2"),
  via2Zone: text("via2_zone"),
  via2Note: text("via2_note"),
  via3: text("via3"),
  via3Zone: text("via3_zone"),
  via3Note: text("via3_note"),
  via4: text("via4"),
  via4Zone: text("via4_zone"),
  via4Note: text("via4_note"),
  via5: text("via5"),
  via5Zone: text("via5_zone"),
  via5Note: text("via5_note"),
  via6: text("via6"),
  via6Zone: text("via6_zone"),
  via6Note: text("via6_note"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull().default(''),
  customerAccount: text("customer_account").default(''),
  customerReference: text("customer_reference"),
  passengers: integer("passengers").notNull().default(1),
  luggage: integer("luggage").notNull().default(0),
  vehicleType: text("vehicle_type").notNull(),
  mobilityAids: text("mobility_aids"),
  capabilities: text("capabilities"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  priceLocked: boolean("price_locked").default(false),
  driverNotes: text("driver_notes"),
  status: text("status").notNull().default("pending"),
  driver: text("driver"),
  distance: text("distance"),
  duration: text("duration"),
  waypoints: integer("waypoints").default(0),
  sentToAutocab: boolean("sent_to_autocab").default(false),
  autocabBookingId: text("autocab_booking_id"),
  pickupNote: text("pickup_note"),
  pickupCode: text("pickup_code"),
  destinationNote: text("destination_note"),
  destinationCode: text("destination_code"),
  company: text("company"),
  phone: text("phone"),
  requestedDrivers: text("requested_drivers"),
  account: text("account"),
  ourReference: text("our_reference"),
  priority: text("priority"),
  returnDate: text("return_date"),
  returnTime: text("return_time"),
  returnFlightInfo: text("return_flight_info"),
  estimatedPrice: text("estimated_price"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fleet Management Schema
export const fleets = pgTable("fleets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  vehicleCallsigns: text("vehicle_callsigns").array().notNull().default('{}'), // Array of vehicle callsigns
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFleetSchema = createInsertSchema(fleets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  vehicleCallsigns: z.union([
    z.array(z.string()),
    z.string()
  ]).transform((val) => {
    // Convert string to array if it's a string
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    return val;
  }),
});

export type InsertFleet = z.infer<typeof insertFleetSchema>;
export type Fleet = typeof fleets.$inferSelect;

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  price: z.union([z.string(), z.number()]).transform((val) => {
    // Remove £ symbol and currency formatting for database
    const cleanPrice = String(val).replace(/[£$,]/g, '');
    return cleanPrice;
  }),
  customerAccount: z.string().optional().default(''),
});

export const updateJobSchema = insertJobSchema.partial();

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type UpdateJob = z.infer<typeof updateJobSchema>;

// CABCO Drivers Native System Schema
export const cabcoDrivers = pgTable("cabco_drivers", {
  id: serial("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().unique(), // e.g., "901", "902", etc.
  driverName: text("driver_name").notNull(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  licenseNumber: text("license_number"),
  status: text("status").notNull().default("offline"), // "online", "offline", "paused", "busy"
  currentLocation: text("current_location"), // JSON string with lat/lng
  lastLocationUpdate: timestamp("last_location_update"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),
  todayEarnings: decimal("today_earnings", { precision: 10, scale: 2 }).default("0"),
  weeklyEarnings: decimal("weekly_earnings", { precision: 10, scale: 2 }).default("0"),
  totalJobs: integer("total_jobs").default(0),
  todayJobs: integer("today_jobs").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCabcoDriverSchema = createInsertSchema(cabcoDrivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  currentLocation: z.string().optional(),
  totalEarnings: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  todayEarnings: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  weeklyEarnings: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
});

export type CabcoDriver = typeof cabcoDrivers.$inferSelect;
export type InsertCabcoDriver = z.infer<typeof insertCabcoDriverSchema>;
export type UpdateCabcoDriver = Partial<InsertCabcoDriver>;

// Driver Sessions for mobile app
export const driverSessions = pgTable("driver_sessions", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => cabcoDrivers.id),
  sessionToken: text("session_token").notNull().unique(),
  deviceId: text("device_id"),
  lastActivity: timestamp("last_activity").defaultNow(),
  shiftStartTime: timestamp("shift_start_time"),
  shiftEndTime: timestamp("shift_end_time"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver Jobs for job assignments
export const driverJobs = pgTable("driver_jobs", {
  id: serial("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  driverId: integer("driver_id").references(() => cabcoDrivers.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  pickup: text("pickup").notNull(),
  destination: text("destination").notNull(),
  via: text("via").array(),
  distance: text("distance"),
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, completed, cancelled
  priority: text("priority").notNull().default("normal"), // normal, high
  scheduledTime: timestamp("scheduled_time"),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  pickupCoordinates: text("pickup_coordinates"), // JSON string
  destinationCoordinates: text("destination_coordinates"), // JSON string
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver Messages for communication
export const driverMessages = pgTable("driver_messages", {
  id: serial("id").primaryKey(),
  fromDriverId: integer("from_driver_id").references(() => cabcoDrivers.id),
  toType: text("to_type").notNull(), // "dispatch", "customer"
  toId: text("to_id"), // customer phone or dispatch ID
  jobId: integer("job_id").references(() => driverJobs.id),
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, location, image
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverSessionSchema = createInsertSchema(driverSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDriverJobSchema = createInsertSchema(driverJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  estimatedPrice: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  actualPrice: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
});

export const insertDriverMessageSchema = createInsertSchema(driverMessages).omit({
  id: true,
  createdAt: true,
});

export type DriverSession = typeof driverSessions.$inferSelect;
export type InsertDriverSession = z.infer<typeof insertDriverSessionSchema>;
export type DriverJob = typeof driverJobs.$inferSelect;
export type InsertDriverJob = z.infer<typeof insertDriverJobSchema>;
export type DriverMessage = typeof driverMessages.$inferSelect;
export type InsertDriverMessage = z.infer<typeof insertDriverMessageSchema>;

// Keep existing users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
