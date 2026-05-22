// controllers/customerController.js
const Customer = require('../models/Customer');
const CustomerService = require('../services/customerService');
const { log, error: logError } = require('../utils/logger.js');

class CustomerController {
  // CRUD Operations
  static async addOrUpdateCustomer(req, res) {
    try {
      const data = req.body;
      data.lastUpdated = new Date();

      // Use findOneAndUpdate with additional options for more robust upsert
      const customer = await Customer.findOneAndUpdate(
        { accountNumber: data.accountNumber },
        data,
        { 
          new: true,           // Return the modified document
          upsert: true,        // Create if not exists
          runValidators: true, // Run model validations on update
          context: 'query'     // Needed for unique validation on update
        }
      );

      res.status(200).json({ 
        success: true, 
        customer,
        message: customer ? 'Customer saved successfully' : 'Customer created successfully'
      });
    } catch (err) {
      logError("Customer save failed", err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Error saving customer', 
        error: err.message 
      });
    }
  }

  static async getCustomer(req, res) {
    try {
      const customer = await Customer.findOne({ 
        accountNumber: req.params.accountNumber 
      });

      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      res.status(200).json({ 
        success: true, 
        customer 
      });
    } catch (err) {
      logError("Get customer failed", err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: err.message 
      });
    }
  }

  static async addTransaction(req, res) {
    try {
      const { description, amount, type } = req.body;
      
      // Validate transaction inputs
      if (!description || !amount || !type) {
        return res.status(400).json({
          success: false,
          message: 'Description, amount, and type are required'
        });
      }

      const customer = await Customer.findOne({ 
        accountNumber: req.params.accountNumber 
      });

      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      // Add transaction using the custom method
      await customer.addTransaction(description, amount, type);

      res.status(200).json({
        success: true,
        message: 'Transaction added successfully',
        customer
      });
    } catch (err) {
      logError("Add transaction failed", err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Error adding transaction', 
        error: err.message 
      });
    }
  }

  static async getAllCustomers(req, res) {
    try {
      const { 
        accountType, 
        loanStatus, 
        creditCardStatus, 
        kycStatus 
      } = req.query;

      // Build filter object
      const filter = {};
      if (accountType) filter.accountType = accountType;
      if (loanStatus) filter.loanStatus = loanStatus;
      if (creditCardStatus) filter.creditCardStatus = creditCardStatus;
      if (kycStatus) filter.kycStatus = kycStatus;

      const customers = await Customer.find(filter)
        .select('-recentTransactions') // Exclude detailed transactions
        .sort({ lastUpdated: -1 })     // Sort by most recently updated
        .limit(100);                   // Limit to prevent overwhelming response

      res.status(200).json({
        success: true,
        count: customers.length,
        customers
      });
    } catch (err) {
      logError("Get all customers failed", err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching customers', 
        error: err.message 
      });
    }
  }

  static async deleteCustomer(req, res) {
    try {
      const customer = await Customer.findOneAndDelete({ 
        accountNumber: req.params.accountNumber 
      });

      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Customer deleted successfully',
        deletedCustomer: customer
      });
    } catch (err) {
      error("Delete customer failed", err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting customer', 
        error: err.message 
      });
    }
  }

  // Query Processing Operations
  static async handleQuery(req, res) {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required and must be a string' });
      }
      
      // This is for general queries that don't need account number
      const response = `I understand you're asking about: "${query}". Please use the secure query endpoint with your account number for specific account information.`;
      
      res.json({
        response,
        category: 'General',
        requiresAuth: true
      });
    } catch (error) {
      error("Handle query failed", error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  static async handleSecureQuery(req, res) {
    try {
      const { query, accountNumber } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required and must be a string' });
      }
      
      if (!accountNumber || !/^[A-Z]{2}\d{10}$/.test(accountNumber)) {
        return res.status(400).json({ error: 'Valid account number is required' });
      }
      
      const result = await CustomerService.processQuery(query, accountNumber);
      
      res.json(result);
    } catch (error) {
      error("Handle secure query failed", error.message);
      
      if (error.message === 'Customer not found') {
        return res.status(404).json({ error: 'Customer not found with provided account number' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = CustomerController;