import { 
  jobs, 
  fleets, 
  cabcoDrivers, 
  driverSessions,
  driverJobs,
  driverMessages,
  type Job, 
  type InsertJob, 
  type UpdateJob, 
  type Fleet, 
  type InsertFleet, 
  type CabcoDriver, 
  type InsertCabcoDriver, 
  type UpdateCabcoDriver,
  type DriverSession,
  type InsertDriverSession,
  type DriverJob,
  type InsertDriverJob,
  type DriverMessage,
  type InsertDriverMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  getJobByJobNumber(jobNumber: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: UpdateJob): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;
  
  // Fleets
  getFleets(): Promise<Fleet[]>;
  getFleet(id: number): Promise<Fleet | undefined>;
  createFleet(fleet: InsertFleet): Promise<Fleet>;
  updateFleet(id: number, fleet: Partial<InsertFleet>): Promise<Fleet | undefined>;
  deleteFleet(id: number): Promise<boolean>;
  
  // CABCO Drivers
  getCabcoDrivers(): Promise<CabcoDriver[]>;
  getCabcoDriver(id: number): Promise<CabcoDriver | undefined>;
  getCabcoDriverByVehicleId(vehicleId: string): Promise<CabcoDriver | undefined>;
  createCabcoDriver(driver: InsertCabcoDriver): Promise<CabcoDriver>;
  updateCabcoDriver(id: number, driver: Partial<UpdateCabcoDriver>): Promise<CabcoDriver | undefined>;
  updateCabcoDriverStatus(id: number, status: string): Promise<CabcoDriver | undefined>;
  updateCabcoDriverLocation(vehicleId: string, location: { lat: number; lng: number }): Promise<CabcoDriver | undefined>;
  deleteCabcoDriver(id: number): Promise<boolean>;
  
  // Driver Sessions (Mobile App)
  createDriverSession(session: InsertDriverSession): Promise<DriverSession>;
  getDriverSessionByToken(token: string): Promise<DriverSession | undefined>;
  getActiveDriverSession(vehicleId: string): Promise<DriverSession | undefined>;
  updateDriverSessionActivity(sessionId: number): Promise<DriverSession | undefined>;
  endDriverSession(sessionId: number): Promise<boolean>;
  
  // Driver Jobs (Mobile App)
  createDriverJob(job: InsertDriverJob): Promise<DriverJob>;
  getPendingJobsForDriver(driverId: number): Promise<DriverJob[]>;
  getDriverJob(id: number): Promise<DriverJob | undefined>;
  acceptDriverJob(jobId: number, driverId: number): Promise<DriverJob | undefined>;
  rejectDriverJob(jobId: number, driverId: number): Promise<DriverJob | undefined>;
  completeDriverJob(jobId: number, actualPrice?: string): Promise<DriverJob | undefined>;
  updateDriverJobStatus(jobId: number, status: string): Promise<DriverJob | undefined>;
  
  // Driver Messages (Mobile App)
  createDriverMessage(message: InsertDriverMessage): Promise<DriverMessage>;
  getDriverMessages(driverId: number): Promise<DriverMessage[]>;
  getJobMessages(jobId: number): Promise<DriverMessage[]>;
  markMessageAsRead(messageId: number): Promise<DriverMessage | undefined>;
  
  // Stats
  getJobStats(): Promise<{
    todaysJobs: number;
    completed: number;
    pending: number;
    revenue: number;
  }>;
}

export class MemStorage implements IStorage {
  private jobs: Map<number, Job>;
  private fleets: Map<number, Fleet>;
  private cabcoDrivers: Map<number, CabcoDriver>;
  private currentJobId: number;
  private currentFleetId: number;
  private currentDriverId: number;

