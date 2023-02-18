'use strict'

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
import mongoStore from "connect-mongo";
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
    store: mongoStore.create({
        mongoUrl: "mongodb://127.0.0.1:27017/STO",
        ttl: 2 * 24 * 60 * 60
    }),
    secret: process.env.SECRET || 'ГАВНО',
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
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

// FOR ALL
app.route('/')
    .get(async (req, res) => {
        try {
            res.render('index', {
                user: await getUser(req, res),
                services: await services.find()
            });
        } catch (e) {
            throwError(e, req, res);
        }
    });

app.route('/services')
    .get(async (req, res) => {
        res.render('services', {
            user: await getUser(req, res),
            services: services.find()
        });
    });
//

// SIGN UP AND LOG IN
app.route('/sign_up')
    .get(checkNotAuthenticated, async (req, res) => {
        res.render('sign-up', { status: req.query.status });
    })
    .post(checkNotAuthenticated, async (req, res) => {
        try {
            if (await users.findOne({email: req.body.email})) {
                return res.redirect('/sign_up?status=existing_email');
            } else {
                const HashedPassword = await bcrypt.hash(req.body.password, 8);
                await new users({
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email: req.body.email,
                            password: HashedPassword,
                            accountType: 0,
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
        res.render('login', {status: req.query.status})
    })
    .post(checkNotAuthenticated,
        passport.authenticate("local", {
            successRedirect: "/",
            failureRedirect: "/login?status=failed_login"
        }),
        (req, res) => {
        });
//

// NEED BE LOGGED
app.route('/profile')
    .get(checkAuthenticated, async (req, res) => {
        try {
            res.render('profile', {
                user: await getUser(req, res)
            });
        } catch (e) {
            throwError(e, req, res);
        }
    })
    .delete(checkAuthenticated, (req, res) => {
        try {
            req.logout();
            res.redirect('/');
        } catch (e) {
            throwError(e, req, res);
        }
    })
//

// ADMIN STUFF
app.route('/admin_panel')
    .get(checkAdmin, async (req, res) => {
        try {
            res.render('admin-panel', {
                user: await getUser(req, res),
                services: await services.find()
            });
        } catch (e) {
            throwError(e, req, res);
        }
    });

app.route('/admin_panel/:id')
    .get(checkAdmin, async (req, res) => {
        try {
            res.render('admin-service', {
                user: await getUser(req, res),
                services: await services.findOne({_id: req.params.id})
            });
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
//


/* /////// */
/* ФУНКЦИИ */
/* /////// */

async function getUser(req, res) {
    try {
        const user = await req.user;
        if (user)
            return {
                logged: req.isAuthenticated(),
                firstname: user?.firstname,
                lastname: user?.lastname,
                email: user?.email,
                accountType: user?.accountType
            }
        else {
            return {
                logged: false,
                firstname: null,
                lastname: null,
                email: null,
                accountType: null
            }
        }
    } catch (e) {
        throwError(e, req, res);
    }
}

function throwError(err, req, res) {
    console.error(err);
    return res.redirect('/?error=true');
}

async function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/?error=true');
    }
    next();
}

async function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    }

    return res.redirect('/?error=true');
}

async function checkAdmin(req, res, next) {
    try {
        if (req.isAuthenticated && await req.user.accountType >= 1) {
            next();
        } else {
            return res.redirect('/?error=true');
        }
    } catch (e) {
        throwError(e, req, res);
    }
}