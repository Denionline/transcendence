import { registerUser } from "./auth.service.js";
import { Router } from "express";

const router = Router();

router.post("/register", async (req, res) => {
	try 
	{
		const { email, password } = req.body;
		const user = await registerUser(email, password);
		res.status(201).json(user);
	} catch (error)
	{
		res.status(error.status || 500).json({ error: error.message });
	}
});

export default router;
