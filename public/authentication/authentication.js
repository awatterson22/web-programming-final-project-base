$(document).ready(function () {
  // Login customer 
  $("#login").click(validateLogin);
  // Create an account for the customer 
  $("#signup").click(validateSignUp);
  // Hide alert if they are inputting a username/password
  $('.validate-input .input100').click(function () {
    $("#invalid-login").attr('hidden', true);
    $("#already-exists").attr('hidden', true);
    hideAlert(this);
  });
  // Logout customer
  $("#logout").click(logout);
});

$(document).keypress(function (event) {
  // If user hits space bar or enter key, it's the same as a login/signup button
  if (event.keyCode == 32 || event.keyCode == 13) {
    if ($('input[type="button"]')[0].id == "login") {
      validateLogin();
    }
    if ($('input[type="button"]')[0].id == "signup") {
      validateSignUp();
    }
  }
})

// Login the user from the login page
async function login() {
  let username = $("#username").val();
  let password = $("#password").val();

  if (username != "" && password != "") {
    $("#error").hide();

    const requestAuth = {
      username: username,
      password: password
    }
    // start the progress bar
    NProgress.start();
    
    // POST a request with the JSON-encoded username and password to /api/auth
    $.ajax({
      url: "/api/auth",
      type: "POST",
      data: JSON.stringify(requestAuth),
      contentType: "application/json"
    }).done(function (data) {
      // Reset the form after saving the login
      $("form").trigger("reset");
      // Add the token to local storage for later access in logout
      localStorage.setItem("token", data.token);
      // Add the customer id to local storage for access accross the website
      localStorage.setItem("customer_id", data.customer_id);
      // Open the home page in the same window
      open("../index.html", "_self");
    }).fail(function () {
      $("#invalid-login").removeAttr('hidden');
    });
    // finish the loading of the progress bar
    NProgress.done();
  }

}

// Create an account for the user in the DB
async function signup() {
  let username = $("#username").val();
  let password = $("#password").val();

  if (username != "" && password != "") {

    const requestAuth = {
      username: username,
      password: password
    }
    // start the progress bar
    NProgress.start();

    // POST a request with the JSON-encoded username and password to /api/auth/signup
    $.ajax({
      url: "/api/auth/signup",
      type: "POST",
      data: JSON.stringify(requestAuth),
      contentType: "application/json"
    }).done(function (data) {
      // Reset the form after saving the login
      $("form").trigger("reset");
      // Add the token to local storage for later access in logout
      localStorage.setItem("token", data.token);
      // Add the customer id to local storage for access accross the website
      localStorage.setItem("customer_id", data.customer_id);
      // Open the home page in the same window
      open("../index.html", "_self");
    }).fail(function () {
      $("#already-exists").removeAttr('hidden');
    });
    // finish the loading of the progress bar
    NProgress.done();
  }
}

// Logout the user from the website
async function logout() {
  const token = localStorage.getItem("token");
  $.ajax({
    url: "/api/status",
    type: "GET",
    headers: {"X-Auth": token}
  }).done(function (data) {
    // Clear the local token created on login amd the customer's id
    localStorage.clear();
    // Redirect back to home page
    location.href = "/";
  }).fail(function () {
    console.log("Error logging out");
  });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *          Functions adapted from https://colorlib.com/wp/template/login-form-v1/         *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
*/


function validateLogin() {
  var input = $('.validate-input .input100');

  var valid = true;

  // Confirm that user put in a username and password
  for(var i=0; i<input.length; i++) {
    if(input[i].value == ''){
      showAlert(input[i]);
      valid=false;
    }
  }

  if (valid) {
    login()
  }
}

function validateSignUp() {
  var input = $('.validate-input .input100');
  var valid = true;

  // Confirm that user put in a username and password
  for(var i=0; i<input.length; i++) {
    if(input[i].value == ''){
      showAlert(input[i]);
      valid=false;
    }
  }

  // Confirm that passwords are the same
  if ($('#confirm-password').val() !== $('#password').val()) {
    showAlert(input[2]);
    valid=false;
  }
    
  
  if (valid) {
    signup()
  }
}

function showAlert(input) {
    var thisAlert = $(input).parent();

    $(thisAlert).addClass('alert-validate');
}

function hideAlert(input) {
    var thisAlert = $(input).parent();

    $(thisAlert).removeClass('alert-validate');
}