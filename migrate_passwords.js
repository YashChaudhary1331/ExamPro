const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'exampro';
const saltRounds = 10;

async function migratePasswords() {
    let client;
    try {
        console.log('Connecting to the database...');
        client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        console.log('Fetching all users...');
        const users = await usersCollection.find({}).toArray();

        let migratedCount = 0;

        for (const user of users) {
            // A bcrypt hash will start with '$2a$', '$2b$', or '$2y$'. 
            // We check if the password field does NOT look like a hash.
            if (user.password && !user.password.startsWith('$2')) {
                console.log(`Found plain-text password for user: ${user.email}. Hashing now...`);
                
                // Hash the plain-text password
                const hashedPassword = await bcrypt.hash(user.password, saltRounds);
                
                // Update the user's document in the database
                await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: { password: hashedPassword } }
                );

                console.log(`Successfully migrated password for ${user.email}.`);
                migratedCount++;
            } else {
                console.log(`User ${user.email} already has a hashed password. Skipping.`);
            }
        }

        console.log('\n--- Migration Complete! ---');
        console.log(`Total users checked: ${users.length}`);
        console.log(`Passwords migrated: ${migratedCount}`);

    } catch (err) {
        console.error('\nAn error occurred during migration:', err);
    } finally {
        if (client) {
            await client.close();
            console.log('Database connection closed.');
        }
    }
}

// Run the migration function
migratePasswords();