const User = require('../models/userModels'); //represents user collection in mongoosedb, has mongoose methods we can use to interact with our database (CRUD)

const jwt = require('jsonwebtoken'); //generate json web token for user authentication
const bcrypt = require('bcryptjs'); //hash, encrypt password

const asyncHandler = require('express-async-handler'); //express doesn't handle async errors by default promise errors wouldn't be caught - wrap async route handlers with asyncHandler so it passes the error to our custom errorHandler middleware
//(in this case both mongoose and bcrypt use asynchronous methods)

//CRUD functions/logic that will be used in our user routes:

//POST /api/users -->register user
const registerUser = asyncHandler(async (req, res) => {
	//to use body data you need to app.use middleware express.json() + express.urlencoded() - see server.js
	const { name, email, password } = req.body; //destructure body data so we can do validation

	if (!name || !email || !password) {
		res.status(400);
		throw new Error('Please add all user fields');
	}

	//check if user exists (find one user with matching email)
	const userExists = await User.findOne({ email });
	if (userExists) {
		res.status(400);
		throw new Error('User already exists');
	}

	//hash password:
	//first generate a 'salt' using/calling bcrypt
	const salt = await bcrypt.genSalt(10); //default 10 is the number of rounds of salting (the higher the number the more secure but slower)
	//then use salt to hash password(from form in plain text)
	const hashedPassword = await bcrypt.hash(password, salt);

	//create user
	const user = await User.create({
		name,
		email,
		password: hashedPassword,
	});
	if (user) {
		res.status(201).json({
			_id: user.id,
			name: user.name,
			email: user.email,
		});
	} else {
		res.status(400);
		throw new Error('Invalid user data');
	}
});

// //POST /api/users/login -->login/authenticate user
const loginUser = asyncHandler(async (req, res) => {
	const { email, password } = req.body; //destructure body data so we can do get user

	const user = await User.findOne({ email }); //find one user with matching email

	//need to match password - need to compare plain text password from form with db hashed password
	if (user && (await bcrypt.compare(password, user.password))) {
		res.json({
			_id: user.id,
			name: user.name,
			email: user.email,
		});
	} else {
		res.status(401);
		throw new Error('Invalid credentials');
	}
});

// //GET /api/users/profile -->get user information
// const getUser = asyncHandler(async (req, res)=>{})

module.exports = {
	registerUser,
	loginUser,
	// getUser,
};
