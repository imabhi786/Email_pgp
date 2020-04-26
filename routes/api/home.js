const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const common = require("../../common");
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
        userEmail:common.userEmail,
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
    res.render('decrypt', {
        userEmail : common.userEmail,
        msg: 1
    });
});

router.get('/key-revoke',(req,res) => {
    User
        .find()
        .then(user => {
            res.render('key-revoke', {
                userEmail:common.userEmail,
                value: user
            });
        })
        .catch((err) => console.log(err));
})


router.get('/sign', (req, res) => {

    res.render('sign', {
        userEmail:common.userEmail,
        key: [],
        msg: 1
    });

});

router.get('/sign_verify', (req, res) => {

    res.render('sign_verify', {
        msg: 1
    });

});

router.get('/key-regenerate', (req, res) => {
    res.render('key-generate', {
        userEmail:common.userEmail,
        key: []
    });
});


module.exports = router;