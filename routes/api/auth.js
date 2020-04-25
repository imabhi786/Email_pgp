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
            var privkey, pubkey, revocationCertificate, global_key;
            openpgp.generateKey(options).then(function (key) {
                global_key = key;
                privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
                pubkey = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                revocationCertificate = key.revocationCertificate; // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                newUser.public_key = pubkey;
                console.log("key added successfully");
                res.render("key-generate",{
                    key: global_key
                });
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

module.exports = router;