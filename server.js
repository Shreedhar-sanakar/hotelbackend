import express from "express";
import morgan from "morgan";
import router from "./routes/auth.js";
import routerStripe from "./routes/stripe.js";
import routerHotel from "./routes/hotel.js";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

const app = express();
dotenv.config();

//Connect mongodb, the database is in atlas
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Database connected"))
  .catch((err) => console.log("error in database connection", err));

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

//route middleware
app.use("/api", router);
app.use("/api", routerStripe);
app.use("/api", routerHotel);

//listening the app on the server on port
const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`server is running at ${port}`));
