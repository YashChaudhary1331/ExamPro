const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET; // Use variable from .env

// --- Multer Configuration for Avatar Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars/');
    },
    filename: function (req, file, cb) {
        // CORRECTED: Create a unique filename without using req.body.email
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
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
            res.json({ status: 'success', message: 'Login successful!', role: user.role, fullName: user.fullName });
        } else {
            res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: 'error', message: 'An error occurred during login.' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const userEmail = req.query.email;
        if (!userEmail) {
            return res.status(400).json({ status: 'error', message: 'User email is required.' });
        }
        const usersCollection = db.collection('users');
        const userProfile = await usersCollection.findOne({ email: userEmail }, { projection: { password: 0, _id: 0 } });
        if (userProfile) {
            res.json({ status: 'success', profile: userProfile });
        } else {
            res.status(404).json({ status: 'error', message: 'User not found.' });
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch user profile.' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { email, currentPassword, newPassword } = req.body;
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
        const { email, fullName } = req.body;
        if (!email || !fullName) {
            return res.status(400).json({ status: 'error', message: 'Email and full name are required.' });
        }
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
        const userEmail = req.query.email;
        if (!userEmail) {
            return res.status(400).json({ status: 'error', message: 'User email is required.' });
        }
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
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: 'error', message: 'Email and password are required for deletion.' });
        }
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
        const email = req.body.email;
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const usersCollection = db.collection('users');
        await usersCollection.updateOne({ email: email }, { $set: { avatarUrl: avatarUrl } });
        res.json({ status: 'success', message: 'Avatar uploaded successfully!', avatarUrl: avatarUrl });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ status: 'error', message: 'Server error during avatar upload.' });
    }
};

// Export the upload middleware
exports.uploadMiddleware = upload.single('avatar');
// ... keep all existing functions ...

// Add this new function at the end of the file
exports.removeAvatar = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { email } = req.body;
        const usersCollection = db.collection('users');

        // 1. Find the user to get their current avatar URL
        const user = await usersCollection.findOne({ email: email });
        if (user && user.avatarUrl) {
            // 2. Delete the physical file from the server
            const filePath = path.join(__dirname, '..', user.avatarUrl); // Go up one directory from /controllers
            fs.unlink(filePath, (err) => {
                if (err) console.error("Error deleting avatar file:", err);
            });
        }

        // 3. Remove the avatarUrl field from the user's document in the database
        await usersCollection.updateOne({ email: email }, { $unset: { avatarUrl: "" } });

        res.json({ status: 'success', message: 'Avatar removed successfully.' });
    } catch (error) {
        console.error('Error removing avatar:', error);
        res.status(500).json({ status: 'error', message: 'Server error during avatar removal.' });
    }
};