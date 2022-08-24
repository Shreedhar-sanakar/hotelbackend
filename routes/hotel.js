import express from "express";
import formidable from "express-formidable";

const routerHotel = express.Router();

// middleware
import { hotelOwner, requireSignin } from "../middlewares/index.js";
// controllers
import {
  create,
  hotels,
  image,
  sellerHotels,
  remove,
  read,
  update,
  userHotelBookings,
  isAlreadyBooked,
  searchListings
} from "../controllers/hotel.js";

routerHotel.post("/create-hotel", requireSignin, formidable(), create);
routerHotel.get("/hotels", hotels);
routerHotel.get("/hotel/image/:hotelId", image);
routerHotel.get("/seller-hotels", requireSignin, sellerHotels);
routerHotel.delete("/delete-hotel/:hotelId", requireSignin, hotelOwner, remove);
routerHotel.get("/hotel/:hotelId", read);
routerHotel.put(
  "/update-hotel/:hotelId",
  requireSignin,
  hotelOwner,
  formidable(),
  update
);

//orders
routerHotel.get("/user-hotel-bookings", requireSignin, userHotelBookings);
routerHotel.get("/is-already-booked/:hotelId", requireSignin, isAlreadyBooked);
routerHotel.post("/search-listings", searchListings);

export default routerHotel;
