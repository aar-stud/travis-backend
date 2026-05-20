const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const { signup, login, getUser } = require('../controllers/authController');

// ROUTE 1: create a User using: POST "api/auth/signup". No login required
router.post('/signup', [
    body('name', 'Enter a valid name').isLength({ min: 5 }),
    body('email', 'Enter a valid Email').isEmail(),
    body('password', 'Password must contain atleast 5 characters').isLength({ min: 5 }),
], signup);

// ROUTE 2: Authenticate a User using: POST "/api/auth/login". No login required
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists()
], login);

// ROUTE 3: Get logged in User details using: POST "/api/auth/getuser". Login required
router.post('/getuser', fetchuser, getUser);

module.exports = router;