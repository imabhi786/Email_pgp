const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejs = require('ejs');
const fs = require('fs');
const session = require('client-sessions');
const bodyParser = require('body-parser');
const path = require('path');
var logger = require('morgan');
var dotenv = require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');
const { google } = require('googleapis');
const common = require('./common');
common.isAuthenticated = false;
let rawdata = fs.readFileSync('g_key.json');
const OAuth2Data = JSON.parse(rawdata);

const CLIENT_ID = OAuth2Data.client.id;
const CLIENT_SECRET = OAuth2Data.client.secret;
const REDIRECT_URL = OAuth2Data.client.redirect;
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

const port = process.env.PORT || 3000;

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
app.get('/homepage', (req, res) => {

    status = common.isAuthenticated;
    if(status)
    {
        res.render('homepage');
    }
    else
    {
        res.redirect('/');
    }
    
});


app.get('/access-denied-page', (req, res) => {
    res.render('access-denied-page');
});

app.get('/', (req, res) => {
    if (!authed) {
        // Generate an OAuth URL and redirect there
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/gmail.readonly'
        });
        res.redirect(url);
    } else {

        res.redirect('/homepage')
    }
})

app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating', err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
                gmail.users.getProfile({ userId: 'me' }, (err, res) => {
                    common.userEmail = res.data.emailAddress;
                    common.isAuthenticated = true;
                    console.log("gstuff : " + JSON.stringify(res.data.emailAddress));
                });
                res.redirect('/homepage')
            }
        });
    }
});

//All routes
const auth = require('./routes/api/auth');
const home = require('./routes/api/home');


app.use('/api/auth', auth);
app.use('/api/home', home);

app.listen(port, () => {
    console.log(`Server running at ${port}`);
});