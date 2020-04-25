const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejs = require('ejs');
const session = require('client-sessions');
const bodyParser = require('body-parser');
const path = require('path');
var logger = require('morgan');
var dotenv = require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');

const port = process.env.PORT || 3000;

const openpgp = require('openpgp'); // use as CommonJS, AMD, ES6 module or via window.openpgp

openpgp.initWorker({ path: 'openpgp.worker.js' })  // set the relative web worker path

//Middleware for bodyparser
app.use(express.static(__dirname + '/views'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger('dev'));

//mongoDB configuration
const db = require('./setup/myDBurl').mongoURL;

//Attempt to connect to database
mongoose.
    connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.log(err));

//Set view engine
app.use(expressLayouts);
app.set('view engine', 'ejs');

//Testing the server
app.get('/', (req, res) => {
    res.render('homepage');
});

app.get('/key-management', (req, res) => {
    res.render('key-management');
});

app.get('/key-generate', (req, res) => {
    res.render('key-generate', {
        key: 1
    });
});

app.get('/key-publish', (req, res) => {
    res.render('key-publish');
});

app.get('/encrypt', (req, res) => {
    res.render('encrypt');
});

app.get('/decrypt', (req, res) => {
    res.render('decrypt');
});

app.post('/generate', (req, res) => {
    const options = {
        userIds: [{ name: req.body.name, email: req.body.email }], // multiple user IDs
        numBits: parseInt(req.body.size),                                            // RSA key size
        passphrase: req.body.password         // protects the private key
    };
    openpgp.generateKey(options).then(function (key) {
        var privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
        var pubkey = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
        var revocationCertificate = key.revocationCertificate; // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
        console.log(key);
        res.render('key-generate', {
            key: key
        });
    }).catch((err) => console.log(err));;

})

//All routes
const auth = require('./routes/api/auth');
const home = require('./routes/api/home');


app.use('/api/auth', auth);
app.use('/api/home', home);

app.listen(port, () => {
    console.log(`Server running at ${port}`);
});