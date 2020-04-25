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
    res.render('key-generate');
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

//All routes
const auth = require('./routes/api/auth');
const home = require('./routes/api/home');


app.use('/api/auth', auth);
app.use('/api/home', home);

app.listen(port, () => {
    console.log(`Server running at ${port}`);
});