const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const env = require("../config/env");
const { User, RESOURCES } = require("../models");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendPasswordReset } = require("../services/mailService");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const createToken = (user) => jwt.sign({ id: user.id }, env.jwtSecret, { expiresIn: "30d" });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, lang: user.lang });

const signup = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = String(req.body.password || "");

  if (!name || !EMAIL_PATTERN.test(email) || password.length < 8) {
    throw new AppError("Enter your name, a valid email and a password of at least 8 characters");
  }
  if (await User.findOne({ email })) throw new AppError("This email is already registered. Please log in", 409);

  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: createToken(user), user: publicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const user = await User.findOne({ email });
  const passwordOk = user && (await bcrypt.compare(String(req.body.password || ""), user.password));
  if (!passwordOk) throw new AppError("Wrong email or password", 401); // same message for both cases

  res.json({ token: createToken(user), user: publicUser(user) });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError("Please log in", 401);
  res.json({ user: publicUser(user) });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError("Please log in", 401);

  if (req.body.name) user.name = String(req.body.name).trim().slice(0, 80);
  if (req.body.lang) user.lang = String(req.body.lang).slice(0, 5);

  if (req.body.newPassword) {
    if (String(req.body.newPassword).length < 8) throw new AppError("New password must be at least 8 characters");
    const currentOk = await bcrypt.compare(String(req.body.currentPassword || ""), user.password);
    if (!currentOk) throw new AppError("Your current password is wrong");
    user.password = await bcrypt.hash(String(req.body.newPassword), 12);
  }

  await user.save();
  res.json({ user: publicUser(user) });
});

// Deletes the account and every record that belongs to it.
const deleteMe = asyncHandler(async (req, res) => {
  await Promise.all(Object.values(RESOURCES).map((Model) => Model.deleteMany({ user: req.userId })));
  await User.deleteOne({ _id: req.userId });
  res.json({ ok: true });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || "").toLowerCase().trim() });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetHash = hashToken(token); // only the hash is stored
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    try {
      await sendPasswordReset(user.email, token);
    } catch (err) {
      console.error("Could not send reset email:", err.message);
    }
  }
  res.json({ ok: true }); // same answer whether or not the email exists
});

const resetPassword = asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (password.length < 8) throw new AppError("Password must be at least 8 characters");

  const user = await User.findOne({
    resetHash: hashToken(String(req.body.token || "")),
    resetExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError("This reset link is invalid or has expired");

  user.password = await bcrypt.hash(password, 12);
  user.resetHash = undefined;
  user.resetExpires = undefined;
  await user.save();
  res.json({ ok: true });
});

module.exports = { signup, login, getMe, updateMe, deleteMe, forgotPassword, resetPassword };
