const fs = require('fs');
const path = require('path');

exports.saveSnapshot = (req, res) => {
    try {
        const db = req.app.locals.db;
        const { imageDataUrl, offScreenGaze } = req.body;
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, "");
        const filename = `snapshot_${Date.now()}.jpeg`;
        const filePath = path.join(__dirname, '..', 'snapshots', filename);

        fs.writeFile(filePath, base64Data, 'base64', async (err) => {
            if (err) {
                return res.status(500).json({ status: 'error', message: 'Failed to save snapshot image.' });
            }
            try {
                const snapshotsCollection = db.collection('snapshots');
                await snapshotsCollection.insertOne({
                    filename: filename,
                    timestamp: new Date(),
                    offScreenGaze: offScreenGaze
                });
                res.json({ status: 'success', message: 'Snapshot saved with metadata.' });
            } catch (dbError) {
                console.error("Failed to save snapshot metadata to DB:", dbError);
                res.status(500).json({ status: 'error', message: 'Failed to save snapshot metadata.' });
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error processing snapshot request.' });
    }
};

exports.getSnapshots = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const snapshotsCollection = db.collection('snapshots');
        const snapshots = await snapshotsCollection.find({}).sort({ timestamp: -1 }).toArray();
        const formattedSnapshots = snapshots.map(s => ({
            filename: s.filename,
            offScreenGaze: s.offScreenGaze
        }));
        res.json({ status: 'success', snapshots: formattedSnapshots });
    } catch (error) {
        console.error('Error retrieving snapshots from database:', error);
        res.status(500).json({ status: 'error', message: 'Failed to retrieve snapshots.' });
    }
};

exports.deleteSnapshot = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const filenameToDelete = req.params.filename;
        const snapshotsCollection = db.collection('snapshots');
        
        await snapshotsCollection.deleteOne({ filename: filenameToDelete });
        
        const filePath = path.join(__dirname, '..', 'snapshots', filenameToDelete);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${filePath}:`, err);
                return res.status(500).json({ status: 'error', message: 'Failed to delete snapshot file.' });
            }
            res.json({ status: 'success', message: `Snapshot '${filenameToDelete}' deleted successfully.` });
        });
    } catch (error) {
        console.error('Error deleting snapshot:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete snapshot.' });
    }
};

exports.clearSnapshots = async (req, res) => {
    try {
        const db = req.app.locals.db;
        const snapshotsCollection = db.collection('snapshots');
        await snapshotsCollection.deleteMany({});
        
        const snapshotsDir = path.join(__dirname, '..', 'snapshots');
        fs.readdir(snapshotsDir, (err, files) => {
            if (err) {
                return res.json({ status: 'success', message: `DB cleared. File cleanup failed.` });
            }
            files.forEach(file => fs.unlink(path.join(snapshotsDir, file), () => {}));
            res.json({ status: 'success', message: `Snapshots cleared.` });
        });
    } catch (error) {
        console.error('Error clearing snapshots:', error);
        res.status(500).json({ status: 'error', message: 'Failed to clear snapshots.' });
    }
};