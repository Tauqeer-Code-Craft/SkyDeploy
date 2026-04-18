import express from "express";
import { createDeployment } from "../controllers/create.controllers.js";

const router = express.Router();

router.post('/', staticDeploy);


export default router;