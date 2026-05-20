const mongoose = require("mongoose");

const QueryHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    query: { type: String, required: true },
    category:{type:String},
    response: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("QueryHistory", QueryHistorySchema);
