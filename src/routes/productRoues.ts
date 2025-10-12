import { Router } from "express";
import { authenticateUser } from "../middlewares/auth";
import {
  createProduct,
  deleteProduct,
  getAllProduct,
  getOneProduct,
  updateProduct,
} from "../controllers/productController";
import { validateBody, validateParams } from "../middlewares/validation";
import { productSchema } from "../schemas/productSchema";
import { idParamSchema } from "../schemas/querySchema";

const router = Router();

// User validation
router.use(authenticateUser);

router.post("/", validateBody(productSchema), createProduct);

router.get("/", getAllProduct);

router.get("/:id", validateParams(idParamSchema), getOneProduct);

router.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(productSchema.partial()),
  updateProduct
);

router.delete("/:id", validateParams(idParamSchema), deleteProduct);

export { router };
export default router;
