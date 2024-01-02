import express from "express";
import {
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
} from "../controllers/auth.controller";
import { authorize, protect } from "../middleware/auth";

const router = express.Router();
// login
router.post("/user/login", login);
router.post("/father/register", registerFather);
router.get(
  "/admin/getAllCallouts",
  protect,
  authorize("ADMIN"),
  getAllCallouts
);
router.post("/admin/register", protect, authorize("ADMIN"), createAdmin);

router.get("/admin/getAllFathers", protect, authorize("ADMIN"), getAllFathers);
router.get("/father/getSonsByFather", protect, authorize("FATHER"), getSonsByFather);

router.get("/teacher/getfatherById/:id", protect, authorize("TEACHER","ADMIN"), getFatherById);
router.get("/teacher/getSonById/:id", protect, authorize("TEACHER","ADMIN"), getSonById);

router.get("/teacher/getMyCallouts", protect, authorize("TEACHER"), getMyCallouts);

router.get("/admin/getAllClasses", protect, authorize("ADMIN"), getAllClasses);
router.post("/admin/createClass", protect, authorize("ADMIN"), createClass);

router.post("/admin/addTeacher", protect, authorize("ADMIN"), addTeacher);
router.get("/admin/getAllTeachers", protect, authorize("ADMIN"), getAllTeachers);

router.put("/admin/setStudentClass", protect, authorize("ADMIN"), setStudentClass);
router.get("/admin/getAllStudent", protect, authorize("ADMIN"), getAllStudent);
router.post("/son/addSon", protect, authorize("ADMIN","FATHER"), createSon);

router.post("/son/call/:id", protect, authorize("ADMIN","TEACHER","FATHER"), callStudent);
router.put("/teacher/sendOut/:id", protect, authorize("TEACHER","ADMIN"), sendOut);



export default router;
