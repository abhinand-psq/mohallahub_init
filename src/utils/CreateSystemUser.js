import bcryptjs from "bcryptjs";
import User from "../models/User.js";
import crypto from "crypto";
import fs from 'fs'
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";


 const __filename = fileURLToPath(import.meta.url);

 async function findOrCreateAreaSystemUser(uca) {
  if (!uca || !uca._id) throw new Error("UCA required for system user creation");

  // Create a safe slug from hierarchy (fallback to state-district)
  const parts = [
    uca.state,
    uca.district,
    uca.taluk,
    uca.block,
    uca.panchayath,
    uca.ward,
  ].filter(Boolean);

  

  
  let slug = parts.join("-").toLowerCase().replace(/[^a-z0-9\-]/g, "-");
  if (!slug) slug = `area-${String(uca._id).slice(-6)}`;

  const username = `system_${slug}`;
  const email = `abhinandpsq2${username}@gmail.com`;

  // try to find existing system user
  let sys = await User.findOne({ username }).lean();
  if (sys) return sys;

const randomPassword = crypto.randomBytes(24).toString("hex");
let passwordHash = await bcryptjs.hash(randomPassword, 10);

 
const __dirname = path.dirname(__filename);
console.log("__dirname:", __dirname); 
const file = path.join(__dirname, './systempasswords/passwords.txt');
console.log("Resolved File Path:", file);

  try{
const dirPath = path.dirname(file);
    fs.mkdirSync(dirPath, { recursive: true });
    fs.appendFileSync(file, `${randomPassword}\n`, 'utf-8');
    console.log("File written successfully!");
  }catch(e){
  throw e;
  }

  const userPayload = {
    username,
    email,
    firstName: "MohallaHub",
    lastName: "System",
    passwordHash,
    role: "system",
    isVerified: true,
    isActive: true,
    isSystemGenerated:true,
    addressReference: uca._id,
    details: `System user for ${slug}`
  };

  try {
    const created = await User.create(userPayload);
    // return plain object shape to be consistent with .lean() elsewhere
    return created.toObject ? created.toObject() : created;
  } catch (err) {
    // handle duplicate-key race: fetch the existing one
    if (err.code === 11000) {
      const existing = await User.findOne({ username }).lean();
      if (existing) return existing;
    }
    throw err;
  }
}


export default findOrCreateAreaSystemUser