// routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const { body, validationResult } = require('express-validator');

// Middleware for authentication (you should implement this)
const authMiddleware = (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  // Add your token verification logic here
  // For now, just proceed
  next();
};

// Validation middleware for customer data
const customerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('accountNumber')
    .trim()
    .matches(/^[A-Z]{2}\d{10}$/)
    .withMessage('Account number must be 2 letters followed by 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail(),
  body('mobile')
    .optional({ checkFalsy: true })
    .matches(/^(\+\d{1,3}[- ]?)?\d{10}$/)
    .withMessage('Invalid mobile number'),
  body('accountBalance')
    .isFloat({ min: 0 })
    .withMessage('Account balance must be a non-negative number')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

// CRUD Routes
// Add or Update customer
router.post('/add-or-update', customerValidation, handleValidationErrors, CustomerController.addOrUpdateCustomer);

// Get customer by account number
router.get('/:accountNumber', CustomerController.getCustomer);

// Add a transaction to a customer
router.post('/:accountNumber/transaction', CustomerController.addTransaction);

// Get all customers (with optional filtering)
router.get('/', CustomerController.getAllCustomers);

// Delete a customer by account number
router.delete('/:accountNumber', CustomerController.deleteCustomer);

// Query Processing Routes
// General query endpoint (non-sensitive)
router.post('/query', authMiddleware, CustomerController.handleQuery);

// Secure query endpoint (requires account number)
router.post('/secureQuery', authMiddleware, CustomerController.handleSecureQuery);

module.exports = router;