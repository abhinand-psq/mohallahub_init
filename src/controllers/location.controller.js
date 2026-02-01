// src/controllers/location.controller.js
import axios from "axios";

const normalize = (value) => {
  if (!value || typeof value !== "string") return null;
  return value.toLowerCase().trim();
};

export const reverseGeocode = async (req, res, next) => {
    console.log("okey its coming")
  try {
    const { lat, lon } = req.query;
 
 console.log(lat,lon)

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: { message: "Latitude and longitude are required" }
      });
    }

    // Call OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "MohallaHub/1.0"
      }
    });

    const address = response.data?.address;

    if (!address) {
      return res.status(404).json({
        success: false,
        error: { message: "Unable to resolve address from location" }
      });
    }

    // Map reverse geo fields → UCA fields
    const locationData = {
      state: normalize(address.state),
      district: normalize(address.state_district || address.county),
      taluk: normalize(address.county || address.subdistrict),
      panchayath: normalize(address.hamlet),
    };

    return res.json({
      success: true,
      data: locationData
    });
  } catch (error) {
    next(error);
  }
};
