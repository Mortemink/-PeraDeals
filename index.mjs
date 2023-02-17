import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from 'url';
import passport from "passport";
import {kek} from "./models/users.mjs";
// import services from "./models/services.mjs";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
// import initializePassport from "passport-config.mjs";
import flash from "express-flash";
import session from "express-session";
import methodOverride from "method-override";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());
app.use(session({
    secret: process.env.SECRET || 'ГАВНО',
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
    secure: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

const PORT = process.env.PORT || 3000;

async function start() {
    try {
        mongoose.set('strictQuery', false);
        const DB = `mongodb://127.0.0.1:27017/STO`;
        await mongoose.connect(DB, {
            useNewUrlParser: true,
            autoIndex: false,
            useUnifiedTopology: true
        })
    } catch (e) {
        throw new Error(e);
    }
}

start()
    .then(() => {
    console.log('Сервер успешно подключился к базе данных!');
    app.listen(PORT, () => {
        console.log(`Ссылка на сайт: http://localhost:${PORT}`);
    });
});



// ЗАПРОСЫ


app.route('/')
    .get(async (req, res) => {
        try {
            res.render('index.ejs')
        } catch (e) { ThrowError(e, res) }
    })

// ФУНКЦИИ

function ThrowError(err, res) {
    console.error(err);
    res.redirect('/');
}