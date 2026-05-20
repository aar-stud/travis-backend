// utils/queryParser.js
class QueryParser {
  static parseQuery(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Account balance queries
    if (this.matchesPattern(normalizedQuery, ['balance', 'amount', 'money', 'funds'])) {
      return { type: 'balance', field: 'accountBalance' };
    }
    
    // Credit card queries
    if (this.matchesPattern(normalizedQuery, ['credit card', 'card status', 'card delivery'])) {
      return { type: 'creditCard', fields: ['creditCardStatus', 'creditCardLimit', 'creditCardFeatures'] };
    }
    
    // Cheque book queries
    if (this.matchesPattern(normalizedQuery, ['cheque', 'checkbook', 'cheque book'])) {
      return { type: 'cheque', fields: ['chequeBookStatus', 'chequeIssuedDate'] };
    }
    
    // Loan queries
    if (this.matchesPattern(normalizedQuery, ['loan', 'emi', 'remaining loan', 'loan status'])) {
      return { type: 'loan', fields: ['loanStatus', 'loanType', 'loanAmount', 'loanEMI'] };
    }
    
    // KYC queries
    if (this.matchesPattern(normalizedQuery, ['kyc', 'verification', 'document'])) {
      return { type: 'kyc', fields: ['kycStatus', 'lastKYCUpdate'] };
    }
    
    // Transaction queries
    if (this.matchesPattern(normalizedQuery, ['transaction', 'history', 'recent'])) {
      return { type: 'transactions', field: 'recentTransactions' };
    }
    
    // Account info queries
    if (this.matchesPattern(normalizedQuery, ['account', 'profile', 'info', 'details'])) {
      return { type: 'accountInfo', fields: ['name', 'email', 'mobile', 'accountType'] };
    }
    
    return { type: 'general', fields: [] };
  }
  
  static matchesPattern(query, keywords) {
    return keywords.some(keyword => query.includes(keyword));
  }
}

module.exports = QueryParser;