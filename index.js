
const express = require('express');
const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const path = require('path');
const router = express.Router();
const PORT = process.env.PORT || 5000
const { Pool } = require('pg');
// environment variables
require('dotenv').config();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// secret used to encode/decode JWTs
const secret = "supersecret";
let customer = "";

express()
  .use(express.static(path.join(__dirname, 'public'), {
    index: false
  }))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use("/api", router)
  .get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/authentication/login.html'));
  })
  // ENDPOINT for user logout
  .get('/api/status', function (req, res) {
    if (!req.headers["x-auth"]) {
      res.sendStatus(401).json({ error: "Missing X-Auth header" });
    }
    // Get the user token generated at login
    const token = req.headers["x-auth"];
    try {
      // Decode the token to see it matches the customer
      const decoded = jwt.decode(token, secret);
      if (decoded.username === customer) {
        res.sendStatus(200);
      }
    } catch (exception) {
      console.trace(exception);
      res.sendStatus(500);
    }
  })
  // ENDPOINT for user authentication in login page
  .post("/api/auth", async function (req, res) {
    // Keep track of the customer for authentication at logout
    customer = req.body.username;
    const username = customer;
    const password = req.body.password;

    const payload = {
      username: username,
      password: password
    }
    // Create a token for the customer
    const token = jwt.encode(payload, secret);
    // Get an authentication object from the database
    try {
      authentication = await authenticate(username, password);
      // If the user is authorized, pass the client side the token and the customer id
      if (authentication.authorized) {
          res.json({ token: token, customer_id: authentication.ID });
        } else {
          // Unauthorized access
          res.sendStatus(401);
        }
    } catch (error) {
      console.trace(error);
      res.sendStatus(500);
    }
  })
  // ENDPOINT for user authentication in signup page
  .post("/api/auth/signup", async function (req, res) {
    // Keep track of the customer for authentication at logout
    customer = req.body.username;
    const username = customer;
    const password = req.body.password;

    const payload = {
      username: username,
      password: password
    }
    // Create a token for the customer
    const token = jwt.encode(payload, secret);
    // Get an authentication object from the database
    try {
      authentication = await addUser(username, password);
      // If the user is now authorized, pass the client side the token and the customer id
      if (authentication.authorized) {
          res.json({ token: token, customer_id: authentication.ID });
        } else {
          // Unauthorized access
          res.sendStatus(401);
        }
    } catch (error) {
      console.trace(error);
      res.sendStatus(500);
    }
  })
  // ENDPOINT for retrieving all of the user's orders from /api/orders to display on orders page
  .get('/api/orders/:customer_id', async function (req, res) {
    // Get the customer_id to query the DB with
    const customer_id = (req.params.customer_id) ? req.params.customer_id : "";
    // Create returning order information variable
    let orders = [];

    if (customer_id != "") {
      const c_id = parseInt(customer_id);

      let query_text = "SELECT * FROM order_table ";
          query_text += "WHERE c_id=" + c_id + " ";
          query_text += "ORDER BY confirm_num DESC;"

      try{
        const client = await pool.connect();
      
        //Insert the new order information
        const result = await client.query(query_text);

        if (result.rows.length > 0) {
          const results = result.rows;
          // Iterate through the DB result rows and get the order information
          results.forEach((r, index) => {
            const order = {
              customer_order: JSON.parse(r.customer_order),
              confirm_num: r.confirm_num,
              order_status: r.status
            }
            // Add the individual order to the customer's orders list
            orders.push(order);
          });
        }
        // Pass the client side the customer's orders
        res.json({customer_orders: orders});
        client.release();
      } catch (err) {
        console.trace(err);
        res.send("Error " + err);
      }
    }
  })
  // ENDPOINT for retrieving a user's order from /api/orders to display on confirmation page
  .get('/api/order/:confirm_num', async function (req, res) {
    // Get the confirm_num to query the DB with
    const order_num = (req.params.confirm_num) ? req.params.confirm_num : "";
    // Create returning order information variable
    let order;

    if (order_num != "") {
      const confirm_num = parseInt(order_num);

      let query_text = "SELECT * FROM order_table ";
          query_text += "WHERE confirm_num=" + confirm_num + ";";

      try{
        const client = await pool.connect();
      
        //Insert the new order information
        const result = await client.query(query_text);

        if (result.rows.length > 0) {
          const results = result.rows[0];
          // Get the order from the DB with a specific confirmation number
          order = {
            customer_order: JSON.parse(results.customer_order),
            confirm_num: results.confirm_num,
            order_status: results.status
          }
        }
        // Pass the client side that order
        res.json(order);
        client.release();
      } catch (err) {
        console.trace(err);
        res.send("Error " + err);
      }
    }

  })
  // ENDPOINT for posting a user's order from the menu page to /api/orders
  .post('/api/orders', async function (req, res) {
    const c_id = req.body.customer_id;
    const entrees = req.body.entrees;
    const sides = req.body.sides;
    const total = req.body.total;
    const restaurant = req.body.restaurant.replace("'", "")

    // Construct customer order for the DB
    const customer_order = JSON.stringify({
      entrees: entrees,
      sides: sides,
      total: total,
      restaurant: restaurant
    });

    if (validateMenu(entrees, sides, total)) {

      let query_text = "INSERT INTO order_table (c_id, customer_order, status) ";
          query_text += "VALUES (" + c_id + ",'" + customer_order + "', 'Received') RETURNING confirm_num;";

      try{
        const client = await pool.connect();
      
        //Insert the new order information
        const result = await client.query(query_text);
        if (result.rows.length > 0) {
          // Pass the client side the confirmation number for rendering the confirmation page
          res.json({ confirm_num: result.rows[0].confirm_num });
        }

        client.release();
      } catch (err) {
        console.trace(err);
        res.send("Error " + err);
      }
    }
  })
  // ENDPOINT for delete orders with a specific customer id from the DB
  .delete('/api/orders/:customer_id', async function (req, res) {
    // Get the customer_id to query the DB with
    const customer_id = (req.params.customer_id) ? req.params.customer_id : "";
    if (customer_id != "") {
      const c_id = parseInt(customer_id);

      // Clear the customer order history from the DB
      let query_text = "DELETE FROM order_table ";
          query_text += "WHERE c_id=" + c_id + ";";

      try{
        const client = await pool.connect();
      
        //Insert the new order information
        await client.query(query_text);

        res.sendStatus(200);
        client.release();
      } catch (err) {
        console.trace(err);
        res.send("Error " + err);
      }
    }
  })
  // ENDPOINT for getting the status of the order from confirmation page using api/order-status
  .get('/api/order-status', async function (req, res) {
      const confirm_num = req.query.confirm_num;
     
      // retrieve the order status from database, determined by confirm_num
      try {
        const client = await pool.connect();
        const results = await client.query('SELECT status FROM order_table WHERE confirm_num=' + confirm_num + ";");
        const status = (results.rows.length > 0) ? results.rows[0].status : null;

        // Pass the client side the current order status
        res.json({order_status: status});
        client.release();
      } catch (err) {
        console.trace(err);
        res.send("Error " + err);
      }
  })
  // ENDPOINT for posting the status of the customer's order to api/order-status
  .put('/api/order-status', async function (req, res) {
    try {
      const confirm_num = req.body.confirm_num;

      // GET THE CURRENT ORDER_STATUS
      const client = await pool.connect();
      const result = await client.query('SELECT status FROM order_table WHERE confirm_num=' + confirm_num + ";");
      
      const old_status = result.rows[0].status;

      // POSSIBLE ORDER STATUS LIST
      // 
      // 'Received' -> 'Cooking'
      // 'Cooking' -> 'Ready for Pick-Up'
      // 'Ready for Pick-Up' -> 'Picked Up'
      let new_status = "";
      if (old_status === 'Received')
        new_status = 'Cooking';
      else if (old_status === 'Cooking')
        new_status = 'Ready';
      else 
        new_status = 'Picked Up';

      // update the db with the new status
      const results = await client.query("UPDATE order_table SET status='" + new_status + "' WHERE confirm_num=" + confirm_num + "RETURNING status;");
      let status;
      if (results.rows.length > 0) {
        status = results.rows[0].status;
      }
      // Pass the client side the updated order status
      res.json({order_status: status}); 
      client.release();
    } catch (err) { 
        console.trace(err); res.send("Error " + err);
    }
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


/* * * * * * * * * * * * * * * * * * * * * *  
 *          SERVER-SIDE FUNCTIONS          *
 * * * * * * * * * * * * * * * * * * * * * *  
*/

// validate that the user is using correct login, and if they don't exist in DB, we create a new user
async function authenticate(username, password) {
  let query_text = "SELECT customer_id, password_hash " ;
      query_text += "FROM customer " ;
      query_text += "WHERE username='" + username + "';";
  try {
    const client = await pool.connect();
    const results = await client.query(query_text);
    // If the user is in the database
    if (results.rows.length > 0) {
      return { authorized: (bcrypt.compareSync(password, results.rows[0].password_hash)), ID: results.rows[0].customer_id };
    }
    client.release();
  } catch (err) {
    console.trace(err);
  } 
  // Otherwise, they aren't authorized with this username and password 
  return { authorized: false, ID: null };
}

// add a new user to the database
async function addUser(username, password) {
  // For an empty table
  let customer_id = 1;
  // Create hash for password
  const hash = bcrypt.hashSync(password, 10);
  // Check if user is in database already
  let exists_query = "SELECT customer_id, password_hash " ;
      exists_query += "FROM customer " ;
      exists_query += "WHERE username='" + username + "';";
  // Add new customer to database
  let insert_query = "INSERT INTO customer (username, password_hash) ";
      insert_query += "VALUES('" + username + "','" + hash + "') ";
      insert_query += "RETURNING customer_id;"
  try {
    const client = await pool.connect();
    existence = await client.query(exists_query);
    if (existence.rows.length > 0) {
      customer_id = null;
    } else {
      results = await client.query(insert_query);
      if (results.rows.length > 0) {
        customer_id = results.rows[0].customer_id;
      }
    }
    client.release();
  } catch (err) {
    console.trace(err);
  }
  return { authorized: customer_id != null, ID: customer_id };
}

// server side validation for the menu page submissions
function validateMenu(entrees, sides, price) {
  return (entrees.length != 0 || sides.length != 0 && price != "0.00");
}


/* * * * * * * * * * * * * * * * * * * * * *  
 *             DATABASE TABLES             *
 * * * * * * * * * * * * * * * * * * * * * * 

TABLE customer( 
    customer_id SERIAL PRIMARY KEY, 
    username TEXT NOT NULL, 
    password_hash TEXT NOT NULL
);

TABLE order_table( 
    c_id INT, 
    customer_order TEXT NOT NULL, 
    confirm_num SERIAL PRIMARY KEY, 
    status TEXT, 
    FOREIGN KEY (c_id) REFERENCES customer (customer_id)
);

*/