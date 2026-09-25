const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    dateOfBirth: {
        type: String,
        required: true
    },

    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});


userSchema.pre(
    'save',
    async function(next) {

        if (!this.isModified('password')) {
            return next();
        }

        try {

            const salt =
                await bcrypt.genSalt(10);

            this.password =
                await bcrypt.hash(
                    this.password,
                    salt
                );

            next();

        } catch (error) {

            next(error);

        }

    }
);


userSchema.methods.comparePassword =
    async function(candidatePassword) {

        return await bcrypt.compare(
            candidatePassword,
            this.password
        );

    };


module.exports =
    mongoose.model(
        'User',
        userSchema
    );