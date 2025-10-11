import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategory,
  getOneCategory,
  updateCategory,
} from "../controllers/categoryControllers";
import { authenticateUser } from "../middlewares/auth";
import { validateBody, validateParams, validateQuery } from "../middlewares/validation";
import {
  categorySchema,
  idParamSchema,
  paginationSchema,
  slugParamSchema,
} from "../schemas/categorySchema";

const router = Router();

// Authenticate User
router.use(authenticateUser);

router.post("/", validateBody(categorySchema), createCategory);
router.get("/", validateQuery(paginationSchema), getAllCategory);
router.get("/:slug", validateParams(slugParamSchema), getOneCategory);
router.put("/:id", validateParams(idParamSchema), updateCategory);
router.delete("/:id", validateParams(idParamSchema), deleteCategory);

export { router };

export default router;
