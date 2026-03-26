import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "prescripto", // database का नाम
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    mongoose.connection.on('connected', () => console.log("Database Connected"));
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
};

export default connectDB;

// Do not use '@' symbol in your databse user's password else it will show an error.