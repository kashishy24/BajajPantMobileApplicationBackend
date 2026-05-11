const express = require("express");
const sqlConnection = require("../databases/ssmsConn");
const middlewares = require("../middlewares/middlewares.js");

const router = express.Router();


//fetch the Role
// router.get("/role", (request, response) => {
//   new sqlConnection.sql.Request().query(
//     "SELECT [RoleName] FROM [Config_Role]",
//     (err, result) => {
//       if (err) {
//         middlewares.standardResponse(
//           response,
//           null,
//           300,
//           "Error executing query: " + err
//         );
//         console.error("Error executing query:", err);
//       } else {
//         middlewares.standardResponse(
//           response,
//           result.recordset,
//           200,
//           "success"
//         );
//         console.dir(result.recordset);
//       }
//     }
//   );
// });

//fetch the username
router.get("/users", (request, response) => {
  new sqlConnection.sql.Request().query(
    "SELECT [UserName] FROM [Config_User]",
    (err, result) => {
      if (err) {
        middlewares.standardResponse(
          response,
          null,
          300,
          "Error executing query: " + err
        );
        console.error("Error executing query:", err);
      } else {
        middlewares.standardResponse(
          response,
          result.recordset,
          200,
          "success"
        );
        console.dir(result.recordset);
      }
    }
  );
});



// router.post("", async (req, res) => {
//   const { roleName, username, password } = req.body;

//   if (!roleName || !username || !password) {
//     return middlewares.standardResponse(
//       res,
//       null,
//       300,
//       "Role, Username and Password are required"
//     );
//   }

//   try {
//     const request = new sqlConnection.sql.Request();

//     // 1️⃣ Check Role
//     request.input("RoleName", sqlConnection.sql.VarChar, roleName);

//     const roleResult = await request.query(`
//       SELECT RoleID 
//       FROM Config_Role 
//       WHERE RoleName = @RoleName
//     `);

//     if (roleResult.recordset.length === 0) {
//       return middlewares.standardResponse(
//         res,
//         null,
//         300,
//         "Invalid Role"
//       );
//     }

//     const roleId = roleResult.recordset[0].RoleID;

//     // 2️⃣ Check Username under Role
//     const userRequest = new sqlConnection.sql.Request();
//     userRequest.input("UserName", sqlConnection.sql.VarChar, username);
//     userRequest.input("RoleID", sqlConnection.sql.Int, roleId);

//     const userResult = await userRequest.query(`
//       SELECT UserID, Password
//       FROM Config_User
//       WHERE UserName = @UserName
//         AND DepartmentRoleID = @RoleID
//     `);

//     if (userResult.recordset.length === 0) {
//       return middlewares.standardResponse(
//         res,
//         null,
//         300,
//         "Invalid Username for selected Role"
//       );
//     }

//     const dbPassword = userResult.recordset[0].Password;

//     // 3️⃣ Check Password
//     if (dbPassword !== password) {
//       return middlewares.standardResponse(
//         res,
//         null,
//         300,
//         "Incorrect Password"
//       );
//     }

//     // ✅ SUCCESS
//     middlewares.standardResponse(res, null, 200, "Login success");

//   } catch (err) {
//     console.error(err);
//     middlewares.standardResponse(
//       res,
//       null,
//       300,
//       "Database error"
//     );
//   }
// });

router.post("", async (req, res) => {
  const { username, password } = req.body;

  // ✅ Validation
  if (!username || !password) {
    return middlewares.standardResponse(
      res,
      null,
      300,
      "Username and Password are required"
    );
  }

  try {
    const request = new sqlConnection.sql.Request();

    request.input("UserName", sqlConnection.sql.VarChar, username);
    request.input("Password", sqlConnection.sql.VarChar, password);

    // ✅ Login Query with Role & Department
    const result = await request.query(`
      SELECT 
          U.UserID,
          U.UserName,
          U.EmailID,
          U.MobileNo,
          U.DepartmentID,
          D.DepartmentName,
          U.DepartmentRoleID AS RoleID,
          R.RoleName
      FROM Config_User U
      INNER JOIN Config_Department D
          ON U.DepartmentID = D.DepartmentID
      INNER JOIN Config_Role R
          ON U.DepartmentRoleID = R.RoleID
      WHERE 
          U.UserName = @UserName
          AND U.Password = @Password
    `);

    // ✅ Invalid Login
    if (result.recordset.length === 0) {
      return middlewares.standardResponse(
        res,
        null,
        300,
        "Invalid Username or Password"
      );
    }

    // ✅ User Data
    const userData = result.recordset[0];

    // ✅ Success Response
    middlewares.standardResponse(
      res,
      userData,
      200,
      "Login Success"
    );

  } catch (err) {
    console.error("Login Error:", err);

    middlewares.standardResponse(
      res,
      null,
      300,
      "Database Error"
    );
  }
});
module.exports = router;
