const Router = require("express").Router;
const router = new Router();

const Message = require("../models/message");
const {SECRET_KEY, DB_URI} = require("../config");
const ExpressError = require("../expressError");
const {ensureLoggedIn, ensureCorrectUser} = require("../middleware/auth");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/

router.get("/:id", (req, res, next)=>{
    const message = await Message.get(req.params.id);
    if(req.user.username === message.from_user.username ||req.user.username === message.to_user.username ){
        return res.json({message})
    } else {
        throw new ExpressError("Unathorized", 401)
    }
});


/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/

router.post("/", ensureLoggedIn, (req, res, next)=> {
    const from_username = req.user.username; 
    const {to_username, body} = req.body; 
    const message = await Message.create({from_username, to_username, body});
    return res.json({message})
} )
/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/

router.post("/:id/read", (req, res, next)=>{
    const message = await Message.get(req.params.id);
    if(req.user.username === message.to_user.username){
        const result = await markRead(req.params.id);
        return res.json({message: result})
    }
} );

module.exports = router; 

