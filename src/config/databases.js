const config = {
  development: {
    databases: {
      Resonate: {
        username: process.env.MYSQL_DB_USER,
        password: process.env.MYSQL_DB_PASS,
        database: process.env.MYSQL_DB_NAME,
        host: process.env.MYSQL_DB_HOST,
        dialect: 'mysql',
        logging: console.log,
        pool: {
          max: 100,
          min: 0,
          idle: 200000,
          acquire: 1000000
        },
        define: {
          charset: 'utf8',
          collate: 'utf8_general_ci',
          timestamps: false
        }
      }
    }
  },
  test: {
    databases: {
      Resonate: {
        username: process.env.MYSQL_DB_USER,
        password: process.env.MYSQL_DB_PASS,
        database: process.env.MYSQL_DB_NAME,
        host: process.env.MYSQL_DB_HOST,
        dialect: 'mysql',
        logging: false,
        define: {
          charset: 'utf8',
          collate: 'utf8_general_ci',
          timestamps: false
        }
      },
      OAuthServer: {
        username: process.env.OAUTH_SERVER_DB_USER,
        password: process.env.OAUTH_SERVER_DB_PASS,
        database: process.env.OAUTH_SERVER_DB_NAME,
        host: process.env.OAUTH_SERVER_DB_HOST,
        dialect: 'postgres'
      }
    }
  },
  production: {
    databases: {
      Resonate: {
        username: process.env.MYSQL_DB_USER,
        password: process.env.MYSQL_DB_PASS,
        database: process.env.MYSQL_DB_NAME,
        host: process.env.MYSQL_DB_HOST,
        dialect: 'mysql',
        logging: false,
        pool: {
          max: 100,
          min: 0,
          idle: 200000,
          acquire: 1000000
        },
        define: {
          charset: 'utf8',
          collate: 'utf8_general_ci',
          timestamps: false
        }
      },
      OAuthServer: {
        username: process.env.OAUTH_SERVER_DB_USER,
        password: process.env.OAUTH_SERVER_DB_PASS,
        database: process.env.OAUTH_SERVER_DB_NAME,
        host: process.env.OAUTH_SERVER_DB_HOST,
        dialect: 'postgres'
      }
    }
  }
}

export default config
