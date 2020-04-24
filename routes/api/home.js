const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');


const User  = require('../../models/user')

router.get('/',(req,res)=>{

    User
    .find()
    .then( user=>{
        res.render('home',{
            value: user
        });
    })
    .catch((err)=> console.log(err));
})

module.exports = router;