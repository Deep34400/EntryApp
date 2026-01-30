import type { Express } from "express";
import { createServer, type Server } from "node:http";

const agents = [
  { name: "Agent Kumar", gate: "Gate A - Building 1" },
  { name: "Agent Singh", gate: "Gate B - Building 2" },
  { name: "Agent Patel", gate: "Gate C - Warehouse" },
  { name: "Agent Sharma", gate: "Gate D - Loading Bay" },
];

let tokenCounter = 1000;

interface Ticket {
  id: string;
  token: string;
  visitorType: string;
  name?: string;
  phone?: string;
  vehicleNumber?: string;
  driverId?: string;
  agentName: string;
  gate: string;
  status: "active" | "closed";
  createdAt: Date;
  closedAt?: Date;
}

const tickets: Map<string, Ticket> = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/tickets", (req, res) => {
    try {
      const { visitorType, name, phone, vehicleNumber, driverId } = req.body;

      if (!visitorType) {
        return res.status(400).json({ error: "Visitor type is required" });
      }

      tokenCounter++;
      const token = tokenCounter.toString();
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];

      const ticket: Ticket = {
        id: `ticket-${Date.now()}`,
        token,
        visitorType,
        name,
        phone,
        vehicleNumber,
        driverId,
        agentName: randomAgent.name,
        gate: randomAgent.gate,
        status: "active",
        createdAt: new Date(),
      };

      tickets.set(token, ticket);

      res.json({
        token: ticket.token,
        agentName: ticket.agentName,
        gate: ticket.gate,
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.post("/api/tickets/:token/close", (req, res) => {
    try {
      const { token } = req.params;
      const ticket = tickets.get(token);

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      if (ticket.status === "closed") {
        return res.status(400).json({ error: "Ticket already closed" });
      }

      ticket.status = "closed";
      ticket.closedAt = new Date();
      tickets.set(token, ticket);

      res.json({ success: true, message: "Ticket closed successfully" });
    } catch (error) {
      console.error("Error closing ticket:", error);
      res.status(500).json({ error: "Failed to close ticket" });
    }
  });

  app.get("/api/tickets/:token", (req, res) => {
    try {
      const { token } = req.params;
      const ticket = tickets.get(token);

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  app.get("/api/tickets", (req, res) => {
    try {
      const allTickets = Array.from(tickets.values());
      res.json(allTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
