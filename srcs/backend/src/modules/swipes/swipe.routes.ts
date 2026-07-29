import { throwError } from "../../lib/http-error.js";
import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();


export default router