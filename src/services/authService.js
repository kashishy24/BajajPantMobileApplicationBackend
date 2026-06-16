const authRepository = require("../repositories/authRepository");

const getUsers = async () => {
    return await authRepository.getUsers();
};

const login = async (username, password) => {

    if (!username || !password) {
        throw new Error("Username and Password are required");
    }

    const user = await authRepository.loginUser(
        username,
        password
    );

    if (!user) {
        throw new Error("Invalid Username or Password");
    }

    return user;
};

module.exports = {
    getUsers,
    login
};