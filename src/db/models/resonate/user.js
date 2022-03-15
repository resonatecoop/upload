export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT(20).UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      field: 'ID'
    },
    login: {
      type: DataTypes.STRING(60),
      unique: true,
      field: 'user_login'
    },
    nicename: {
      type: DataTypes.STRING(50),
      field: 'user_nicename'
    },
    password: {
      type: DataTypes.STRING(255),
      field: 'user_pass',
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      field: 'user_email',
      unique: true,
      allowNull: false
    },
    registered: {
      type: DataTypes.TIME,
      field: 'user_registered'
    },
    display_name: {
      type: DataTypes.STRING(250),
      field: 'display_name'
    }
  }, {
    sequelize,
    timestamps: false,
    modelName: 'User',
    tableName: 'rsntr_users'
  })

  // User.associate = function (models) {
  //  User.hasMany(models.UserMeta, { as: 'meta', targetKey: 'id', foreignKey: 'userId' })
  // }

  return User
}
