/* payment model definition */
const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
  {
    user_id: { type: Object, required: true },
    payment_intent: { type: String, required: true },
    email: { type: String, required: true },
    customerId: { type: String, required: true },
    name: { type: String, required: true },
    created: { type: Date, require: true },
    expires_at: { type: Date, require: true },
    payment_status: { type: String, required: true },
    payment_method_types: { type: Array, required: true },
    amount_subtotal: { type: Number, required: true },
    amount_total: { type: Number, required: true },
    currency: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
