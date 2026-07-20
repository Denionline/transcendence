import bcrypt from 'bcrypt';

function throwError(status, message)
{
	const error = new Error(message);
	error.status = status;
	throw error;
}

const users = [
	{id: 0, email: "user1@gmail.com", passwordHash: "123"},
	{id: 1, email: "user2@gmail.com", passwordHash: "123"}
]; /// DELETE

let nextId = users.length;

export async function registerUser(email, password)
{
	if (!email || !password)
		throwError(400, "email and password are required");
	if (password.length < 8 || password.length > 72)
		throwError(400, "password must be between 8 and 72 characters");
	if (typeof email !== 'string' || typeof password !== 'string')
		throwError(400, "email and password must be strings");
	email = email.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email))
		throwError(400, "invalid email format");	
	const existingUuser = users.find(u => u.email === email); // UPDATE LATER TO PRISMA
	if (existingUuser)
		throwError(409, "email already registered");
	const passwordHash = await bcrypt.hash(password, 10);
	const id = nextId;
	nextId++;
	users.push({id, email, passwordHash});
	return ({ id, email });
}
