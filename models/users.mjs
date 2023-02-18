import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

const _users = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
        unique: false
    },
    lastname: {
        type: String,
        required: true,
        unique: false
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        unique: false
    },
    accountType: {
        type: Number,
        required: true,
        unique: false,
        default: 0
    },
    created: {
        type: Date,
        required: true,
        unique: false
    }
});
_users.plugin(passportLocalMongoose);

export const users = mongoose.model("users",_users);