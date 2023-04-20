const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const payment = require("../models/payment");
const jwt = require("jsonwebtoken");
const UsersController = require("../controllers/users");
// const payment = require("../models/payment");
require("dotenv").config();
const stripe = Stripe(process.env.SECRET_KEY);
const keys = require("../../config/keys");
const { body, header, validationResult } = require("express-validator");
router.get("/get/:payment_id", async function (req, res) {
  try {
    var token = req.headers["authorization"];
    token = token.replace(/^Bearer\s/, "");
    if (!token)
      return res
        .status(401)
        .send({ auth: false, message: "No token provided." });
    console.log(">>>>>>>>>>token", token);
    jwt.verify(token, "secret", function (err, decoded) {
      if (err) {
        return res.status(500).send({
          auth: false,
          message: "Failed to authenticate token for update." + err,
        });
      } else {
        var data = decoded;

        data.payment_id = req.params.payment_id;
        console.log("dec", data);
        UsersController.get_payment(data, function (respData) {
          if (typeof respData.StatusCode != "undefined") {
            res.status(respData.ReturnCode).send(respData);
          } else {
            res.status(respData.ReturnCode).send(respData);
          }
        });
      }
    });
  } catch (err) {
    res.status(400).send(err);
  }
});
router.get("/", async function (req, res) {
  try {
    var token = req.headers["authorization"];
    token = token.replace(/^Bearer\s/, "");
    if (!token)
      return res
        .status(401)
        .send({ auth: false, message: "No token provided." });
    console.log(">>>>>>>>>>token", token);
    jwt.verify(token, "secret", function (err, decoded) {
      if (err) {
        return res.status(500).send({
          auth: false,
          message: "Failed to authenticate token for update." + err,
        });
      } else {
        console.log("dec", decoded);
        var data;
        data = decoded;
        UsersController.get_all_payment(data, function (respData) {
          if (typeof respData.StatusCode != "undefined") {
            res.status(respData.ReturnCode).send(respData);
          } else {
            res.status(respData.ReturnCode).send(respData);
          }
        });
      }
    });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.post("/create", async (req, res) => {
  console.log("req>>>>>>>>", req.body.Items);
  const customer = await stripe.customers.create({
    metadata: {
      userId: req.body.userId,
      cart: JSON.stringify(req.body.Items),
    },
  });

  const line_items = req.body.Items.map((item) => {
    return {
      price_data: {
        currency: item.currency,
        product_data: {
          name: item.name,
          images: item.image,
          description: item.desc,
          metadata: { id: item.id },
        },

        unit_amount: item.unit_amount * 100,
      },
      quantity: item.quantity,
    };
  });
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    line_items,
    mode: "payment",
    success_url: "http://localhost:3000/mybookings",
    cancel_url: "http://localhost:3000/dashboard",
  });

  res.send({ url: session.url });
});
// _id: mongoose.mongo.ObjectId,
// user_id: { type: Object, required: true },
// payment_intent: { type: String, required: true },
// email: { type: String, required: true },
// customerId: { type: String, required: true },
// name: { type: String, required: true },
// created: { type: Date, require: true },
// expires_at: { type: Date, require: true },
// payment_status: { type: String, required: true },
// payment_method_types: { type: Array, required: true },
// amount_subtotal: { type: Number, required: true },
// amount_total: { type: Number, required: true },
// currency: { type: String, required: true },
const createPayment = async (customer, data) => {
  const addpayment = new payment({
    user_id: customer.metadata.userId,
    payment_intent: data.payment_intent,
    email: data.customer_details.email,
    customerId: data.customer,
    name: data.customer_details.name,
    created: new Date(data.created),
    expires_at: new Date(data.expires_at),
    payment_status: data.payment_status,
    payment_method_types: data.payment_method_types,
    amount_subtotal: Number(data.amount_subtotal) / 100,
    amount_total: Number(data.amount_total) / 100,
    currency: data.currency,
  });
  try {
    const saveData = await addpayment.save();
    console.log(saveData);
  } catch (error) {
    console.log(error);
  }
};

// This is your Stripe CLI webhook secret for testing your endpoint locally.
let endpointSecret;
// endpointSecret =
//   "whsec_55d3eb329943fdfda7a0addb73469720508dbb1d1c5c88da85dd5c9f91e247aa";

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let data;
    let eventType;

    if (endpointSecret) {
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log("webhook>>>>>>>>>>>>>>>>>>verify");
      } catch (err) {
        console.log(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }
      data = event.data.object;
      eventType = event.type;
    } else {
      data = req.body.data.object;
      eventType = req.body.type;
    }

    // Handle the event
    // console.log("req.body>>>>>>", req.body);
    if (eventType == "checkout.session.completed") {
      stripe.customers
        .retrieve(data.customer)
        .then((customer) => {
          console.log(customer);
          console.log("data>>>", data);
          createPayment(customer, data);
        })
        .catch((err) => {
          console.log(err.message);
        });
    }
    // Return a 200 res to acknowledge receipt of the event
    res.send().end();
  }
);

module.exports = router;

/**
 *stripe listen --forward-to localhost:3001/api/payment/webhook
 stripe trigger payment_intent.succeeded
 */
