const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const testedToken = req.headers.authorization.replace("Bearer ", "");
      const actualUser = await User.findOne({ token: testedToken });
      if (actualUser) {
        req.actualUser = actualUser;
        return next();
      } else {
        return res.status(401).json({ error: "Unauthorized" });
      }
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.json({ msg: error.message });
  }
};

module.exports = isAuthenticated;
