var MeController = {
  // Get current account info
  getMe: async function(req, res, next) {
    try {
      res.json({
        id: req.account.id,
        name: req.account.name,
        created_at: req.account.created_at,
        updated_at: req.account.updated_at
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = MeController;
