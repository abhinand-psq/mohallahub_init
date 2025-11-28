import express from 'express'
const router = express()
import cront from 'node-cron'
import User from '../models/User.js'

router.get('/cronjob',(req,res)=>{
    console.log("its working");
    
try{
    cront.schedule('* * * * *',async()=>{
const value = await User.find({})
console.log(value);
res.send(value)
})
res.send('waiting for result')
}catch(e){
res.send(e).status(401)
}
})

export default router