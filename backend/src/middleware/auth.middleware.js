const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            status: "error",
            message: "Access Denied. No Token Provided."
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            status: "error",
            message: "Invalid Token"
        });

    }

};

module.exports = authenticateUser;