import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/authController";
import { validateBody } from "../middlewares/validation";
import { registerUserSchema } from "../schemas/userSchema";

const router = Router();

router.post("/register", validateBody(registerUserSchema), registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

export { router };

export default router;
