exports.getDashboardAnalytics = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const submissionsCollection = db.collection('submissions');

        // Aggregation 1: Calculate average score for each exam
        const averageScores = await submissionsCollection.aggregate([
            {
                $group: {
                    _id: "$examTitle", // Group by the exam title
                    averageScore: { $avg: { $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100] } }
                }
            },
            { $sort: { _id: 1 } } // Sort by exam title alphabetically
        ]).toArray();

        // Aggregation 2: Calculate overall pass/fail counts
        const passFailData = await submissionsCollection.aggregate([
            {
                $project: {
                    percentage: { $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100] }
                }
            },
            {
                $group: {
                    _id: null,
                    passCount: { $sum: { $cond: [{ $gte: ["$percentage", 50] }, 1, 0] } },
                    failCount: { $sum: { $cond: [{ $lt: ["$percentage", 50] }, 1, 0] } }
                }
            }
        ]).toArray();
        
        const passFailResult = passFailData.length > 0 ? passFailData[0] : { passCount: 0, failCount: 0 };

        res.json({
            status: 'success',
            analytics: {
                averageScores: averageScores.map(item => ({
                    title: item._id,
                    score: Math.round(item.averageScore)
                })),
                passFail: {
                    pass: passFailResult.passCount,
                    fail: passFailResult.failCount
                }
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch analytics.' });
    }
};