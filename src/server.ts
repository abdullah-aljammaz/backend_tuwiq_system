import express, { Request, Response } from "express";
import { connectDB, prisma } from "./config/db";
import { Father, Son, Teacher, Class, Callout, Admin } from "@prisma/client";
import { authorize, protect } from "./middleware/auth";
import * as jwt from "jsonwebtoken";
import cors from "cors";
const argon2 = require("argon2");

const app = express();
app.use(express.json());

app.use(cors());

const PORT = 3003;

app.post("/login", async (req: Request, res: Response) => {
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
});
// Father requests

app.post("/createFather", async (req: Request, res: Response) => {
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
});

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

// app.post(
//   "/bringmysonout/:sonId",
//   protect,
//   authorize("FATHER"),
//   async (req, res) => {
//     const { sonId } = req.params;
//     // const userLocation = req.body.location;
//     const user = res.locals.user;

//     // const targetLat = 24.85387;
//     // const targetLon = 46.71298;

//     // if (!userLocation) {
//     //   return res.status(400).json("Location data is required");
//     // }

//     // const distance = calculateDistance(
//     //   userLocation.latitude,
//     //   userLocation.longitude,
//     //   targetLat,
//     //   targetLon
//     // );
//     // if (distance > 500) {
//     //   return res
//     //     .status(403)
//     //     .json("It should be over a range of 500 meters to order the son");
//     // }

//     // const father = await prisma.father.findUnique({
//     //   where: { id: user.id },
//     //   select: { username: true },
//     // });

//     // if (!father) {
//     //   return res.status(401).json("You are not authorized as a father");
//     // }

//     const isSonConnectedToFather = await prisma.son.findFirst({
//       where: {
//         id: sonId,
//         father_id: user.id,
//       },
//     });

//     if (!isSonConnectedToFather) {
//       return res.status(401).json("You are not the father of this son");
//     }

//     let son = await prisma.son.findMany({
//       where: { id: sonId },
//       select: { class_id: true },
//     });

//     if (!son || son.length === 0) {
//       return res.status(404).json("Son not found");
//     }

//     res.json("done");
//   }
// );

// admin requests

app.get(
  "/getallCallouts",
  protect,
  authorize("ADMIN"),
  async (req: Request, res: Response) => {
    const all = await prisma.callout.findMany();
    res.json(all);
  }
);

app.get(
  "/getAllFathers",
  protect,
  authorize("ADMIN"),
  async (req: Request, res: Response) => {
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
);

app.post(
  "/createAdmin",
  // protect,
  // authorize("ADMIN"),
  async (req: Request, res: Response) => {
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
);

app.get(
  "/getallAdmins",
  protect,
  authorize("ADMIN"),
  async (req: Request, res: Response) => {
    const admins = await prisma.admin.findMany();
    res.json(admins);
  }
);

app.post(
  "/createclass",
  protect,
  authorize("ADMIN"),
  async (req: Request, res: Response) => {
    const NewClass = req.body as Class;

    try {
      const classCreated = await prisma.class.create({
        data: NewClass,
      });
      res.json(classCreated);
    } catch (error) {
      res.status(500).json({ message: "An error occurred", error });
    }
  }
);

app.get(
  "/getallclasses",
  protect,
  authorize("ADMIN"),
  async (req: Request, res: Response) => {
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        students: true,
        teachers: true,
      },
    });
    res.json(classes);
  }
);

app.post(
  "/createteacher",
  protect,
  authorize("ADMIN"),
  async (req: Request, res: Response) => {
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
);

app.get(
  "/getallteachers",
  protect,
  authorize("ADMIN"),
  async (req: Request, res: Response) => {
    const teachers = await prisma.teacher.findMany({});
    res.json(teachers);
  }
);
app.post(
  "/createSon",
  protect,
  authorize("FATHER", "ADMIN"),
  async (req: Request, res: Response) => {
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
);

app.post(
  "/callMySon/:id",
  protect,
  authorize("FATHER"),
  async (req: Request, res: Response) => {
    try {
      let user = res.locals.user;
      let { id } = req.params;
      let newCallOut = req.body as Callout;
      let check = await prisma.son.findFirst({
        where: { id: id },
        select: { class_id: true },
      });
      //       let check = await prisma.class.findFirst({
      //         select: { students: { where: { id: id }, select: { class_id: true } } },
      // });
      console.log("id:", id);
      console.log("check2:", check!.class_id);
      console.log("Check:", check);

      if (!check) {
        return res.status(404).json("Invalid class ID for the student.");
      }

      let class_id = check!.class_id;
      let teacher_id = await prisma.teacher.findMany({
        where: { class_id: class_id },
        select: { id: true },
      });

      if (!teacher_id || teacher_id.length === 0) {
        return res.status(404).json("The Teacher Is Not Found");
      }
      
      newCallOut.status = "Waiting";
      newCallOut.teacher_id = teacher_id[0].id;
      newCallOut.son_id = id;
      newCallOut.father_id = user.id;
      if (class_id){
        newCallOut.class_id = class_id;
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
);



app.get("/getallsons", protect, async (req: Request, res: Response) => {
  try{
  const sons = await prisma.son.findMany();
  res.json(sons);
  }
  catch(error){
    res.status(500).json({ message: "An error occurred", error });
  }
});
app.put("/setStudentInClass/:id", protect, async (req: Request, res: Response) => {

  try{
  const {id} = req.params
  let newClass =  req.body as Son
  let $class_name= await prisma.class.findFirst({where:{id:newClass.id},select:{name:true}})
  await prisma.son.update({where:{id:id},data:{
    class_id:newClass.id,
    class_name:$class_name!.name
  }})
  res.json()
}
catch(error){
  res.status(500).json({ message: "An error occurred", error });
}
});


app.get(
  "/getSonsByFather",
  protect,
  authorize("FATHER"),
  async (req: Request, res: Response) => {
    let user = res.locals.user;
    console.log(user.id);
    const sons = await prisma.son.findMany({ where: { father_id: user.id } });
    res.json(sons);
  }
);

// son requests

// Teacher requests

app.get(
  "/getmycallouts",
  protect,
  authorize("TEACHER"),
  async (req: Request, res: Response) => {
    const user = res.locals.user;

    const callouts = await prisma.callout.findMany({
      where: { teacher_id: user.id, status: "Waiting" },
    });

    res.json(callouts);
  }
);

app.get(
  "/fahter/getById/:id",
  protect,
  authorize("TEACHER", "ADMIN"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    let father = await prisma.father.findFirst({ where: { id: id } });
    res.json(father);
  }
);

app.get(
  "/son/getById/:id",
  protect,
  authorize("TEACHER", "ADMIN"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    let son = await prisma.son.findFirst({ where: { id: id } });
    res.json(son);
  }
);

app.put(
  "/sendout/:calloutid",
  protect,
  authorize("ADMIN", "TEACHER"),
  async (req: Request, res: Response) => {
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
);

connectDB();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
