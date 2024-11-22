import { Router } from "express";
import { userRouter } from "./user";
import { spaceRouter } from "./space";
import { adminRouter } from "./admin";
import { SignupSchema, SigninSchema } from "../../types";
import {hash, compare} from "../../scrypt";
import client from "@repo/db/client";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config";

export const router = Router();

router.post("/signup", async (req, res) => {
  //check the user
  const parsedData = SignupSchema.safeParse(req.body)
  if(!parsedData.success){
    //console.error(parsedData.error);
     res.status(400).json({message: "Validaton failed"})
     return
  }

  const hashedPassword = await hash(parsedData.data.password)
  try {
    const user = await client.user.create({
      data: {
        username: parsedData.data.username,
        password: hashedPassword,
        role: parsedData.data.type === "admin" ? "Admin" : "User",
        
      }
    })
    //console.log(parsedData.data.username);
    //console.log(parsedData.data.password);
    res.json({
      userId: user.id
    })    
  } catch(e) {
    //console.error(e);
    res.status(400).json({message: "User already exist"})
  }
})

router.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body)
  if(!parsedData.success) {
    res.status(403).json({message: "Validation failed"})
    return
  }

  try {
    const user = await client.user.findUnique({
      where: {
        username: parsedData.data.username
      }
    })
    if(!user) {
      res.status(403).json({message: "User Not Found"})
      return 
    }
    const isValid = await compare(parsedData.data.password, user.password)
    if(!isValid) {
      res.status(403).json({message: "Invalid paswword"})
      return 
    }

    const token = jwt.sign({
      userId: user.id,
      role: user.role
    }, JWT_PASSWORD);

    res.json({
      token
    })
  } catch(e) {
    res.status(400).json({message: "Internal server error"})
  }

})

router.get("/elements", async (req, res) => {
  const elements = await client.element.findMany()

  res.json({elements: elements.map(e => ({
      id: e.id,
      imageUrl: e.imageUrl,
      width: e.width,
      height: e.height,
      static: e.static
  }))})
})

router.get("/avatars", async (req, res) => {
  const avatars = await client.avatar.findMany()
  res.json({avatars: avatars.map(x => ({
      id: x.id,
      imageUrl: x.imageUrl,
      name: x.name
  }))})
})

router.use("/user", userRouter)
router.use("/space", spaceRouter)
router.use("/admin", adminRouter)





