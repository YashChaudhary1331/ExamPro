exports.getAllUsers = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const usersCollection = db.collection('users');
        const users = await usersCollection.find({}).project({ _id: 0, password: 0 }).toArray();
        res.json({ status: 'success', users: users });
    } catch (error) {
        console.error('Error retrieving all users:', error);
        res.status(500).json({ status: 'error', message: 'Failed to retrieve users.' });
    }
};

exports.getAllSnapshotsData = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const snapshotsCollection = db.collection('snapshots');
        const snapshots = await snapshotsCollection.find({})
                                                  .sort({ timestamp: -1 })
                                                  .project({ _id: 0 })
                                                  .toArray();
        res.json({ status: 'success', snapshots: snapshots });
    } catch (error) {
        console.error('Error retrieving all snapshots data:', error);
        res.status(500).json({ status: 'error', message: 'Failed to retrieve snapshots data.' });
    }
};