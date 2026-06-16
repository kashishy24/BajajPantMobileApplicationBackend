const { sql } = require("../config/db");

const getUsers = async () => {
    const result = await new sql.Request().query(`
        SELECT UserName
        FROM Config_User
    `);

    return result.recordset;
};

const loginUser = async (username, password) => {
    const request = new sql.Request();

    request.input("UserName", sql.VarChar, username);
    request.input("Password", sql.VarChar, password);

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
        WHERE U.UserName = @UserName
        AND U.Password = @Password
    `);

    return result.recordset[0];
};

module.exports = {
    getUsers,
    loginUser
};