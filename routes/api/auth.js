const express = require('express');
const app = express();
const router = express.Router();
const bcrypt = require('bcryptjs');
const openpgp = require('openpgp');
const fs = require('fs');
const key = require('../../setup/myDBurl').secret;

const User = require('../../models/user');

openpgp.initWorker({ path: 'openpgp.worker.js' })

router.post('/add_key', (req, res) => {
    var privkey, pubkey, revocationCertificate, global_key;
    User
        .findOne({ email: req.body.email })
        .then(user => {
            if (user) {
                if (user.public_key != 'REVOKED') {
                    return res.status(400).json({ emailError: 'Email has registered public key already' });
                }
                else {
                    user.name = req.body.name;
                    user.email = req.body.email;
                    user.algorithm = req.body.algorithm;
                    user.key_size = req.body.size;


                    bcrypt.genSalt(10, function (err, salt) {
                        bcrypt.hash(req.body.password, salt, function (err, hash) {
                            if (err) throw err;
                            user.password = hash;

                            options = {
                                userIds: [{ name: req.body.name, email: req.body.email }],
                                numBits: parseInt(req.body.size),
                                passphrase: user.password
                            };
                            openpgp.generateKey(options).then(function (key) {
                                privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
                                pubkey = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                                revocationCertificate = key.revocationCertificate; // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                                user.public_key = pubkey;
                                user.private_key = privkey;
                                global_key = key;
                                res.render("key-generate", {
                                    key: "global_key"
                                })
                                console.log("key added successfully");
                            }).then(function () {
                                user
                                    .save()
                                    .then(user => console.log("User updated to DB successfully"))
                                    .catch(err => console.log('main2', err));
                            })
                                .catch((err) => console.log('main', err));
                        });
                    });

                }
            }

            else {
                const newUser = new User({
                    name: req.body.name,
                    email: req.body.email,
                    algorithm: req.body.algorithm,
                    key_size: req.body.size,
                });
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(req.body.password, salt, function (err, hash) {
                        if (err) throw err;
                        newUser.password = hash;

                        options = {
                            userIds: [{ name: req.body.name, email: req.body.email }],
                            numBits: parseInt(req.body.size),
                            passphrase: newUser.password
                        };

                        openpgp.generateKey(options).then(function (key) {
                            privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
                            pubkey = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                            revocationCertificate = key.revocationCertificate; // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                            newUser.public_key = pubkey;
                            newUser.private_key = privkey; //TODO: remove from database
                            global_key = key;

                            res.render("key-generate", {
                                key: "key added"
                            })
                            console.log("key added successfully");
                        }).then(function () {
                            newUser
                                .save()
                                .then(user => console.log("User added to DB successfully"))
                                .catch(err => console.log('main2', err));

                        }).then(function () {
                            //downloading the private key
                            console.log('Download start')
                            try {
                                if (!fs.existsSync('C:\\PGPExpress_keys')) {
                                    fs.mkdirSync('C:\\PGPExpress_keys')
                                    console.log('Directory made')
                                }
                            } catch (err) {
                                console.error(err)
                            }
                            // writeFile function with filename, content and callback function
                            var name = "C:\\PGPExpress_keys\\" + req.body.email.split('.')[0] + ".txt";
                            fs.writeFile(name, privkey, function (err) {
                                if (err) throw err;
                                console.log('File is created successfully.');
                            });
                        })
                            .catch((err) => console.log('main', err));
                    })
                })
            }
            // res.redirect('/api/home/key-management');
        })
        .catch(err => console.log("DB", err));
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

router.post('/hash-sign', (req, res) => {

    const path = "C:\\PGPExpress_keys\\" + req.body.email.split('.')[0] + ".txt";

    try {
        if (fs.existsSync(path)) {
            //file exists
            fs.readFile(path, function (err, data) {
                if (err) {
                    res.render('sign', {
                        msg: err,
                        userEmail: req.body.email,
                    })
                    throw err;
                }
                const privKey = data.toString('utf8');

                const SignFunction = async () => {
                    try {
                        const { keys: [privateKey] } = await openpgp.key.readArmored(privKey);
                        await privateKey.decrypt(req.body.password);

                        const { data: cleartext } = await openpgp.sign({
                            message: openpgp.cleartext.fromText(req.body.message), // CleartextMessage or Message object
                            privateKeys: [privateKey]                             // for signing
                        });

                        return { text: cleartext, mail: req.body.email }
                    } catch{
                        console.error('Incorrect Password')
                        return
                    }
                }
                try {
                    const prom = SignFunction();
                    prom.then(function (result) {
                        res.render('sign', {
                            msg: result.text,
                            userEmail: result.mail,
                        })
                        console.log('Signed message')

                    }).catch(function (err) {
                        console.log(err)
                        res.render('sign', {
                            msg: err,
                            userEmail: req.body.email,
                        })
                    });
                } catch{
                    console.log('Final')
                }
            });
        } else {
            res.render('sign', {
                msg: 'Key does not exist in local machine',
                userEmail: req.body.email,
            })
        }
    } catch (path) {
        res.render('sign', {
            msg: path,
            userEmail: req.body.email,
        })
    }
});

