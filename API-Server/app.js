// Libraries import
import express from "express";

// file import
import deployRouter from "./src/controllers/create.controllers.js";

const app = express();

// Health Check
app.get('/',(req,res)=>{
    res.send("server is healthy");
})

app.use('/api/deploy',deployRouter);

export default app;