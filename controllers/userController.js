const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;

// --- Cloudinary Configuration ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Multer Configuration for Cloudinary ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'exampro_avatars',
        allowed_formats: ['jpeg', 'png', 'jpg'],
    },
});

const upload = multer({ storage: storage });

// --- Controller Functions ---

exports.signup = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { fullName, email, password } = req.body;
        const role = email === 'admin@exam.pro' ? 'admin' : 'student';
        const usersCollection = db.collection('users');
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ status: 'error', message: 'User with this email already exists.' });
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userData = { fullName, email, password: hashedPassword, role };
        await usersCollection.insertOne(userData);
        res.json({ status: 'success', message: 'User registered successfully!' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to register user.' });
    }
};

exports.login = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { email, password } = req.body;
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email: email });
        if (user && await bcrypt.compare(password, user.password)) {
            const tokenPayload = { email: user.email, fullName: user.fullName, role: user.role };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });
            res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
            res.json({ status: 'success', message: 'Login successful!', user: { fullName: user.fullName, role: user.role } });
        } else {
            res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: 'error', message: 'An error occurred during login.' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ status: 'success', message: 'Logged out successfully.' });
};

exports.checkAuth = async (req, res) => {
    res.json({ status: 'success', user: req.user });
};

exports.getProfile = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const userEmail = req.user.email;
        const usersCollection = db.collection('users');
        const userProfile = await usersCollection.findOne({ email: userEmail }, { projection: { password: 0, _id: 0 } });
        if (userProfile) {
            res.json({ status: 'success', profile: userProfile });
        } else {
            res.status(404).json({ status: 'error', message: 'User not found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { currentPassword, newPassword } = req.body;
        const email = req.user.email;
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Incorrect current password.' });
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        await usersCollection.updateOne({ _id: user._id }, { $set: { password: hashedNewPassword } });
        res.json({ status: 'success', message: 'Password changed successfully!' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ status: 'error', message: 'An error occurred while changing the password.' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { fullName } = req.body;
        const email = req.user.email;
        const usersCollection = db.collection('users');
        const result = await usersCollection.updateOne({ email: email }, { $set: { fullName: fullName } });
        if (result.matchedCount === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }
        res.json({ status: 'success', message: 'Profile updated successfully!' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ status: 'error', message: 'An error occurred while updating the profile.' });
    }
};

exports.getProfileStats = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const userEmail = req.user.email;
        const submissionsCollection = db.collection('submissions');
        const stats = await submissionsCollection.aggregate([
            { $match: { studentEmail: userEmail } },
            { $group: { _id: null, totalExamsTaken: { $sum: 1 }, totalCorrect: { $sum: '$score' }, totalPossible: { $sum: '$totalQuestions' } } }
        ]).toArray();
        if (stats.length > 0) {
            const { totalExamsTaken, totalCorrect, totalPossible } = stats[0];
            const averageScore = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0;
            res.json({ status: 'success', stats: { totalExamsTaken, averageScore } });
        } else {
            res.json({ status: 'success', stats: { totalExamsTaken: 0, averageScore: 0 } });
        }
    } catch (error) {
        console.error('Error fetching profile stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch profile stats.' });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { password } = req.body;
        const email = req.user.email;
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Incorrect password. Account not deleted.' });
        }
        const submissionsCollection = db.collection('submissions');
        await submissionsCollection.deleteMany({ studentEmail: email });
        await usersCollection.deleteOne({ _id: user._id });
        res.json({ status: 'success', message: 'Account and all associated data have been permanently deleted.' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ status: 'error', message: 'An error occurred while deleting the account.' });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
        }
        const db = req.app.locals.db;
        const email = req.user.email;
        const avatarUrl = req.file.path;
        const usersCollection = db.collection('users');
        await usersCollection.updateOne({ email: email }, { $set: { avatarUrl: avatarUrl } });
        res.json({ status: 'success', message: 'Avatar uploaded successfully!', avatarUrl: avatarUrl });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ status: 'error', message: 'Server error during avatar upload.' });
    }
};

exports.removeAvatar = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const email = req.user.email;
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email: email });
        if (user && user.avatarUrl) {
            const publicIdWithFolder = user.avatarUrl.substring(user.avatarUrl.indexOf('exampro_avatars'));
            const publicId = publicIdWithFolder.substring(0, publicIdWithFolder.lastIndexOf('.'));
            cloudinary.uploader.destroy(publicId);
        }
        await usersCollection.updateOne({ email: email }, { $unset: { avatarUrl: "" } });
        res.json({ status: 'success', message: 'Avatar removed successfully.' });
    } catch (error) {
        console.error('Error removing avatar:', error);
        res.status(500).json({ status: 'error', message: 'Server error during avatar removal.' });
    }
};

exports.uploadMiddleware = upload.single('avatar');