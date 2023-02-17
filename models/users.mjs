import mongoose from "mongoose";
let users = '';
let kek = () => mongoose.model("users",users)
export { kek }