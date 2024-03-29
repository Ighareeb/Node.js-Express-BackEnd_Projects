import express from 'express';
import users from './utils/userData.mjs';
// import usersRouter from './routes/users.mjs';
import passport from './strategies/local-strategies.mjs';
import mongoose from 'mongoose';
// import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';
// import session from 'express-session';

dotenv.config();
import {
	query,
	validationResult,
	matchedData,
	checkSchema,
} from 'express-validator';
// import { handleUserById } from './utils/middleware.mjs';

// import { validationSchema } from './utils/validationSchemas.mjs';

//import the local strategy - or the OAuth strategy library you are using (after installing it)
// import './strategies/discord-strategy.mjs';
//then send up endpoint to use that strategy

const app = express();

mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log('Connected to MongoDB');
	})
	.catch((err) => {
		console.log(`Error: ${err}`);
	});

//app.use(usersRouter); //using imported router can replace code for whatever is defined in routes/users.mjs for API endpoints grouped as domains
app.use(passport.initialize());
app.use(passport.session());

//MIDDLEWARE
app.use(express.json()); //built in express middleware that parses JSON data from req.body

const loggingMiddleware = (req, res, next) => {
	console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
	next();
};
app.use(loggingMiddleware); //calling middleware globally like this means it will be called for all routes

//GET req with route, req/res objects passed in handler function
app.get('/', (req, res) => {
	res.status(200).send({ msg: 'Homepage' });
});

//GET all users + if query params will filter + query param express-validator
app.get(
	'/api/users',
	query('key')
		.isIn(['username'])
		.notEmpty()
		.withMessage('Key query must not be empty') //Sets the error message for the previous validator.
		.isLength({ min: 3, max: 15 })
		.withMessage('Username must be between 3 and 15 characters'), //chainging validation methods
	(req, res) => {
		console.log(req); //check validation object
		const result = validationResult(req); // extracts validation errors from validation obj (so you don't need to do it manually)
		console.log(result); //returns in easily readable format ready to be used as required in res
		// console.log(req.query);
		const {
			query: { key, value },
		} = req; //destructuring query object from req object + filter key & value from query object

		if (key && value) {
			return res
				.status(200)
				.send(
					users.filter((user) =>
						String(user[key])
							.toLowerCase()
							.includes(String(value).toLowerCase()),
					),
				); //filter users based on key and value - returns filtered array
			//eg. http://localhost:3000/api/users?key=username&value=IG
		}
		return res.status(200).send(users);
	},
);
//POST create new user + body express-validator + isEmpty() & matchedData()
app.post(
	'/api/users',
	body('username')
		.notEmpty()
		.withMessage('Username required')
		.isLength({ min: 5, max: 32 })
		.withMessage('Username must be between 5 and 32 characters')
		.isString()
		.withMessage('Username must be a string'),
	(req, res) => {
		const result = validationResult(req);
		console.log(result);
		if (!result.isEmpty()) {
			return res.status(400).send({ errors: result.array() }); //returns array of validation errors - can be mapped and display specific errors/info to user in response
		}
		// const { body } = req;
		// const newUser = { id: users.length + 1, ...body };
		const validData = matchedData(req); //returns only validated data from req
		const newUser = { id: users.length + 1, ...validData };
		users.push(newUser);
		res.status(201).send(newUser);
	},
);

//GET single user using id
//route params are always treated as strings so for id we need to convert to number parseInt()/Number()
app.get('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id);
	if (isNaN(id)) {
		return res.status(400).send({ msg: 'Bad request, Invalid ID' });
	}
	const user = users.find((user) => user.id === id);
	if (user) {
		return res.status(200).send({ username: user.username, id: id });
	} else {
		return res.status(404).send({ msg: 'User not found' });
	}
});

//PUT update user based on id route param
app.put('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id);
	const { body } = req;
	if (isNaN(id)) {
		return res.status(400).send({ msg: 'Bad request, Invalid ID' });
	}
	const userIndex = users.findIndex((user) => user.id === id);
	if (userIndex !== -1 && body) {
		const updatedUser = { id: id, ...body };
		users[userIndex] = updatedUser; //updates user in the users array
		return res.status(200).send(updatedUser);
	}
	return res.status(404).send({ msg: 'User not found' });
});

//PATCH (partial) update user based on id route param
app.patch('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id);
	const { body } = req;
	if (isNaN(id)) {
		return res.status(400).send({ msg: 'Bad request, Invalid ID' });
	}
	const userIndex = users.findIndex((user) => user.id === id);
	if (userIndex === -1) {
		return res.status(404).send({ msg: 'User not found' });
	}
	const updatedUser = { ...users[userIndex], ...body }; //only overwrites props/fields in req.body that are present in user
	users[userIndex] = updatedUser; //updates user in the users array
	return res.status(200).send(updatedUser);
});

//DELETE user based on id route param
app.delete('/api/users/:id', (req, res) => {
	const id = parseInt(req.params.id);
	if (isNaN(id)) {
		return res.status(400).send({ msg: 'Bad request, Invalid ID' });
	}
	const userIndex = users.findIndex((user) => user.id === id);
	if (userIndex === -1) {
		return res.status(404).send({ msg: 'User not found' });
	}
	const deletedUser = users.splice(userIndex, 1);
	return res.status(200).send(deletedUser);
});

//GET all products
app.get('/api/products', (req, res) => {
	res.status(200).send({ msg: 'Products' });
});

//setting up passport auth endpoint
//passport.authenticate( <strategy>, ?<callback> )
app.post('/api/auth', passport.authenticate('local'), (req, res) => {
	res.sendStatus(200);
});
app.get('/api/auth/status', (req, res) => {
	console.log('Inside /auth/status endpoint');
	console.log(req.user);
	console.log(req.session);
	return req.user ? res.send(req.user) : res.sendStatus(401);
});
app.post('/api/auth/logout', (req, res) => {
	if (!req.user) {
		return res.sendStatus(401);
	}
	req.logout((err) => {
		if (err) {
			return res.sendStatus(400);
		}
		return res.sendStatus(200);
	});
});
//note cookies would still be present on client after logout but would not be valid for the server

//OAuth endpoint
app.get('/api/auth/discord', passport.authenticate('discord'));
//redirect/callback endpoint after user is authenticated which exchanges code for access token
app.get(
	'/api/auth/discord/redirect',
	passport.authenticate('discord'),
	(req, res) => {
		console.log(req.session);
		console.log(req.user);
		res.sendStatus(200);
	},
);

const PORT = process.env.PORT || 3000;
//returns node http.Server (express server) to start listening on port for HTTP requests
app.listen(PORT, () => {
	console.log(`Server is listening on port: ${PORT}`);
});