  constructor() {
    this.jobs = new Map();
    this.fleets = new Map();
    this.cabcoDrivers = new Map();
    this.currentJobId = 1;
    this.currentFleetId = 1;
    this.currentDriverId = 1;
  }

  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobByJobNumber(jobNumber: string): Promise<Job | undefined> {
    return Array.from(this.jobs.values()).find(job => job.jobNumber === jobNumber);
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = this.currentJobId++;
    const now = new Date();
    const job: Job = {
      id,
      jobNumber: insertJob.jobNumber,
      date: insertJob.date,
      time: insertJob.time,
      pickup: insertJob.pickup,
      pickupZone: insertJob.pickupZone || null,
      destination: insertJob.destination,
      destinationZone: insertJob.destinationZone || null,
      via1: insertJob.via1 || null,
      via1Zone: insertJob.via1Zone || null,
      via1Note: insertJob.via1Note || null,
      via2: insertJob.via2 || null,
      via2Zone: insertJob.via2Zone || null,
      via2Note: insertJob.via2Note || null,
      via3: insertJob.via3 || null,
      via3Zone: insertJob.via3Zone || null,
      via3Note: insertJob.via3Note || null,
      via4: insertJob.via4 || null,
      via4Zone: insertJob.via4Zone || null,
      via4Note: insertJob.via4Note || null,
      via5: insertJob.via5 || null,
      via5Zone: insertJob.via5Zone || null,
      via5Note: insertJob.via5Note || null,
      via6: insertJob.via6 || null,
      via6Zone: insertJob.via6Zone || null,
      via6Note: insertJob.via6Note || null,
      customerName: insertJob.customerName,
      customerPhone: insertJob.customerPhone,
      customerAccount: insertJob.customerAccount,
      customerReference: insertJob.customerReference || null,
      passengers: insertJob.passengers ?? 1,
      luggage: insertJob.luggage ?? 0,
      vehicleType: insertJob.vehicleType,
      mobilityAids: insertJob.mobilityAids || null,
      capabilities: insertJob.capabilities || null,
      price: insertJob.price,
      priceLocked: insertJob.priceLocked || false,
      driverNotes: insertJob.driverNotes || null,
      status: insertJob.status || "pending",
      driver: insertJob.driver || null,
      distance: insertJob.distance || null,
      duration: insertJob.duration || null,
      waypoints: insertJob.waypoints || null,
      sentToAutocab: insertJob.sentToAutocab || false,
      autocabBookingId: insertJob.autocabBookingId || null,
      pickupNote: insertJob.pickupNote || null,
      pickupCode: insertJob.pickupCode || null,
      destinationNote: insertJob.destinationNote || null,
      destinationCode: insertJob.destinationCode || null,
      company: insertJob.company || null,
      phone: insertJob.phone || null,
      requestedDrivers: insertJob.requestedDrivers || null,
      account: insertJob.account || null,
      ourReference: insertJob.ourReference || null,
      priority: insertJob.priority || null,
      returnDate: insertJob.returnDate || null,
      returnTime: insertJob.returnTime || null,
      returnFlightInfo: insertJob.returnFlightInfo || null,
      estimatedPrice: insertJob.estimatedPrice || null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: number, updateJob: UpdateJob): Promise<Job | undefined> {
    const existingJob = this.jobs.get(id);
    if (!existingJob) return undefined;

    const updatedJob: Job = {
      ...existingJob,
      ...updateJob,
      updatedAt: new Date(),
    };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async getJobStats(): Promise<{
    todaysJobs: number;
    completed: number;
    pending: number;
    revenue: number;
  }> {
    const allJobs = Array.from(this.jobs.values());
    const today = new Date().toISOString().split('T')[0];
    
    const todaysJobs = allJobs.filter(job => job.date === today).length;
    const completed = allJobs.filter(job => job.sentToAutocab === true).length;
    const pending = allJobs.filter(job => job.sentToAutocab !== true).length;
    const revenue = allJobs
      .filter(job => job.sentToAutocab === true)
      .reduce((sum, job) => sum + parseFloat(job.price as string), 0);

    return {
      todaysJobs,
      completed,
      pending,
      revenue,
    };
  }

  // Fleet Management Methods
  async getFleets(): Promise<Fleet[]> {
    return Array.from(this.fleets.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getFleet(id: number): Promise<Fleet | undefined> {
    return this.fleets.get(id);
  }

  async createFleet(insertFleet: InsertFleet): Promise<Fleet> {
    const id = this.currentFleetId++;
    const now = new Date();
    const fleet: Fleet = {
      id,
      name: insertFleet.name,
      description: insertFleet.description || null,
      vehicleCallsigns: insertFleet.vehicleCallsigns || [],
      isActive: insertFleet.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.fleets.set(id, fleet);
    return fleet;
  }

  async updateFleet(id: number, updateFleet: Partial<InsertFleet>): Promise<Fleet | undefined> {
    const existing = this.fleets.get(id);
    if (!existing) return undefined;

    const updated: Fleet = {
      ...existing,
      ...updateFleet,
      updatedAt: new Date(),
    };
    this.fleets.set(id, updated);
    return updated;
  }

  async deleteFleet(id: number): Promise<boolean> {
    return this.fleets.delete(id);
  }

  // CABCO Drivers Methods
  async getCabcoDrivers(): Promise<CabcoDriver[]> {
    return Array.from(this.cabcoDrivers.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getCabcoDriver(id: number): Promise<CabcoDriver | undefined> {
    return this.cabcoDrivers.get(id);
  }

  async getCabcoDriverByVehicleId(vehicleId: string): Promise<CabcoDriver | undefined> {
    return Array.from(this.cabcoDrivers.values()).find(driver => driver.vehicleId === vehicleId);
  }

  async createCabcoDriver(insertDriver: InsertCabcoDriver): Promise<CabcoDriver> {
    const id = this.currentDriverId++;
    const now = new Date();
    const driver: CabcoDriver = {
      id,
      vehicleId: insertDriver.vehicleId,
      driverName: insertDriver.driverName,
      phoneNumber: insertDriver.phoneNumber || null,
      email: insertDriver.email || null,
      licenseNumber: insertDriver.licenseNumber || null,
      status: insertDriver.status || "offline",
      currentLocation: insertDriver.currentLocation || null,
      lastLocationUpdate: null,
      totalEarnings: insertDriver.totalEarnings || "0",
      todayEarnings: insertDriver.todayEarnings || "0",
      weeklyEarnings: insertDriver.weeklyEarnings || "0",
      totalJobs: 0,
      todayJobs: 0,
      rating: "5.00",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.cabcoDrivers.set(id, driver);
    return driver;
  }

  async updateCabcoDriver(id: number, updateDriver: Partial<UpdateCabcoDriver>): Promise<CabcoDriver | undefined> {
    const existing = this.cabcoDrivers.get(id);
    if (!existing) return undefined;

    const updated: CabcoDriver = {
      ...existing,
      ...updateDriver,
      updatedAt: new Date(),
    };
    this.cabcoDrivers.set(id, updated);
    return updated;
  }

  async updateCabcoDriverStatus(id: number, status: string): Promise<CabcoDriver | undefined> {
    const existing = this.cabcoDrivers.get(id);
    if (!existing) return undefined;

    const updated: CabcoDriver = {
      ...existing,
      status,
      updatedAt: new Date(),
    };
    this.cabcoDrivers.set(id, updated);
    return updated;
  }

  async updateCabcoDriverLocation(vehicleId: string, location: { lat: number; lng: number }): Promise<CabcoDriver | undefined> {
    const driver = Array.from(this.cabcoDrivers.values()).find(d => d.vehicleId === vehicleId);
    if (!driver) return undefined;

    const updated: CabcoDriver = {
      ...driver,
      currentLocation: JSON.stringify(location),
      lastLocationUpdate: new Date(),
      updatedAt: new Date(),
    };
    this.cabcoDrivers.set(driver.id, updated);
    return updated;
  }

  async deleteCabcoDriver(id: number): Promise<boolean> {
    return this.cabcoDrivers.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getJobs(): Promise<Job[]> {
    const jobsList = await db.select().from(jobs).orderBy(jobs.createdAt);
    return jobsList;
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async getJobByJobNumber(jobNumber: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.jobNumber, jobNumber));
    return job || undefined;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async updateJob(id: number, updateJob: UpdateJob): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ ...updateJob, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job || undefined;
  }

  async deleteJob(id: number): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return result.rowCount > 0;
  }

  async getJobStats(): Promise<{
    todaysJobs: number;
    completed: number;
    pending: number;
    revenue: number;
  }> {
    const allJobs = await db.select().from(jobs);
    const today = new Date().toISOString().split('T')[0];
    
    const todaysJobs = allJobs.filter(job => job.date === today).length;
    const completed = allJobs.filter(job => job.sentToAutocab === true).length;
    const pending = allJobs.filter(job => job.sentToAutocab !== true).length;
    const revenue = allJobs
      .filter(job => job.sentToAutocab === true)
      .reduce((sum, job) => sum + parseFloat(job.price), 0);

    return {
      todaysJobs,
      completed,
      pending,
      revenue,
    };
  }

  // Fleet Management Methods
  async getFleets(): Promise<Fleet[]> {
    const fleetsList = await db.select().from(fleets).orderBy(fleets.createdAt);
    return fleetsList;
  }

  async getFleet(id: number): Promise<Fleet | undefined> {
    const [fleet] = await db.select().from(fleets).where(eq(fleets.id, id));
    return fleet || undefined;
  }

  async createFleet(insertFleet: InsertFleet): Promise<Fleet> {
    const [fleet] = await db
      .insert(fleets)
      .values(insertFleet)
      .returning();
    return fleet;
  }

  async updateFleet(id: number, updateFleet: Partial<InsertFleet>): Promise<Fleet | undefined> {
    const [fleet] = await db
      .update(fleets)
      .set({ ...updateFleet, updatedAt: new Date() })
      .where(eq(fleets.id, id))
      .returning();
    return fleet || undefined;
  }

  async deleteFleet(id: number): Promise<boolean> {
    const result = await db.delete(fleets).where(eq(fleets.id, id));
    return result.rowCount > 0;
  }

  // CABCO Drivers Methods
  async getCabcoDrivers(): Promise<CabcoDriver[]> {
    const driversList = await db.select().from(cabcoDrivers).orderBy(cabcoDrivers.createdAt);
    return driversList;
  }

  async getCabcoDriver(id: number): Promise<CabcoDriver | undefined> {
    const [driver] = await db.select().from(cabcoDrivers).where(eq(cabcoDrivers.id, id));
    return driver || undefined;
  }

  async getCabcoDriverByVehicleId(vehicleId: string): Promise<CabcoDriver | undefined> {
    const [driver] = await db.select().from(cabcoDrivers).where(eq(cabcoDrivers.vehicleId, vehicleId));
    return driver || undefined;
  }

  async createCabcoDriver(insertDriver: InsertCabcoDriver): Promise<CabcoDriver> {
    const [driver] = await db
      .insert(cabcoDrivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async updateCabcoDriver(id: number, updateDriver: Partial<UpdateCabcoDriver>): Promise<CabcoDriver | undefined> {
    const [driver] = await db
      .update(cabcoDrivers)
      .set({ ...updateDriver, updatedAt: new Date() })
      .where(eq(cabcoDrivers.id, id))
      .returning();
    return driver || undefined;
  }

  async updateCabcoDriverStatus(id: number, status: string): Promise<CabcoDriver | undefined> {
    const [driver] = await db
      .update(cabcoDrivers)
      .set({ status, updatedAt: new Date() })
      .where(eq(cabcoDrivers.id, id))
      .returning();
    return driver || undefined;
  }

  async updateCabcoDriverLocation(vehicleId: string, location: { lat: number; lng: number }): Promise<CabcoDriver | undefined> {
    const [driver] = await db
      .update(cabcoDrivers)
      .set({ 
        currentLocation: JSON.stringify(location),
        lastLocationUpdate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cabcoDrivers.vehicleId, vehicleId))
      .returning();
    return driver || undefined;
  }

  async deleteCabcoDriver(id: number): Promise<boolean> {
    const result = await db.delete(cabcoDrivers).where(eq(cabcoDrivers.id, id));
    return result.rowCount > 0;
  }

  // Driver Sessions (Mobile App)
  async createDriverSession(session: InsertDriverSession): Promise<DriverSession> {
    const [newSession] = await db.insert(driverSessions).values(session).returning();
    return newSession;
  }

  async getDriverSessionByToken(token: string): Promise<DriverSession | undefined> {
    const [session] = await db.select().from(driverSessions)
      .where(and(eq(driverSessions.sessionToken, token), eq(driverSessions.isActive, true)));
    return session;
  }

  async getActiveDriverSession(vehicleId: string): Promise<DriverSession | undefined> {
    // First get the driver by vehicle ID
    const driver = await this.getCabcoDriverByVehicleId(vehicleId);
    if (!driver) return undefined;

    const [session] = await db.select().from(driverSessions)
      .where(and(eq(driverSessions.driverId, driver.id), eq(driverSessions.isActive, true)))
      .orderBy(desc(driverSessions.createdAt));
    return session;
  }

  async updateDriverSessionActivity(sessionId: number): Promise<DriverSession | undefined> {
    const [updatedSession] = await db.update(driverSessions)
      .set({ lastActivity: new Date() })
      .where(eq(driverSessions.id, sessionId))
      .returning();
    return updatedSession;
  }

  async endDriverSession(sessionId: number): Promise<boolean> {
    const [updatedSession] = await db.update(driverSessions)
      .set({ 
        isActive: false, 
        shiftEndTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(driverSessions.id, sessionId))
      .returning();
    return !!updatedSession;
  }

  // Driver Jobs (Mobile App)
  async createDriverJob(job: InsertDriverJob): Promise<DriverJob> {
    const [newJob] = await db.insert(driverJobs).values(job).returning();
    return newJob;
  }

  async getPendingJobsForDriver(driverId: number): Promise<DriverJob[]> {
    return await db.select().from(driverJobs)
      .where(and(eq(driverJobs.driverId, driverId), eq(driverJobs.status, 'pending')))
      .orderBy(desc(driverJobs.createdAt));
  }

  async getDriverJob(id: number): Promise<DriverJob | undefined> {
    const [job] = await db.select().from(driverJobs).where(eq(driverJobs.id, id));
    return job;
  }

  async acceptDriverJob(jobId: number, driverId: number): Promise<DriverJob | undefined> {
    const [updatedJob] = await db.update(driverJobs)
      .set({ 
        status: 'accepted',
        driverId: driverId,
        acceptedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(driverJobs.id, jobId))
      .returning();
    return updatedJob;
  }

  async rejectDriverJob(jobId: number, driverId: number): Promise<DriverJob | undefined> {
    const [updatedJob] = await db.update(driverJobs)
      .set({ 
        status: 'rejected',
        updatedAt: new Date()
      })
      .where(eq(driverJobs.id, jobId))
      .returning();
    return updatedJob;
  }

  async completeDriverJob(jobId: number, actualPrice?: string): Promise<DriverJob | undefined> {
    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    };
    
    if (actualPrice) {
      updateData.actualPrice = actualPrice;
    }

    const [updatedJob] = await db.update(driverJobs)
      .set(updateData)
      .where(eq(driverJobs.id, jobId))
      .returning();
    return updatedJob;
  }

  async updateDriverJobStatus(jobId: number, status: string): Promise<DriverJob | undefined> {
    const [updatedJob] = await db.update(driverJobs)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(driverJobs.id, jobId))
      .returning();
    return updatedJob;
  }

  // Driver Messages (Mobile App)
  async createDriverMessage(message: InsertDriverMessage): Promise<DriverMessage> {
    const [newMessage] = await db.insert(driverMessages).values(message).returning();
    return newMessage;
  }

  async getDriverMessages(driverId: number): Promise<DriverMessage[]> {
    return await db.select().from(driverMessages)
      .where(eq(driverMessages.fromDriverId, driverId))
      .orderBy(desc(driverMessages.createdAt));
  }

  async getJobMessages(jobId: number): Promise<DriverMessage[]> {
    return await db.select().from(driverMessages)
      .where(eq(driverMessages.jobId, jobId))
      .orderBy(desc(driverMessages.createdAt));
  }

  async markMessageAsRead(messageId: number): Promise<DriverMessage | undefined> {
    const [updatedMessage] = await db.update(driverMessages)
      .set({ isRead: true })
      .where(eq(driverMessages.id, messageId))
      .returning();
    return updatedMessage;
  }
}

export const storage = new DatabaseStorage();
