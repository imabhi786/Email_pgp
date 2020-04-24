const express = require('express');
const app = express();
const router = express.Router();
const key = require('../../setup/myDBurl').secret;

const User = require('../../models/user');

router.post('/add_key',(req,res)=>{
    User
    .findOne({email:req.body.email})
    .then( user =>{
        if(user){
            return res.status(400).json({emailError : 'Email has registered public key already'});
        }
        else{
            const newUser = new User({
                email : req.body.email,
                public_key : req.body.public_key
            });
            newUser
                .save()
                .then(user => console.log(user))
                .catch(err => console.log(err));
            
            res.redirect('/api/home');
        }
    })
    .catch((err)=> console.log(err));
});


module.exports = router;