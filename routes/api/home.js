const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');


const User = require('../../models/user')

router.get('/', (req, res) => {

    User
        .find()
        .then(user => {
            res.render('home', {
                value: user
            });
        })
        .catch((err) => console.log(err));
})


router.get('/key-management', (req, res) => {

    User
        .find()
        .then(user => {
            res.render('key-management', {
                value: user
            });
        })
        .catch((err) => console.log(err));
})


router.get('/key-generate',(req,res) => {
    res.render('key-generate',{
        key: []
    });
})

router.get('/key-publish', (req, res) => {
    res.render('key-publish', {
        public_key: []
    });
});

router.get('/encrypt', (req, res) => {
    res.render('encrypt', {
        msg: 1
    });
});

router.get('/decrypt', (req, res) => {
    res.render('decrypt');
});
module.exports = router;