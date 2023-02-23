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
        ttl: 60 * 60 * 24 * 1
    }),
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

function start() {
    try {
        const DB = `mongodb://127.0.0.1:27017/STO`;
        mongoose.set('strictQuery', false);
        mongoose.connect(DB, {
            autoIndex: false,
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

initialize(
    passport,
    email => users.findOne({email: email}),
    id => users.findOne({_id: id}),
);



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
            services: await services.find()
        });
    });
//

// SIGN UP AND LOG IN
app.route('/sign_up')
    .get(checkNotAuthenticated, async (req, res) => {
        res.render('sign-up', {
            user: await getUser(req, res),
            status: req.query.status
        });
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
    .get(checkNotAuthenticated, async (req, res) => {
        res.render('login', {
            user: await getUser(req, res),
            status: req.query.status
        })
    })
    .post(checkNotAuthenticated,
        passport.authenticate("local", {
            successRedirect: "/?status=successful_login",
            failureRedirect: "/login?status=failed_login"
        }), (req, res) => {});

app.route('/get_info')
    .get(async (req, res) => {
        try {
            const accountType = (await req.user)?.accountType || 0;
            const type = req.query.type;
            const value = req.query.value?.split('_')?.filter(substr => substr !== '');
            switch (type) {
                case 'service': {
                    res.json(await services.find({}, { createdBy: 0 }));
                    break;
                }
                case 'user': {
                    if (accountType >= 1) {
                        const all_users = await users.find({}, { password: 0 });
                        res.json(all_users.filter(user => {
                            return value.filter(substr => (user.firstname + user.lastname).includes(substr) || user.email.includes(substr)).length > 0;
                        }));
                    } else {
                        res.status(401);
                        res.json({fuck: "you"});
                    }
                    break;
                }
            }
        } catch (e) {
            throwError(e, req, res);
        }
    })
//

// NEED BE LOGGED
app.route('/profile')
    .get(checkAuthenticated, async (req, res) => {
        try {
            res.render('profile', {
                user: await getUser(req, res),
                page: 'profile'
            });
        } catch (e) {
            throwError(e, req, res);
        }
    });
//

// ADMIN STUFF
app.route('/admin_panel')
    .get(checkAdmin, async (req, res) => {
        try {
            res.render('admin-panel', {
                user: await getUser(req, res)
            });
        } catch (e) {
            throwError(e, req, res);
        }
    });



app.route('/admin_panel/:id')
    .get(checkAdmin, async (req, res) => {
        try {
            const type = req.query.type;
            let result;
            switch (type) {
                case 'service':
                    res.status(200);
                    result = await services.findOne({ _id: req.params.id });
                    if (result)
                        res.json(result);
                    else {
                        res.status(404);
                        res.json({})
                    }
                    res.end();
                    break;
                case 'user':
                    res.status(200);
                    result = await users.findOne({ _id: req.params.id }, { password: 0 });
                    if (result)
                        res.json(result);
                    else {
                        res.status(404);
                        res.json({})
                    }
                    res.end();
                    break;
                default:
                    res.status(404);
                    res.json({});
                    res.end();
            }

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
                        cost: req.body.cost,
                        createdBy: (await req.user)._id,
                        createdDate: Date.now()
                    })
                        .save();
            } else {
                await
                    services.findByIdAndUpdate(id, {
                        name: req.body.name,
                        description: req.body.description,
                        cost: req.body.cost,
                        createdBy: (await req.user)._id
                    });
            }

            res.redirect('/admin_panel');
        } catch (e) {
            throwError(e, req, res);
        }
    })
    .delete(checkAdmin, async (req, res) => {
        try {
            const type = req.query.type;
            const id = req.params.id;
            switch (type) {
                case 'service': {
                    users.updateMany({},
                        { history: history.map(service => {
                                if (service.serviceId === id)
                                    service.serviceId = null;

                                return service;
                            })
                        });
                    await services.findOneAndDelete({ _id: id })
                        .then(() => {
                            return res.json({ good: true });
                        })
                        .catch((e) => {
                            if (e) console.error(e);
                            return res.json({ good: false });
                        });
                    break;
                }
                case 'userhistoryitem': {
                    let history = await users.findOne({_id: id}, { history: 1, _id: 0 });
                    history = history.filter(service => service.serviceId !== req.body.service_id);
                    await users.findByIdAndUpdate(id, { history: history })
                        .then(() => {
                            return res.json({ good: true });
                        })
                        .catch((e) => {
                            if (e) console.error(e);
                            return res.json({ good: false });
                        });
                    break;
                }
                default: {

                }
            }

        } catch (e) {
            throwError(e, req, res);
        }
    });
//

// OTHER
app.delete('/logout', checkAuthenticated, async (req, res) => {
    try {
        req.logOut(null, done => {
            if (done) console.log(done);
            res.redirect('/');
        });
    } catch (e) {
        throwError(e, req, res);
    }
})
//


/* /////// */
/* ФУНКЦИИ */
/* /////// */

async function getUser(req, res) {
    const user = {
        logged: req.isAuthenticated(),
        firstname: null,
        lastname: null,
        email: null,
        accountType: null,
        created: null,
    };
    try {
        if (user.logged) {
            await req.user.clone().then((data) => {
                user.firstname = data.firstname;
                user.lastname = data.lastname;
                user.email = data.email;
                user.accountType = data.accountType;
                user.created = data.created;
            });
        }
    } catch (e) {
        console.error(e);
    }

    return user;
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
       return next();
    }

    res.redirect('/?error=true');
}

async function checkAdmin(req, res, next) {
    try {
        const user = await getUser(req, res);
        if (user.logged && user.accountType >= 1) {
            return next();
        } else {
            return res.redirect('/?error=true');
        }
    } catch (e) {
        throwError(e, req, res);
    }
}