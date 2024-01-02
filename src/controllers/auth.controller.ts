import { User, Ticket, Event, Categories, Payment } from "@prisma/client";
import { connectDB, prisma } from "../config/db";
import { percant } from "../config/disc";
import express, { ErrorRequestHandler, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import cron from "node-cron";
import * as jwt from "jsonwebtoken";
const argon2 = require("argon2");
const app = express();
app.use(express.json());

async function deleteEventWhenFinish() {
  const eventTimeEnd = await prisma.event.findMany({
    where: {
      endDate: {
        lte: new Date(),
      },
    },
  });
  if (eventTimeEnd.length > 0) {
    await prisma.ticket.deleteMany({
      where: {
        eventId: {
          in: eventTimeEnd.map((event) => event.id),
        },
      },
    });
    await prisma.event.deleteMany({
      where: {
        id: {
          in: eventTimeEnd.map((event) => event.id),
        },
      },
    });
  }
}

async function deleteDiscoubtWhenFinish() {
  const discountEnd = await prisma.event.findMany({
    where: {
      discount_end: {
        lte: new Date(),
      },
    },
  });
  if (discountEnd.map((e) => e.discount_end) == null) {
    return false;
  } else {
    for (const event of discountEnd) {
      await prisma.event.update({
        where: { id: event.id },
        data: { discount: null, discount_end: null },
      });
    }
  }
}

cron.schedule("* * * * *", () => {
  deleteEventWhenFinish();
  deleteDiscoubtWhenFinish();
});
app.get("/events", async (req, res) => {
  const events = await prisma.event.findMany();
  res.json(events);
});
// Create Event
async function createEvent(req: Request, res: Response) {
  let newEvent = req.body as Event;
  let user = res.locals.user;

    let final = percant(Number(newEvent.price), Number(newEvent.discount));
    newEvent.final_price = String(final);
    newEvent.admin_id = user.id;
    await prisma.event.create({ data: newEvent });
    res.json("event added");

}

// Get All Events
async function getAllEvents(req: Request, res: Response) {
  let all_event = await prisma.event.findMany();
  res.json(all_event);
}

// Get Event With Id
async function getEventById(req: Request, res: Response) {
  const id = req.query.eventId as string;
  let event = await prisma.event.findFirst({ where: { id: id } });
  res.json(event);
}
async function getEventBycategory(req: Request, res: Response) {
  try {
    const rawCategory = req.query.category as string;
    // Validate and cast the rawCategory to the enum type
    const category: Categories | undefined =
      Categories[rawCategory as keyof typeof Categories];

    if (!category) {
      return res.status(400).json({
        message: "Invalid category",
      });
    }

    let events = await prisma.event.findMany({ where: { category } });
    res.json(events);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch events",
    });
  }
}

// update Event
async function updateEvent(req: Request, res: Response) {
  const { id } = req.params;
  try {
    let UpdataEvent = req.body as Event;
    await prisma.event.update({ where: { id: id }, data: UpdataEvent });
    res.json("Event Updated");
  } catch (error) {
    return res.status(401).json({
      message: "Faild Update Event",
    });
  }
}

// delete Event
async function deleteEvent(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.event.delete({ where: { id: id } });
  res.json("Event Deleted");
}
async function getEventWithPrice(req: Request, res: Response) {
  let EventPrice = req.body as Event;
  let event = await prisma.event.findMany({
    where: { price: EventPrice.price },
  });
  return res.json(event);
}

// Create User In Database
async function registerUser(req: Request, res: Response) {
  const newUser = req.body as User;
  const hashedPassword = await argon2.hash(newUser.password);

  newUser.password = hashedPassword;
  try {
    await prisma.user.create({
      data: newUser,
    });
    return res.status(201).json({
      message: "Welcome to the website ! , user added !",
    });
  } catch (error) {
    return res.status(401).json({
      message: "Email Is Already Use",
    });
  }
}

// login

async function loginUser(req: Request, res: Response) {
  const { email, password } = req.body as User;
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    return res.status(400).json({
      message: "Wrong email or password",
    });
  }

  const isValidPassword = await argon2.verify(user.password, password);

  if (!isValidPassword) {
    return res.status(400).json({
      message: "Wrong email or password",
    });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECERT as string
  );

  return res.status(200).json({
    message: `Welcome back ! ${email}`,
    token,
  });
}

// Get All users
async function getAllUsers(req: Request, res: Response) {
  let users = await prisma.user.findMany();
  res.json(users);
}
// Get User With Id
async function getUserById(req: Request, res: Response) {
  let { id } = req.params;
  let user = await prisma.user.findMany({
    where: { id: id },
    include: { event: true },
  });
  res.json(user);
}

// Delete User
async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.user.delete({ where: { id: id } });
  res.json("delete done");
}

// Update User
async function updateUser(req: Request, res: Response) {
  let { id } = req.params;
  let newDataUser = req.body as User;
  await prisma.user.update({ where: { id: id }, data: newDataUser });
  res.json("Updated done");
}

// add payment

async function addPayment(req: Request, res: Response) {
  let newPayment = req.body as Payment;
  const user = res.locals.user;
  newPayment.user_id = user.id;

  try {
    await prisma.payment.create({ data: newPayment });
    res.json("Payment added successfully");
  } catch (error) {
    console.error("Error adding payment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function list(req: Request, res: Response) {
  const user = res.locals.user;

  const todoList = await prisma.event.findMany({
    where: { admin_id: user.id },
  });

  return res.status(200).json(todoList);
}

async function createTicket(req: Request, res: Response) {
  let newTicket = req.body as Ticket;
  let user = res.locals.user;
  newTicket.bookedBy = user.id;
  let getFi = await prisma.event.findFirst({
    where: { id: newTicket.eventId },
    select: { final_price: true },
  });
  if (!getFi) {
    console.log(getFi);
    return res.status(400).json({
      message: "Price Have Issus",
    });
  }
  newTicket.price = getFi.final_price;
  newTicket.bookedBy = user.id;
  await prisma.ticket.create({
    data: newTicket,
  });
  res.json("Ticket Created");
}

async function getTicketByUser(req: Request, res: Response) {
  let user = res.locals.user;
  let allTicket = await prisma.ticket.findMany({
    where: { bookedBy: user.id },
  });
  res.json(allTicket);
}

async function getCardByUser(req: Request, res: Response) {
  let user = res.locals.user;
  let card = await prisma.payment.findFirst({
    where: { user_id: user.id },
  });
  res.json(card);
}
export {
  addPayment,
  getTicketByUser,
  updateUser,
  deleteUser,
  createEvent,
  getAllEvents,
  getEventById,
  getCardByUser,
  updateEvent,
  deleteEvent,
  getEventWithPrice,
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  getEventBycategory,
  createTicket,
};
