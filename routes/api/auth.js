const express = require('express');
const app = express();
const router = express.Router();
const bcrypt = require('bcryptjs');
const openpgp = require('openpgp');
const key = require('../../setup/myDBurl').secret;

const User = require('../../models/user');

openpgp.initWorker({ path: 'openpgp.worker.js' })

router.post('/add_key',(req,res)=>{
    User
    .findOne({email:req.body.email})
    .then( user => {
        if(user){
            return res.status(400).json({emailError : 'Email has registered public key already'});
        }
        else{
            const newUser = new User({
                name : req.body.name,
                email : req.body.email,
                algorithm : req.body.algorithm,
                key_size : req.body.size,
                password : req.body.password
            });
            const options = {
                userIds: [{ name: req.body.name, email: req.body.email }],
                numBits: parseInt(req.body.size),        
                passphrase: req.body.password         
            };
            var privkey, pubkey, revocationCertificate;
            openpgp.generateKey(options).then(function (key) {
                privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
                pubkey = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                revocationCertificate = key.revocationCertificate; // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                newUser.public_key = pubkey;
                console.log("key added successfully");
            })
            .catch((err) => console.log(err));;
            //Encrypt password using bcrypt
            bcrypt.genSalt(10, function(err, salt){
                bcrypt.hash(newUser.password, salt, function(err, hash){
                    if(err) throw err;
                    newUser.password = hash;
                    //write your key generator function here (name,email,hash)
                    
                    newUser
                         .save()
                         .then(user => console.log("User added to DB successfully"))
                         .catch(err => console.log(err));
                }); 
            });
        }
    })
    .catch((err)=> console.log(err));
    res.redirect('/api/home/key-management');
});


router.post('/get_key', (req,res) => {
    User
    .findOne({email : req.body.email})
    .then( user => {
        if(user) {
            res.render('key-publish',{
                public_key : user.public_key
            })
        }
        else{
            return res.status(400).json({Error : "User does not exist" });
        }
    })
    .catch(err => console.log(err));
    // res.redirect('/api/home/key-publish');
})

module.exports = router;