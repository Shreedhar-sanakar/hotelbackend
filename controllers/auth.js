import User from "../models/user.js";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, password } = req.body;

    //validation
    if (!name) return res.status(400).send("Hey! Name field is required");
    if (!email) return res.status(400).send("Hey! Email field is required");
    if (!password || password.length < 6)
      return res.status(400).send("Hey! Password must be atleast 6 characters");

    //the email must be unique
    let userExist = await User.findOne({ email }).exec();
    if (userExist)
      return res
        .status(400)
        .send(
          "It seems you are already an existing user. Please check your email or login."
        );

    //register
    const user = new User(req.body);

    await user.save();
    console.log("USER CREATED", user);
    return res.json({ ok: true });
  } catch (error) {
    console.log("CREATE USER FAILED", err);
    return res.status(400).send("Error. Try again");
  }
};

export const login = async (req, res) => {
  try {
    // console.log(req.body);

    const { email, password } = req.body;
    //check if the user with the entered email exists
    let user = await User.findOne({ email }).exec();
    // console.log("USER EXISTS", user);
    if (!user) {
      return res.status(400).send("User doesn't exists...! Please register.");
    }
    //compare password
    user.comparePassword(password, (err, match) => {
      // console.log("ERROR IN COMPARING PASSWORD", err);
      if (!match || err) return res.status(400).send("Incorrect Password");

      //Generate a token then send as response to client
      let token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      res.json({
        token,
        user: {
          _id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stripe_account_id: user.stripe_account_id,
          stripe_seller: user.stripe_seller,
          stripeSession: user.stripeSession,
        },
      });
    });
  } catch (error) {
    console.log("LOGIN ERROR", error);
    res.status(400).send("Login failed...! Please try again.");
  }
};
