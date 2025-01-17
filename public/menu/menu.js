$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip({
        title: "Please select at least one item from the menu",
        placement: "left"
    });
    $("svg").hide();
    // When something changes on the menu validate the order
    $("#menu").on("change", validateOrder);
    // When something changes on the menu update the total
    $("#menu").on("change", updateTotal);
    // Checkout the customer
    $('#checkout').click(checkout);
});

// Validate entrees and sides in the customer order
function validateOrder(){
    let totalItems = 0;
    let checkEntree = $('#entrees input[type="number"]');
    let checkSides = $('#sidesDrinks input[type="number"]');

    for(let i=0; i<checkEntree.length; i++){
        for(let j=0; j<checkSides.length; j++){
            totalItems += parseInt($(checkSides[j]).val()) || 0; 
        }
        totalItems += parseInt($(checkEntree[i]).val()) || 0;
    }

    if (totalItems > 0) {
        // Hide the warning if the customer has chosen an entree or side
        $("svg").hide();
        return true;
    }
    else {
        return false;
    }
}

// Update the total whenever something has changed on the menu
function updateTotal() {
    $("#total")[0].innerHTML = "<strong>Order Total: </strong>$" + getTotal();
}   

// Do the checkout for the user
function checkout() {
    // Create order
    if (validateOrder()) {
        const order = {
            customer_id: localStorage.getItem("customer_id"),
            entrees: getEntrees(),
            sides: getSides(),
            total: getTotal(),
            restaurant: document.title
        }
        // POST a request with the JSON-encoded order to /orders
        $.ajax({
            type: "POST",
            url: "/api/orders",
            data: JSON.stringify(order),
            contentType: "application/json",
        }).done(function (data) {
            // Reset the form after saving the order
            $("form").trigger("reset");
            localStorage.setItem("confirm_num", data.confirm_num);
            location.href = "/confirmation/confirmation.html";
        }).fail(function (jqXHR) {
            $("#error").html("The order could not be sent. Please try again");
        });
    } else {
        // Display the warning if the customer hasn't chosen anything
        $("svg").show();
    }

}

/* * * * * * * * * * * * * * * * * * * * * *  
 *     HELPER FUNCTIONS for checkout()     *
 * * * * * * * * * * * * * * * * * * * * * *  
 */

// Get the entrees for the order
function getEntrees() {
    let entrees = $('#entrees input[type="number"]');
    let entreesList = [];

    // Get entrees
    $.each(entrees, function (index, value) {

        if (parseInt($(value).val()) >= 1) {
            val = parseInt($(value).val())
            // Get the entree label
            entree = value.nextSibling.nextSibling.innerText;
            // Get the price of the individual entree
            price = value.nextSibling.nextSibling.nextSibling.nextSibling.innerText;
            // Push the the entree with its quantity and price to entreesList
            entreesList.push({
                name: entree,
                quantity: val,
                price: price
            });
        }
    });
    return entreesList;
}

// Get the sides for the order
function getSides() {
    let sides = $('#sidesDrinks input[type="number"]');
    let sidesList = [];

    // Get sides
    $.each(sides, function (index, value) {

        if (parseInt($(value).val()) >= 1) {
            val = parseInt($(value).val())
            // Get the side label
            side = value.nextSibling.nextSibling.innerText;
            // Get the price of the individual side
            price = value.nextSibling.nextSibling.nextSibling.nextSibling.innerText;
            // Push the the side with its quantity and price to sidesList
            sidesList.push({
                name: side,
                quantity: val,
                price: price
            });
        }
    });
    return sidesList;
}

// Get the total of the order
function getTotal() {
    let total = 0.0;
    let html = $('input[type="number"]');
    $.each(html, function (index, value) {
        if (parseInt($(value).val()) >= 1) {
            val = parseInt($(value).val());
            // Find the price of the order based on the span text after the label
            priceStr = value.nextSibling.nextSibling.nextSibling.nextSibling.innerText;
            // Calculate and add to the total
            total += (val * parseFloat(priceStr.substring(1)));
        }
    });
    return total.toFixed(2);
}