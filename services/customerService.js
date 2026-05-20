// services/customerService.js
const Customer = require('../models/Customer');
const QueryParser = require('../utils/queryParser');
const ResponseFormatter = require('../utils/responseFormatter');

class CustomerService {
  static async findByAccountNumber(accountNumber) {
    try {
      const customer = await Customer.findOne({ accountNumber });
      return customer;
    } catch (error) {
      throw new Error(`Error finding customer: ${error.message}`);
    }
  }
  
  static async processQuery(query, accountNumber) {
    try {
      const customer = await this.findByAccountNumber(accountNumber);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      const parsedQuery = QueryParser.parseQuery(query);
      const response = this.generateResponse(customer, parsedQuery);
      
      return {
        response,
        category: parsedQuery.type,
        customer: {
          name: customer.name,
          accountNumber: customer.accountNumber
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  static generateResponse(customer, parsedQuery) {
    switch (parsedQuery.type) {
      case 'balance':
        return ResponseFormatter.formatBalance(customer);
      case 'creditCard':
        return ResponseFormatter.formatCreditCard(customer);
      case 'cheque':
        return ResponseFormatter.formatCheque(customer);
      case 'loan':
        return ResponseFormatter.formatLoan(customer);
      case 'kyc':
        return ResponseFormatter.formatKYC(customer);
      case 'transactions':
        return ResponseFormatter.formatTransactions(customer);
      case 'accountInfo':
        return ResponseFormatter.formatAccountInfo(customer);
      default:
        return ResponseFormatter.formatGeneral(customer);
    }
  }
}

module.exports = CustomerService;