router.post('/sign-verify', (req, res) => {
    User
        .findOne({ email: req.body.email })
        .then(user => {
            const pubkey = user.public_key;
            const signVerifyFunction = async () => {
                const verified = await openpgp.verify({
                    message: await openpgp.cleartext.readArmored(req.body.signature),           // parse armored message
                    publicKeys: (await openpgp.key.readArmored(pubkey)).keys // for verification
                });
                const { valid } = verified.signatures[0];
                if (valid) {
                    res.render('sign_verify', {
                        msg: 'Signature is valid\nSigned by key id ' + verified.signatures[0].keyid.toHex()
                    })
                }
            }

            const prom = signVerifyFunction();
            prom.catch(function (err) {
                console.error('Invalid Signature')
                res.render('sign_verify', {
                    msg: 'signature could not be verified'
                })
            });
        })
        .catch(function (err) {
            res.render('sign_verify', {
                msg: err
            })
        })

})

router.post('/encrypt-message', (req, res) => {
    // TODO: get public key from mongo based on the lookup and put here
    User
        .findOne({ email: req.body.email })
        .then(user => {
            const pubkey = user.public_key;
            if (pubkey == "REVOKED") {
                return res.status(400).json({ Error: ' Public key has been revoked by the user' });
            }
            else {
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
            }
        })
        .catch(err => console.log(err))

});



router.post('/decrypt-message', (req, res) => {

    // TODO : fetch the private key and passphrase from local store and put it here
    const path = "C:\\PGPExpress_keys\\" + req.body.email.split('.')[0] + ".txt";
    var privkey;
    if (fs.existsSync(path)) {
        fs.readFile(path, function (err, data) {
            if (err) {
                res.render('sign', {
                    msg: err,
                    userEmail: req.body.email,
                })
                throw err;
            }
            privkey = data.toString('utf8');
            User
                .findOne({ email: req.body.email })
                .then(user => {
                    const passphrase = user.password;
                    const encryptDecryptFunction = async () => {
                        const privKeyObj = (await openpgp.key.readArmored(privkey)).keys[0]
                        await privKeyObj.decrypt(passphrase)
                        const encrypted = req.body.message;

                        const options1 = {
                            message: await openpgp.message.readArmored(encrypted),    // parse armored message
                            privateKeys: [privKeyObj]                                 // for decryption
                        }

                        const plaintext = await openpgp.decrypt(options1);
                        return plaintext.data;
                    }

                    const prom = encryptDecryptFunction();
                    prom.then(function (result) {
                        res.render('decrypt', {
                            msg: result,
                            userEmail: req.body.email
                        })
                    }).catch(function (err) {
                        res.render('decrypt', {
                            msg: err,
                            userEmail: req.body.email
                        })
                    })
                })
                .catch(err => console.log(err));
        })
    }
    else {
        res.send("User does not have private key");
    }
});



router.post('/revoke_key', (req, res) => {

    passwordEntered = req.body.password;
    emailEntered = req.body.email;

    User
        .findOne({ email: emailEntered })
        .then(user => {

            if (user) {
                const dBpassword = user.password;

                bcrypt.compare(passwordEntered, dBpassword)
                    .then((isCorrect) => {
                        if (isCorrect) {
                            user.public_key = 'REVOKED';
                            user
                                .save()
                                .then(user => console.log("Revoked successfully"))
                                .catch(err => console.log('NOOOOOO ', err));
                            res.render('key-regenerate', {
                                public_key: user.public_key
                            })
                        }
                        else {
                            res.status(400).json({ message: 'Incorrect password' });
                        }
                    })
                    .catch(err => console.log(err));
            }
            else {
                return res.json({ message: 'Email not Registered' });
            }
        })
        .catch(err => console.log(err));
});



//Ajax request
router.get('/email', (req, res) => {
    let input = req.query.e;
    if (input.indexOf('@') == -1) {
        res.send("Email is not valid");
        return;
    }
    User
        .findOne({ email: input })
        .then(user => {
            if (!user) {
                res.send('User does not exist');
                return
            }
            else {
                if (user.public_key == "REVOKED") {
                    res.send("Public key of this user is revoked");
                    return;
                }
                else {
                    res.send("Valid email");
                    return;
                }
            }
        })
        .catch(err => console.log(err));
});


module.exports = router;

