const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  // Check if the username already exists
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser !== undefined) {
    // User already exists
    response.status(400).send("User already exists");
  } else if (password.length < 5) {
    // Password is too short
    response.status(400).send("Password is too short");
  } else {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;

    try {
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.status(200).send("User created successfully");
    } catch (error) {
      // Handle database error
      console.log(`DB Error: ${error.message}`);
      response.status(500).send("Internal Server Error");
    }
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  // Check if the user exists
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    // User not found
    response.status(400).send("Invalid user");
  } else {
    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);

    if (isPasswordValid) {
      // Successful login
      response.status(200).send("Login success!");
    } else {
      // Invalid password
      response.status(400).send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  // Check if the user exists
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    // User not found
    response.status(400);
    response.send("User not registered");
  } else {
    // Compare the provided current password with the stored hashed password
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);

    if (isValidPassword === true) {
      const lengthOfNewPassword = newPassword.length;
      if (lengthOfNewPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
          UPDATE user
          SET password = '${hashedPassword}'
          WHERE username = '${username}'`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
