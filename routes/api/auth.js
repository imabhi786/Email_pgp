const express = require('express');
const app = express();
const router = express.Router();
const bcrypt = require('bcryptjs');
const openpgp = require('openpgp');
const key = require('../../setup/myDBurl').secret;

const User = require('../../models/user');

openpgp.initWorker({ path: 'openpgp.worker.js' })

router.post('/add_key', (req, res) => {
    var global_key;
    User
        .findOne({ email: req.body.email })
        .then(user => {
            if (user) {
                return res.status(400).json({ emailError: 'Email has registered public key already' });
            }
            else {
                const newUser = new User({
                    name: req.body.name,
                    email: req.body.email,
                    algorithm: req.body.algorithm,
                    key_size: req.body.size,
                    password: req.body.password
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
                    newUser.private_key = pubkey;
                    global_key = key;
                    res.render("key-generate",{
                        key: global_key
                    })
                    console.log("key added successfully");
                }).then(function () {
                    bcrypt.genSalt(10, function (err, salt) {
                        console.log('public key ->>>', newUser);
                        bcrypt.hash(newUser.password, salt, function (err, hash) {
                            if (err) throw err;
                            newUser.password = hash;
                            newUser
                                .save()
                                .then(user => console.log("User added to DB successfully"))
                                .catch(err => console.log('main2', err));
                        });
                    });
                })
                .catch((err) => console.log('main', err));;
            }
        })
        .catch((err) => console.log('main3', err));
        // res.redirect('/api/home/key-management');
});


router.post('/get_key', (req, res) => {
    User
        .findOne({ email: req.body.email })
        .then(user => {
            if (user) {
                res.render('key-publish', {
                    public_key: user.public_key
                })
            }
            else {
                return res.status(400).json({ Error: "User does not exist" });
            }
        })
        .catch(err => console.log(err));
    // res.redirect('/api/home/key-publish');
})

router.post('/encrypt-message', (req, res) => {
    // TODO: get public key from mongo based on the lookup and put here
   User
   .findOne({email: req.body.email})
   .then( user => {
        const pubkey = user.public_key;
        console.log(pubkey);
        const encryptDecryptFunction = async () => {
            const options = {
                message: openpgp.message.fromText(req.body.message),       // input as Message object
                publicKeys: (await openpgp.key.readArmored(pubkey)).keys // for encryption
            }
            const { data: encrypted } = await openpgp.encrypt(options)
            return encrypted
        }
        const prom = encryptDecryptFunction();
        prom.then(function (result) {
            res.render('encrypt', {
                msg: result
            })
        })
   })
   .catch( err => console.log(err))
});



router.post('/decrypt-message', (req, res) => {

    // TODO : fetch the private key and passphrase from local store and put it here
    User
    .findOne({email: req.body.email})
    .then( user => {
        const privkey = user.private_key;
        const passphrase = `abc123`;
        const encryptDecryptFunction = async () => {
            console.log("init1", openpgp)
            const privKeyObj = (await openpgp.key.readArmored(privkey)).keys[0]
            await privKeyObj.decrypt(passphrase)
            const encrypted = req.body.message;
            console.log(encrypted);
    
            const options1 = {
                message: await openpgp.message.readArmored(encrypted),    // parse armored message
                privateKeys: [privKeyObj]                                 // for decryption
            }
    
            const plaintext = await openpgp.decrypt(options1);
            console.log(plaintext.data)
            return plaintext.data // 'Hello, World!'
        }
    
        const prom = encryptDecryptFunction();
        prom.then(function (result) {
            res.render('decrypt', {
                msg: result
            })
        }).catch(function (err) {
            res.render('decrypt', {
                msg: err
            })
        })
    })
    .catch( err => console.log(err));

});


module.exports = router;