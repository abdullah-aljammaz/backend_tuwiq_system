import express, { Request, Response } from "express";
import { connectDB, prisma } from "../config/db";
import { Father, Son, Teacher, Class, Callout, Admin } from "@prisma/client";
import { authorize, protect } from "../middleware/auth";
import * as jwt from "jsonwebtoken";
import cors from "cors";

const argon2 = require("argon2");
const app = express();
app.use(express.json());

app.use(cors());

const PORT = 3003;



// login
async function login(req: Request, res: Response) {
  const { userType, email, password } = req.body;

  let user;
  switch (userType) {
    case "FATHER":
      user = await prisma.father.findFirst({
        where: { email: email },
      });
      break;
    case "TEACHER":
      user = await prisma.teacher.findFirst({
        where: { email: email },
      });
      break;
    case "ADMIN":
      user = await prisma.admin.findFirst({
        where: { email: email },
      });
      break;
    default:
      return res.status(400).json("Invalid user type");
  }

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

// Create Father
async function registerFather(req: Request, res: Response) {
  const NewFather = req.body as Father;
  const hashedPassword = await argon2.hash(NewFather.password);
  NewFather.password = hashedPassword;
  NewFather.role = "FATHER";

  try {
    await prisma.father.create({
      data: NewFather,
    });
    res.json("done");
  } catch (error) {
    res.json("something Wrong");
  }
}

async function getAllCallouts(req: Request, res: Response) {
  const all = await prisma.callout.findMany();
  res.json(all);
}

async function getAllFathers(req: Request, res: Response) {
  let fathers = await prisma.father.findMany({
    select: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      sons: {
        select: {
          id: true,
          yearofbirth: true,
          firstname: true,
          lastname: true,
        },
      },
    },
  });

  res.json(fathers);
}
async function createAdmin(req: Request, res: Response) {
  const NewAdmin = req.body as Admin;
  NewAdmin.role = "ADMIN";
  const hashedPassword = await argon2.hash(NewAdmin.password);
  NewAdmin.password = hashedPassword;
  NewAdmin.role = "ADMIN";

  try {
    await prisma.admin.create({
      data: NewAdmin,
    });
    res.json("done");
  } catch (error) {
    res.json("Something Wrong");
  }
}

async function createClass(req: Request, res: Response) {
  const {className, teacherId} = req.body;
  try {
    await prisma.class.create({
      data: {name: className},
    });
    await prisma.teacher.update({where:{id:teacherId}, data:{
      class_name:className
    }})
    res.json("Class Created");
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error });
  }
}

async function getAllClasses(req: Request, res: Response) {
  const classes = await prisma.class.findMany({
    select: {
      name: true,
      students: true,
      teachers: true,
    },
  });
  res.json(classes);
}
async function addTeacher(req: Request, res: Response) {
  const NewTeacher = req.body as Teacher;
  NewTeacher.role = "TEACHER";
  const hashedPassword = await argon2.hash(NewTeacher.password);
  NewTeacher.password = hashedPassword;
  NewTeacher.role = "TEACHER";
  let check = await prisma.teacher.findMany({
    where: { email: NewTeacher.email },
  });
  if (check.length > 0) {
    return res.status(400).json("Teacher Email All Rready Exists");
  }
  await prisma.teacher.create({
    data: NewTeacher,
  });

  res.json("done");
}

async function getAllTeachers(req: Request, res: Response) {
  const teachers = await prisma.teacher.findMany({});
  res.json(teachers);
}

async function createSon(req: Request, res: Response) {
  const user = res.locals.user;

  let newSon = req.body as Son;
  newSon.role = "SON";
  newSon.father_id = user.id;

  try {
    const son = await prisma.son.create({
      data: newSon,
    });

    res.status(201).json({
      message: "Son created successfully",
      son,
    });
  } catch (error) {
    console.error("Error creating son:", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}


function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance;
}

async function callStudent(req: Request, res: Response) {
  try {
    let user = res.locals.user;
    let { id } = req.params;
    let newCallOut = req.body as Callout;
    let check = await prisma.son.findFirst({
      where: { id: id },
      select: { class_name: true },
    });
    const userLocation = req.body.location;
    console.log(userLocation)
    const targetLat = 24.85387;
    const targetLon = 46.71298;

    if (!userLocation) {
      return res.status(400).json("Location data is required");
    }

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      targetLat,
      targetLon
    );
    console.log("should be over a range")
    if (distance > 500) {
      return res
        .status(403)
        .json("It should be over a range of 500 meters to order the son");
    }


    if (!check) {
      return res.status(404).json("Invalid class ID for the student.");
    }

    let class_name = check!.class_name;
    let teacher_id = await prisma.teacher.findMany({
      where: { class_name: class_name },
      select: { id: true },
    });

    if (!teacher_id || teacher_id.length === 0) {
      return res.status(404).json("The Teacher Is Not Found");
    }

    newCallOut.status = "Waiting";
    newCallOut.teacher_id = teacher_id[0].id;
    newCallOut.son_id = id;
    newCallOut.father_id = user.id;
    if (class_name) {
      newCallOut.class_name = class_name;
    }

    await prisma.callout.create({
      data: newCallOut,
    });

    res.json("Done");
  } catch (error) {
    console.error("Error creating callout:", error);
    return res.status(500).json("Internal Server Error");
  }
}
async function getAllStudent(req: Request, res: Response) {
  const sons = await prisma.son.findMany();
  res.json(sons);
}

async function getSonsByFather(req: Request, res: Response) {
  let user = res.locals.user;
  console.log(user.id);
  const sons = await prisma.son.findMany({ where: { father_id: user.id } });
  res.json(sons);
}

async function getMyCallouts(req: Request, res: Response) {
  const user = res.locals.user;

  const callouts = await prisma.callout.findMany({
    where: { teacher_id: user.id, status: "Waiting" },
  });

  res.json(callouts);
}
async function getFatherById(req: Request, res: Response) {
  const { id } = req.params;
  let father = await prisma.father.findFirst({ where: { id: id } });
  res.json(father);
}

async function getSonById(req: Request, res: Response) {
  const { id } = req.params;
  let son = await prisma.son.findFirst({ where: { id: id } });
  res.json(son);
}
async function sendOut(req: Request, res: Response) {
  const { calloutid } = req.params;

  const check = await prisma.callout.findUnique({ where: { id: calloutid } });
  if (!check) {
    return res.status(404).json("Callout not found");
  }

  const updatedCallout = await prisma.callout.update({
    where: { id: calloutid },
    data: {
      status: "SendOut",
    },
  });

  res.json("done");
}

async function setStudentClass(req: Request, res: Response) {
  try {

    let {class_name, student_id} = req.body;
    await prisma.son.update({
      where: { id: student_id },
      data: {
        class_name: class_name,
      },
    });
    res.json(`Student Is In ${class_name} now`);
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error });
  }
}

export {
  login,
  registerFather,
  getAllCallouts,
  createAdmin,
  getAllFathers,
  createClass,
  getAllClasses,
  addTeacher,
  getAllTeachers,
  createSon,
  callStudent,
  getAllStudent,
  getSonsByFather,
  getMyCallouts,
  getFatherById,
  sendOut,
  getSonById,
  setStudentClass,
};
