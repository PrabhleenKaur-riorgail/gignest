import jwt from 'jsonwebtoken';

// Creates a signed token that identifies the user for the next 7 days.
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

export default generateToken;
