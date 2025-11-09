import User from "./src/models/User.js";
import connectDB from "./src/config/db.js";
import fs from "fs";
try{
    await connectDB()
    User.findOne({role:"user"}).
    then((res)=>{console.log(res);fs.writeFileSync('output.json', JSON.stringify(res, null, 2)),process.exit(0)}).
    catch((err)=>{console.error(err);process.exit(1)});
}catch(e){
    console.error(e);
}
