import { registerUser, userLogin, refreshAccessToken, logoutUser } from "./auth.service.js";
import { HttpError, throwError } from "../../lib/http-error.js";
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
		if (error instanceof HttpError) 
			res.status(error.status).json({ error: error.message });
		else 
			res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/login", async(req, res) => {
	try
	{
		const { email, password } = req.body;
		const { refreshToken, ...user } = await userLogin(email, password);
		res.cookie("refreshToken", refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				path: "/auth",
				maxAge: 7 * 24 * 60 * 60 * 1000,
			});
		res.status(200).json(user);
	} catch (error)
	{
		if (error instanceof HttpError)
			res.status(error.status).json({ error: error.message });
		else
			res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/logout", async (req, res) => {
	await logoutUser(req.cookies.refreshToken);
	res.clearCookie("refreshToken", { path: "/auth" });
	res.status(204).send();
});

router.post("/refresh", async (req, res) => {
	try 
	{
		const result = await refreshAccessToken(req.cookies.refreshToken);
		res.status(200).json(result);
	} catch (error) 
	{
		if (error instanceof HttpError)
			res.status(error.status).json({ error: error.message });
		else
			res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
