'use strict';

module.exports = {
  async up({ context: queryInterface }) {
    var Sequelize = queryInterface.sequelize.Sequelize;

    // Add status column
    await queryInterface.addColumn('accounts', 'status', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2, // 1=inactive, 2=active, 3=blocked
    });

    // Add index for faster filtering by status
    await queryInterface.addIndex('accounts', ['status'], {
      name: 'accounts_status_idx'
    });
  },

  async down({ context: queryInterface }) {
    await queryInterface.removeIndex('accounts', 'accounts_status_idx');
    await queryInterface.removeColumn('accounts', 'status');
  }
};
