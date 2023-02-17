import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

const _services = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: false,
        default: 'Название отсутствует'
    },
    description: {
        type: String,
        required: true,
        unique: false,
        default: 'Описание отсутствует'
    },
    cost: {
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
_services.plugin(passportLocalMongoose);

export const services = mongoose.model("services",_services);