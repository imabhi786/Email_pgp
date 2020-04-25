const express = require('express');
const app = express();
const router = express.Router();
const bcrypt = require('bcryptjs');
const openpgp = require('openpgp');
const key = require('../../setup/myDBurl').secret;

const User = require('../../models/user');

openpgp.initWorker({ path: 'openpgp.worker.js' })

router.post('/add_key', (req, res) => {
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
                    console.log("key added successfully");
                })
                    .catch((err) => console.log(err));;
                //Encrypt password using bcrypt
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(newUser.password, salt, function (err, hash) {
                        if (err) throw err;
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
        .catch((err) => console.log(err));
    res.redirect('/api/home/key-management');
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
    const pubkey = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v4.10.4
Comment: https://openpgpjs.org

xsBNBF6kClIBCAC6EjIvcmLyuC4719yOVfJQy8SnAGAjxVTAGOQPC6r/h7VA
cCsLYVOCNwXalt+gSLll1mNK6tqM2twv2ayruFYFHMJgz6g5K323ZTKPVh2v
2wd+x0VZPw/goS1gsX79qerYDb6uGWhqlxVe3cidFxTk5qeY669s4VRYwPEM
BxzxnZ+ZuO2wGwj4zbJOKixDpP8o+LN4+fQs3xI5cknk0Eg03oWlT1ZDi8Np
fbuV+bSJVtZG4M2EB27a1BktenIvBSBT2wAj83J8milB02+PQ93LektD7f2Y
VHtAcEgGM9LWtl4w8BMLHBhmoq7WbKoSINGF9YikcFyMeruvn9OWEPlVABEB
AAHNIW5vZWxhYnlkYXMgPG5vZWxhYnlkYXNAZ21haWwuY29tPsLAdgQQAQgA
IAUCXqQKUgYLCQcIAwIEFQgKAgQWAgEAAhkBAhsDAh4BAAoJEGTC1zBix177
8xkH/3x6mri9uJVmOO1f34QPJ9swCCUCMQxZxmOQVawZJ6DKCq9NQIrpAccZ
k21pfGHA+FNyDb3lfwgvr6yZVlMYKLZFUpBaL9dIc/7g/bDjaHwFxP9pJqfG
8Oj+rv1ZSjOSaxblcfFF1rAAm0MvWxJiCuEeB2ZbXgoN+/TmxXdq0Ev0lIWR
J6/BV80LUdxJ7jTHNMrpcRU+fwAC8eGApRRJOcl8mqg2S24lxcSekymK2Dgs
VFnKKkCjy7hsQCa+myafWAGPBchtAJWMRkRg6ruk5pstT/T8HFfM9LJOGUsh
FAxCinGIke7fjepuHjCTIgMKzuyChhcM8qGlvgK/pTv510vOwE0EXqQKUgEI
AMfnDfu3t+zTPOycJWdlymfyOPa3dSQW2yS+adBb4P6FLol4GMIUMaKWCHmg
X+y2s7a67zWoL8kys9EvMQDuRB6O7rNGYByvAg+wpDxwrM/WVCXsEURSCQi1
WBgxCyA+8V+crtRf5DBx06ntSH51IqBDCC+YDHx5jIDiGelzBVScaYZzyMQD
lC8RgH+/yWDc/JZ4hC7UCLzw7Sl8OrxfyRvsntAo061Yr3+lbDsi2tVz0fT2
tSFmtJXlQeTcuc2Kvtu+dXRrsklr5xYsQMeUJfR36df/YJXfx/Ca/k2BY4Qm
10qaf/KH8W1VK0eSdtOrNlx8IyrmVwUNU43VEFklq6UAEQEAAcLAXwQYAQgA
CQUCXqQKUgIbDAAKCRBkwtcwYsde+6reCACOdbnBQo/BgBVG+bAVWwmjbTNb
C+a7qY61yZFZU98yxSI5FtRXRelT9rG1TG81wCpdo1Yp8fyNamtBxb8MokPw
uIqO2MjFpED7H8Ajdxn3lsOO2+IfjTfCuVhTUYTO9PefIG0tiibkfPlq7xug
+CcLoUPA7Kgtf4KA75eI5ecbzvHc3biklW+G5ogZqmy0rsdhIYI/Vdv9J/ZU
TavnnwEYPQxqBDIu1pGPqc1+ngIZ+obgF6Lr+ZfCc/39Q+fMkcUA7eZazBME
bDhHoltjDDYL0VlYaLcFkuc16oxy9zG0lJkVlMxLswhoM/xt9khJRwgc5X/p
+MJ07AHUk6DHLkAL
=FiC1
-----END PGP PUBLIC KEY BLOCK-----`

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
});



router.post('/decrypt-message', (req, res) => {

    // TODO : fetch the private key and passphrase from local store and put it here

    const privkey = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: OpenPGP.js v4.10.4
Comment: https://openpgpjs.org

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
wnTsAdSToMcuQAs=
=AukY
-----END PGP PRIVATE KEY BLOCK-----` //encrypted private key
    const passphrase = `noel aby das` //what the privKey is encrypted with

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

});


module.exports = router;