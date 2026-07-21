import { registerUser } from "./auth.service.js";
import { HttpError } from "../../lib/http-error.js";
import { Router } from "express";

const router = Router();

router.post("/register", async (req, res) => {
	try 
	{
		const { email, password, name, role } = req.body;
		const user = await registerUser(email, password, name, role);
		res.status(201).json(user);
	} catch (error) 
	{
		if (error instanceof HttpError) res.status(error.status).json({ error: error.message });
		else res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/login", async(req, res) => {
	try 
	{
		const { email, password } = req.body;
		
	} catch (error) 
	{

	}
});

export default router;
