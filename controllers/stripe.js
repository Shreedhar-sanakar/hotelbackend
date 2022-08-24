import User from "../models/user.js";
import Order from "../models/order.js";
import Stripe from "stripe";
import queryString from "query-string";
import Hotel from "../models/hotel.js";

const stripe = Stripe(process.env.STRIPE_SECRET);

export const createConnectAccount = async (req, res) => {
  //1. find user from db
  const user = await User.findById(req.user._id).exec();
  console.log("User ==>", user);
  //2. if user don't have stripe_account_id, create new
  if (!user.stripe_account_id) {
    const account = await stripe.accounts.create({
      type: "standard",
    });
    console.log("account ==>", account);
    user.stripe_account_id = account.id;
    user.save();
  }
  //3. create account link based on account id (for frontend to complete onboarding)
  let accountLink = await stripe.accountLinks.create({
    account: user.stripe_account_id,
    refresh_url: process.env.STRIPE_REDIRECT_URL,
    return_url: process.env.STRIPE_REDIRECT_URL,
    type: "account_onboarding",
  });
  //prefill any user info such as email
  accountLink = Object.assign(accountLink, {
    "stripe_user[email]": user.email || undefined,
  });
  // console.log("ACCOUNT_LINK ==>", accountLink);
  let link = `${accountLink.url}?${queryString.stringify(accountLink)}`;
  res.send(link);
  console.log(link);
  //4. update payment schedule (optional, default in 2 days)
};

// const updateDelayDays = async (accountId) => {
//   const account = await stripe.accounts.update(accountId, {
//     settings: {
//       payouts: {
//         schedule: {
//           delay_days: 7,
//         },
//       },
//     },
//   });
//   return account;
// };

export const getAccountStatus = async (req, res) => {
  // console.log("GET ACCOUNT STATUS")
  const user = await User.findById(req.user._id).exec();
  const account = await stripe.accounts.retrieve(user.stripe_account_id);
  // console.log("user account retreve", account);
  // const updatedAccount = await updateDelayDays(account.id);
  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      stripe_seller: account,
    },
    { new: true }
  )
    .select("-password")
    .exec();
  // console.log(updatedUser);
  res.json(updatedUser);
};

export const getAccountBalance = async (req, res) => {
  const user = await User.findById(req.user._id).exec();

  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripe_account_id,
    });
    // console.log("BALANCE ==>", balance);
    res.json(balance);
  } catch (error) {
    console.log(error);
  }
};

export const payoutSetting = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).exec();

    const loginLink = await stripe.accounts.createLoginLink(
      user.stripe_account_id,
      {
        redirect_url: process.env.STRIPE_SETTING_REDIRECT_URL,
      }
    );
    console.log("LOGIN LINK FOR PAYOUT SETTING", loginLink);
    res.json(loginLink);
  } catch (error) {
    // console.log("STRIPE PAYOUT SETTING ERROR", error);
    res.send("Currently, this feature is not available.");
  }
};

export const stripeSessionId = async (req, res) => {
  // console.log("you hit the stripe session id", req.body.hotelId);
  // 1. get hotel id from req.body
  const { hotelId } = req.body;
  // 2. find the hotel based on the hotel id in db
  const item = await Hotel.findById(hotelId).populate("postedBy").exec();
  // 3. 20% charge as application fee
  const fee = (item.price * 20) / 100;
  // 4. create a session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    // 5. purchasing item details, it will be shown to user on checkout
    line_items: [
      {
        name: item.title,
        amount: item.price * 100, // in cents
        currency: "inr",
        quantity: 1,
      },
    ],
    // 6. create payment intent with application fee and destination charge 80%
    payment_intent_data: {
      application_fee_amount: fee * 100,
      //this seller can see his balance in our frontend dashboard
      transfer_data: {
        destination: item.postedBy.stripe_account_id,
      },
    },

    //success and cancel urls
    success_url: `${process.env.STRIPE_SUCCESS_URL}/${item._id}`,
    cancel_url: process.env.STRIPE_CANCEL_URL,
  });
  // 7. add this session object to user in the db
  await User.findByIdAndUpdate(req.user._id, { stripeSession: session }).exec();
  // 8. send session id as response to frontend
  res.send({
    sessionId: session.id,
  });
};

export const stripeSuccess = async (req, res) => {
  try {
    // 1. get hotelId from req.body
    const { hotelId } = req.body;
    // 2. find currently logged in user
    const user = await User.findById(req.user._id).exec();
    //check if user has stripesession
    if (!user.stripeSession) return;
    // 3. retrieve stripe session, based on session id we previously save in user db
    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    );
    // 4. if session payment status is paid , then create order
    if (session.payment_status === "paid") {
      // 5. check if order with that sessionId already exists by querying order collection
      const orderExist = await Order.findOne({
        "session.id": session.id,
      }).exec();
      if (orderExist) {
        // 6. if order exists, send success true
        res.json({ success: true });
      } else {
        // 7. else create new order and send success true
        let newOrder = await new Order({
          hotel: hotelId,
          session,
          orderedBy: user._id,
        }).save();
        // 8. remove user's stripesession
        await User.findByIdAndUpdate(user.id, {
          $set: { stripeSession: {} },
        });
        res.json({ success: true });
      }
    }
  } catch (error) {
    console.log(error);
  }
};
