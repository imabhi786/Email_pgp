const mongoose = require('mongoose');

const schema = mongoose.Schema;

const userSchema =  new schema({
    name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true
    },
    password : {
        type : String,
        required : true
    }, 
    algorithm : {
        type :  String,
        required : true
    },
    key_size : {
        type : Number,
        required : true
    },
    public_key : {
        type : String,
        required : true
    },
    private_key : {
        type : String,
        required : true
    },
    date : {
        type : Date,
        default : Date.now
    }
});

module.exports = user = mongoose.model("myUser",userSchema);