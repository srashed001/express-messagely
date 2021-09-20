/** User class for message.ly */
const bcrypt = require('bcrypt');
const db = require('../db');
const ExpressError = require("../expressError");
const {BCRYPT_WORK_FACTOR} = require('../config');




/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) {
    const hashedPwd = await bcrypt.hash(password, BCRYPT_WORK_FACTOR); 
    const result = await db.query(`
      INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at) 
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING username, password, first_name, last_name, phone `, 
      [username, hashedPwd, first_name, last_name, phone]);
      return result.rows[0];
   };

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) { 
    const result = db.query(`
      SELECT password
      FROM users
      WHERE username = $1`, [username]);

      const {password: hashedPwd} = results.rows[0];
      if (hashedPwd === undefined){
        throw new ExpressError("Username not found", 400)
      }
      return await bcrypt.compare(password, hashedPwd)
  };

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE username = $1
      RETURNING username`, [username]);
    if (result.rows[0] === undefined){
      throw new ExpressError("Username not found", 400)
    }
  };

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(`
      SELECT username, first_name, last_name, phone
      FROM users`)
      return result.rows;
   };

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(`
      SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users 
      WHERE username = $1`, [username])
      if (!result.rows[0]){
        throw new ExpressError('Username not found', 400)
      }
      return result.rows[0]
   };

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const results = await db.query(`
      SELECT m.id, m.to_username, u.first_name, u.last_name, u.phone, m.body, m.sent_at, m.read_at
      FROM messages AS m
      JOIN users AS u 
      ON m.to_username = u.username
      WHERE from_username = $1`, [username]);
   
      return results.rows.map(m=> {
        const {id, to_username, first_name, last_name, phone, body, sent_at, read_at} = m; 
        return {
          id,
          to_user: {
            username: to_username, 
            first_name, 
            last_name, 
            phone, 
          },
          body, 
          sent_at, 
          read_at
        }
      })
   };

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(`
      SELECT m.id, m.from_username, u.first_name, u.last_name, u.phone, m.body, m.sent_at, m.read_at
      FROM messages AS m
      JOIN users AS u 
      ON m.from_username = u.username
      WHERE to_username = $1`, [username]);
 
    return results.rows.map(m=> {
      const {id, from_username, first_name, last_name, phone, body, sent_at, read_at} = m; 
      return {
        id,
        from_user: {
          username: from_username, 
          first_name, 
          last_name, 
          phone, 
        },
        body, 
        sent_at, 
        read_at
      }
    })
   }
}


module.exports = User;