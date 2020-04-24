const mongoose = require('mongoose');

const schema = mongoose.Schema;

const userSchema =  new schema({
    email : {
        type : String,
        required : true
    },
    public_key : {
        type : String,
        required : true
    },
    date : {
        type : Date,
        default : Date.now
    }
});

module.exports = user = mongoose.model("myUser",userSchema);