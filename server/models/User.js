const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  college_email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: (v) => /@vit\.edu$/.test(v),
      message: 'Only @vit.edu email addresses are allowed.',
    },
  },
  full_name: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100,
  },
  contact: {
    type: String,
    default: '',
    trim: true,
    maxlength: 20,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  avatar_url: {
    type: String,
    default: null,
  },
  trust_score: {
    type: Number,
    default: 100,
  },
  is_admin: {
    type: Boolean,
    default: false,
  },
  is_banned: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Return safe profile (no password)
userSchema.methods.toProfile = function () {
  return {
    id: this._id,
    _id: this._id,
    username: this.username,
    college_email: this.college_email,
    full_name: this.full_name || '',
    contact: this.contact || '',
    avatar_url: this.avatar_url,
    trust_score: this.trust_score,
    is_admin: this.is_admin,
    is_banned: this.is_banned,
  };
};

module.exports = mongoose.model('User', userSchema);
