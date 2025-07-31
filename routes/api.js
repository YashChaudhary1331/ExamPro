const express = require('express');
const router = express.Router();

// Import all controllers
const userController = require('../controllers/userController');
const examController = require('../controllers/examController');
const snapshotController = require('../controllers/snapshotController');
const dataController = require('../controllers/dataController');
const analyticsController = require('../controllers/analyticsController');

// --- User Routes ---
router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.get('/profile', userController.getProfile);
router.post('/change-password', userController.changePassword);
router.post('/profile', userController.updateProfile); 
router.get('/profile/stats', userController.getProfileStats);
router.delete('/profile', userController.deleteAccount); 
router.post('/profile/avatar', userController.uploadMiddleware, userController.uploadAvatar);
router.delete('/profile/avatar', userController.removeAvatar);

// --- Exam Routes ---
router.post('/save-exam', examController.saveExam);
router.get('/exams', examController.getAllExams);
router.get('/exam/:id', examController.getExamById);
router.delete('/exams/:id', examController.removeExam);
router.post('/submit-exam/:id', examController.submitExam); // <-- ADD THIS NEW LINE
router.get('/my-results', examController.getStudentResults); 

// --- Snapshot Routes ---
router.post('/save-snapshot', snapshotController.saveSnapshot);
router.get('/get-snapshots', snapshotController.getSnapshots);
router.delete('/delete-snapshot/:filename', snapshotController.deleteSnapshot);
router.post('/clear-snapshots', snapshotController.clearSnapshots);

// --- All Data Page Routes ---
router.get('/get-all-users', dataController.getAllUsers);
router.get('/get-all-exams', examController.getAllExams); // Re-use the existing controller function
router.get('/get-all-snapshots-data', dataController.getAllSnapshotsData);

// --- Analytics Routes (NEW) ---
router.get('/analytics/dashboard', analyticsController.getDashboardAnalytics); // <-- ADD THIS LINE

module.exports = router;
