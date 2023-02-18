import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

const _forms = new mongoose.Schema({

});
_forms.plugin(passportLocalMongoose);

export const forms = mongoose.model("forms",_forms);