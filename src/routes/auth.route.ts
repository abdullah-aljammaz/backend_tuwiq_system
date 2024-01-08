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
  getAllTeacherByClassName,
  getAllStudentByClassName,
  getClassByName,
  deleteSon,
  editClassName,
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
  router.post("/admin/register", createAdmin);
  router.delete("/admin/deleteSon/:id", protect, authorize("TEACHER","ADMIN"), deleteSon);

router.get("/admin/getAllFathers", protect, authorize("ADMIN"), getAllFathers);
router.get("/father/getSonsByFather", protect, authorize("FATHER","FATHER","ADMIN"), getSonsByFather);

router.get("/teacher/getfatherById/:id", protect, authorize("TEACHER","ADMIN"), getFatherById);
router.get("/teacher/getSonById/:id", protect, authorize("TEACHER","ADMIN"), getSonById);

router.get("/teacher/getMyCallouts", protect, authorize("TEACHER","ADMIN"), getMyCallouts);

router.get("/admin/getAllClasses", protect, authorize("ADMIN"), getAllClasses);
router.post("/admin/createClass", protect, authorize("ADMIN"), createClass);

router.post("/admin/addTeacher", protect, authorize("ADMIN"), addTeacher);
router.get("/admin/getAllTeachers", protect, authorize("ADMIN"), getAllTeachers);

router.put("/admin/setStudentClass", protect, authorize("ADMIN"), setStudentClass);
router.get("/admin/getAllStudent", protect, authorize("ADMIN"), getAllStudent);
router.post("/son/addSon", protect, authorize("ADMIN","FATHER"), createSon);

router.post("/son/call/:id", protect, authorize("ADMIN","TEACHER","FATHER"), callStudent);
router.put("/teacher/sendOut/:id", protect, authorize("TEACHER","ADMIN"), sendOut);
router.get("/class/getAllStudentByClassName/:class_name", protect, authorize("TEACHER","ADMIN"), getAllStudentByClassName);
router.get("/class/getAllTeacherByClassName/:class_name", protect, authorize("TEACHER","ADMIN"), getAllTeacherByClassName);

router.get("/class/getClassByName/", protect, authorize("TEACHER","ADMIN"), getClassByName);

// router.get("/class/editClassName/", protect, authorize("ADMIN"), getClassByName);
router.put("/class/editClassName/:name", editClassName);



export default router;
