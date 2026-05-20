// utils/securityUtils.js (simplified)
const containsSensitiveInfo = (query) => {
  const sensitiveKeywords = [
    'balance', 'amount', 'money', 'funds',
    'credit card', 'card', 'limit',
    'loan', 'emi', 'debt',
    'transaction', 'transfer', 'payment',
    'account number', 'personal', 'details'
  ];
  
  const normalizedQuery = query.toLowerCase();
  return sensitiveKeywords.some(keyword => normalizedQuery.includes(keyword));
};

module.exports = { containsSensitiveInfo };