import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries unless we ask for it
    },
    role: {
      type: String,
      enum: ['client', 'freelancer', 'admin'],
      default: 'client',
    },

    // Profile fields (the profile pages come in the next step)
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 1000 },
    skills: [{ type: String, trim: true }],
    hourlyRate: { type: Number, min: 0, default: 0 },
    portfolioLinks: [{ type: String, trim: true }],
    company: { type: String, default: '', trim: true },

    // Reputation (updated when reviews are added)
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash the password before saving, only if it was changed.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Make sure the password hash is never included when a user is sent as JSON.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
export default User;
