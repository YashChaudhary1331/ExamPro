const { ObjectId } = require('mongodb');

exports.saveExam = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const examData = { ...req.body, createdOn: new Date() };
        const examsCollection = db.collection('exams');
        const result = await examsCollection.insertOne(examData);
        res.json({ status: 'success', message: 'Exam saved successfully!' });
    } catch (error) {
        console.error('Error saving exam to database:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save exam.' });
    }
};

exports.getExamById = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const examsCollection = db.collection('exams');
        const exam = await examsCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (exam) {
            res.json({ status: 'success', exam: exam });
        } else {
            res.status(404).json({ status: 'error', message: 'Exam not found.' });
        }
    } catch (error) {
        console.error('Error fetching single exam from database:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch exam.' });
    }
};

exports.getAllExams = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const examsCollection = db.collection('exams');
        const exams = await examsCollection.find({}).sort({ createdOn: -1 }).toArray();
        res.json({ status: 'success', exams: exams });
    } catch (error) {
        console.error('Error fetching exams from database:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch exams.' });
    }
};

exports.removeExam = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const examsCollection = db.collection('exams');
        const result = await examsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 1) {
            res.json({ status: 'success', message: 'Exam removed successfully.' });
        } else {
            res.status(404).json({ status: 'error', message: 'Exam not found or already deleted.' });
        }
    } catch (error) {
        console.error('Error removing exam from database:', error);
        res.status(500).json({ status: 'error', message: 'Failed to remove exam.' });
    }
};

exports.submitExam = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const examId = req.params.id;
        const { userAnswers, studentEmail } = req.body;

        const examsCollection = db.collection('exams');
        const exam = await examsCollection.findOne({ _id: new ObjectId(examId) });

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }

        let score = 0;
        exam.questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];

            // Use a switch statement to handle different scoring logic
            switch (question.type) {
                case 'true-false':
                    // For true/false, the user's answer will be 0 (for 'True') or 1 (for 'False')
                    // We compare if the boolean value of the correct answer matches the user's choice
                    if ((question.correct === true && userAnswer === 0) || (question.correct === false && userAnswer === 1)) {
                        score++;
                    }
                    break;
                
                case 'multiple-choice':
                default:
                    // Default logic for multiple choice
                    if (question.correct === userAnswer) {
                        score++;
                    }
                    break;
            }
        });

        const submissionsCollection = db.collection('submissions');
        await submissionsCollection.insertOne({
            studentEmail: studentEmail,
            examId: new ObjectId(examId),
            examTitle: exam.title,
            score: score,
            totalQuestions: exam.questions.length,
            dateTaken: new Date()
        });
        
        res.json({
            status: 'success',
            message: 'Submission saved successfully!',
            score: score,
            total: exam.questions.length
        });

    } catch (error) {
        console.error('Error submitting exam:', error);
        res.status(500).json({ status: 'error', message: 'Failed to submit exam.' });
    }
};

exports.getStudentResults = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const studentEmail = req.query.email;

        if (!studentEmail) {
            return res.status(400).json({ status: 'error', message: 'Student email is required.' });
        }

        const submissionsCollection = db.collection('submissions');
        
        const results = await submissionsCollection.find({ studentEmail: studentEmail })
                                                   .sort({ dateTaken: -1 })
                                                   .toArray();
        
        res.json({ status: 'success', results: results });

    } catch (error) {
        console.error('Error fetching student results:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch results.' });
    }
};