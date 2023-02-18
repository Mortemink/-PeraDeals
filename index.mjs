/* /////// */
/* ИМПОРТЫ */
/* /////// */

import express from "express";
import mongoose from "mongoose";
import path from "path";
import {fileURLToPath} from 'url';
import passport from "passport";
import {users} from "./models/users.mjs";
import {services} from "./models/services.mjs";
import {forms} from "./models/forms.mjs";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import {initialize} from "./passport-config.mjs";
import session from "express-session";
import methodOverride from "method-override";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



/* ////////////////////////// */
/* НАСТРОЙКА И ЗАПУСК СЕРВЕРА */
/* ////////////////////////// */

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({extended: true}));

app.set('trust proxy', true)
app.use(session({
    secret: process.env.SECRET || 'ГАВНО',
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
    cookie: {
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 1
    },
    secure: true
}));
app.use(passport.initialize());
app.use(passport.session());
initialize(
    passport,
    email => users.findOne({email: email}),
    id => users.findOne({_id: id}),
);

app.use(methodOverride('_method'));

const PORT = process.env.PORT || 3000;

function start() {
    try {
        mongoose.set('strictQuery', false);
        const DB = `mongodb://127.0.0.1:27017/STO`;
        mongoose.connect(DB, {
            useNewUrlParser: true,
            autoIndex: false,
            useUnifiedTopology: true
        }, (e) => {
            if (e)
                throw new Error(e ?? null);
            else {
                console.log('Сервер успешно подключился к базе данных!');
                app.listen(PORT, () => {
                    console.log(`Ссылка на сайт: http://localhost:${PORT}`);
                });
            }
        })
    } catch (e) {
        throw new Error(e);
    }
}

start();



/* /////// */
/* ЗАПРОСЫ */
/* /////// */

app.route('/')
    .get(async (req, res) => {
        try {
            res.render('index', { services: await services.find() });
        } catch (e) {
            throwError(e, req, res);
        }
    });

app.route('/services')
    .get((req, res) => {
        res.render('services', {services: services.find()});
    });

app.route('/sign_up')
    .get(checkNotAuthenticated, async (req, res) => {
        res.render('sign-up', {status: false});
    })
    .post(checkNotAuthenticated, async (req, res) => {
        try {
            if (await users.findOne({email: req.body.email})) {
                return res.render('sign-up', {status: 'Данный email уже занят'});
            } else {
                await
                    new users({
                        name: req.body.name,
                        email: req.body.email,
                        password: await bcrypt.hash(req.body.password, 8),
                        created: Date.now()
                    })
                        .save();

                return res.redirect('/login?status=successful_registered');
            }
        } catch (e) {
            throwError(e, req, res);
        }
    });

app.route('/login')
    .get(checkNotAuthenticated, (req, res) => {
        let status = req.query.status;
        switch (true) {
            case (status === 'failed_login'): {
                status = 'Неверный email и/или пароль';
                break;
            }
            case (status === 'successful_registered'): {
                status = 'Регистрация произошла успешно!';
                break;
            }
            default: {
                status = false;
                break;
            }
        }
        res.render('login', {status})
    })
    .post(checkNotAuthenticated, passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login?status=failed_login"
    }, err => { if (err) console.error(err); } ));

app.route('/admin_panel')
    .get(checkAdmin, async (req, res) => {
        try {
            res.render('admin-panel', {services: await services.find()});
        } catch (e) {
            throwError(e, req, res);
        }
    });

app.route('/admin_panel/:id')
    .get(checkAdmin, async (req, res) => {
        try {
            res.render('admin-service', {services: await services.findOne({_id: req.params.id})});
        } catch (e) {
            throwError(e, req, res);
        }
    })
    .post(checkAdmin, async (req, res) => {
        try {
            const id = req.params.id;

            if (id === 'create') {
                await
                    new services({
                        name: req.body.name,
                        description: req.body.description,
                        cost: req.body.cost
                    })
                        .save();
            } else {
                await
                    services.findByIdAndUpdate(id, {
                        name: req.body.name,
                        description: req.body.description,
                        cost: req.body.cost
                    });
            }

            res.redirect('/admin_panel');
        } catch (e) {
            throwError(e, req, res);
        }
    })
    .delete(checkAdmin, async (req, res) => {
        try {
            await services.findOneAndDelete({_id: req.params.id}).then(() => {
                res.redirect('/admin_panel');
            });
        } catch (e) {
            throwError(e, req, res);
        }
    });



/* /////// */
/* ФУНКЦИИ */
/* /////// */

function throwError(err, req, res) {
    console.error(err);
    return res.redirect('/');
}

async function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
}

async function checkAdmin(req, res, next) {
    try {
        if (await req.user !== undefined) {
            next();
        } else {
            return res.redirect('/');
        }
    } catch (e) {
        throwError(e, req, res);
    }
}