function getRestaurantInfoFromServer(callback) {
    var successCallback = function (data) {
        callback(data.restaurant);
    };
    requestToServer(SERVICE_URL + '/restaurant.json', 'GET', null, successCallback);
}

function sendRegistrationToServer(user, callback) {
    var params = {
        user: {
            email: user.email,
            password: user.password,
            location_id: user.location_id,
            first_name: user.firstName,
            last_name: user.lastName,
            phone: user.phone,
            restaurant_location_id: user.location_id,
            notifications_attributes: user.notifications
        }
    };
    var successCallback = function (data) {
        user.userToken = data.user.token;
        user.role = data.user.role;
        user.coupons = data.user.coupons;
        callback(user);
    };
    requestToServer(SERVICE_URL + '/profile.json', 'POST', params, successCallback);
}

function LogInToServer(email, password, callback) {
    var params = {
        email: email,
        password: password
    };
    var successCallback = function (data) {
        var user = new User(data.user.token, data.user.role, data.user.email, password, data.user.restaurant_location_id, data.user.first_name, data.user.last_name, data.user.phone, data.user.notifications, data.user.coupons);
        callback(user);
    };
    requestToServer(SERVICE_URL + '/authentication.json', 'POST', params, successCallback);
}

function LogOutFromServer(userToken, callback) {
    var params = {
        user_token: userToken,
        _method: 'DELETE'
    };
    var successCallback = function (data) {
        callback();
    };
    requestToServer(SERVICE_URL + '/authentication.json', 'POST', params, successCallback);
}

function sendProfileToServer(userToken, newUser, callback) {
    var params = {
        user_token: userToken,
        user: {
            email: newUser.email,
            password: newUser.password,
            restaurant_location_id: newUser.location_id,
            first_name: newUser.firstName,
            last_name: newUser.lastName,
            phone: newUser.phone,
            notifications: newUser.notifications
        },
        _method: "PUT"
    };
    var successCallback = function (data) {
        var user = new User(userToken, data.role, data.email, newUser.password, data.restaurant_location_id, data.first_name, data.last_name, data.phone, data.notifications, getUser().coupons);
        setUser(user);
        callback(user);
    };
    requestToServer(SERVICE_URL + '/profile.json', 'POST', params, successCallback);
}

function retrieveMenuFromServer(parametrs, callback) {
    var successCallback = function (data) {
        if (data.menu.length > 0) {
            callback(data.menu);
        } else {
            callback(null);
        }
    };

    requestToServer(SERVICE_URL + '/menu.json', 'GET', parametrs, successCallback);
}

function retrieveNewOrderIDFromServer(userToken, orderName, restaurantLocationId, parentOrderId, callback) {
    var params;
    if (parentOrderId !== undefined && parentOrderId !== null) {
        params = {
            user_token: userToken,
            order: { name: escape(orderName), restaurant_location_id: restaurantLocationId },
            parent_order_id: parentOrderId
        };
    } else {
        params = {
            user_token: userToken,
            order: { name: escape(orderName), restaurant_location_id: restaurantLocationId }
        };
    }
    var successCallback = function (data) {
        var orderId = data.order.id;
        callback(orderId);
    };

    requestToServer(SERVICE_URL + '/orders.json', 'POST', params, successCallback);
}

function retrieveOrderFromServer(userToken, orderId, callback) {
    var params = {
        user_token: userToken
    };

    var successCallback = function (data) {
        callback(data.order);
    };

    requestToServer(SERVICE_URL + '/orders/' + orderId + '.json', 'GET', params, successCallback);
}

function retrieveListOfCustomerOrdersFromServer(userToken, callback) {
    var params = {
        user_token: userToken
    };

    var successCallback = function (data) {
        var orders = [];
        _.each(data.orders, function(item) {
            orders.push(new CustomerOrder(item));
        });
        callback(orders);
    };

    requestToServer(SERVICE_URL + '/orders.json', 'GET', params, successCallback);
}

function submitOrderToServer(userToken, orderId, callback) {
    var params = {
        user_token: userToken,
        _method: "PUT"
    };
    var successCallback = function (data) {
        callback();
    };

    requestToServer(SERVICE_URL + '/orders/' + orderId + '/submit' + '.json', 'POST', params, successCallback);
}

function updateOrderOnServer(properties, orderId, userToken, callback) {
    var params = {
        user_token: userToken,
        order: properties,
        _method: "PATCH"
    };

    var successCallback = function (data) {
        callback(data);
    };

    requestToServer(SERVICE_URL + '/orders/' + orderId + '.json', 'POST', params, successCallback);
}

function addItemToOrderOnServer(userToken, orderId, instructions, qyeryLineAdditions, orderItemId, quantity) {
    var params = {
        user_token: userToken,
        order_item: { order_id: orderId, menu_item_id: orderItemId, quantity: quantity, additions: qyeryLineAdditions, special_instructions: instructions }
    };

    var successCallback = function (data) {
        gotoViewOrderScreen(data.order);
    };

    requestToServer(SERVICE_URL + '/order_items.json', 'POST', params, successCallback);
}

function removeItemFromOrderFromServer(userToken, orderId, orderItemId, callback) {
    var params = {
        user_token: userToken,
        _method: "DELETE"
    };

    var successCallback = function (data) {
        callback(data.order);
    };

    requestToServer(SERVICE_URL + '/order_items/' + orderItemId + '.json', 'POST', params, successCallback);
}

function getOrderItem(userToken, orderItemId, callback) {
    var params = {
        user_token: userToken,
    };

    var successCallback = function(data) {
        callback(data.order_item);
    };

    requestToServer(SERVICE_URL + '/order_items/' + orderItemId + '.json', 'GET', params, successCallback);
}

function saveChangesOrderItem(userToken, orderItemId, quantity, additions, specialInstructions, callback) {
    var params = {
        user_token: userToken,
        order_item: {quantity: quantity, additions: additions, special_instructions: specialInstructions },
        _method: "PATCH"
    };

    var successCallback = function() {
        callback();
    };

    requestToServer(SERVICE_URL + '/order_items/' + orderItemId + '.json', 'POST', params, successCallback);
}

function getListOfCouponsFromServer(userToken, callback) {
    var params = {
        user_token: userToken
    };

    var successCallback = function(data) {
        callback(data.coupons);
    };
    requestToServer(SERVICE_URL + '/coupons.json', 'GET', params, successCallback);
}

function redeemCoupon(userToken, couponId, callback) {
    var params = {
        user_token: userToken,
        _method: "PATCH"
    };

    var successCallback = function () {
        callback();
    };

    requestToServer(SERVICE_URL + '/coupons/' + couponId + '.json', 'POST', params, successCallback);
}

function getUserCreditCard(userToken, callback) {
    var params = {
        user_token: userToken,
    };

    var successCallback = function (data) {
        var cards = [];
        if (data.credit_cards.length > 0) {
            _.map(data.credit_cards, function (card) {
                cards.push(new CreditCard(card));
            });

            callback(cards);
        } else {
            callback(cards);
            console.log("Error! No credit Cards for this User");
        }
    };

    requestToServer(SERVICE_URL + '/credit_cards.json', 'GET', params, successCallback);
}

function sendUserCreditCard(userToken, creditCard, callback) {
    var params = {
        application_token: APP_TOKEN,
        user_token: userToken,
        credit_card: {
            number: creditCard.creditCardNumber,
            security_code: creditCard.creditCardSecurityCode,
            expiration_month: creditCard.creditCardExpirationMonth,
            expiration_year: creditCard.creditCardExpirationYear,
            full_name: getUser().firstName + getUser().lastName
        }
    };

    var successCallback = function (data) {
        callback(new CreditCard(data));
    };

    requestToServer(SERVICE_URL + '/credit_cards.json', 'POST', params, successCallback);
}

function adminChangeStatus(id, newStatus, sourceApp) {
    var params = {
        application_token: APP_TOKEN,
        user_token: getUserToken(),
        order: { status: newStatus },
        ID: id,
        _method: "PATCH"
    };
    if(sourceApp != undefined) {
        params.source_app = sourceApp;
    }

    var successCallback = function () {
        gotoAdminOrderList();
    };

    requestToServer(SERVICE_URL + '/manager/orders/' + id + '.json', 'POST', params, successCallback);
}

function loadAdminViewOrder(id, sourceApp) {
    var params = {
        application_token: APP_TOKEN,
        user_token: getUserToken(),
        ID: id
    };
    if (sourceApp != undefined) {
        params.source_app = sourceApp;
    }
    
    var successCallback = function (data) {
        admin.buildOrderView(data);
    };

    return requestToServer(SERVICE_URL + '/manager/orders/' + id + '.json', 'GET', params, successCallback);
}

function loadAdminOrderList(itemsPerPage, offset, callback) {
    var params = {
        application_token: APP_TOKEN,
        user_token: getUserToken(),
        listomatic: { perPage: itemsPerPage, listOffset: offset },
        date_range: $('#admin-orders-period option:selected').val()
    };
    var status = $('#admin-orders-status option:selected').val();
    if (status != 'ALL_STATUSES') {
        params.status = status;
    }
    return requestToServer(SERVICE_URL + '/manager/orders.json', 'GET', params, callback);
}

function sendGiftCardToServer(restaurantLocationId, giftAmount, recepient, sender, callback) {
    var params = {
        application_token: APP_TOKEN,
        restaurant_location_id: restaurantLocationId,
        amount: giftAmount,
        recipient: recepient,
        credit_card: sender
    };

    var successCallback = function (data) {
        callback();
    };

    requestToServer(SERVICE_URL + '/gift_card.json', 'POST', params, successCallback);
}

var isNeedShowErrorMessage = false;

function coverBack() {
    navigator.app.exitApp();
}

var requestsLaunched = 0;

function requestToServer(url, method, params, successCallback) {
    return $.ajax({
        type: method,
        url: url,
        beforeSend: function () {
            requestsLaunched++;
            toggleVisibility("#loader", true);
        },
        complete: function () {
            requestsLaunched--;
            if (requestsLaunched === 0) {
                toggleVisibility("#loader", false);
            }
        },
        crossDomain: true,
        data: $.extend(params, { application_token: APP_TOKEN }),
        dataType: 'json'
    })
    .success(function (data) {
        console.log('Success!' + '. URL: ' + url + ' METHOD: ' + method);
        successCallback(data);
    })
   .fail(function (jqXhr) {
       if (jqXhr.status == 422 || jqXhr.status == 500) {
           var commonMessageText = "";
           var messages = JSON.parse(jqXhr.responseText).errors;
           _.each(messages, function (message) {
               commonMessageText += message + "<br/>";
           });
           showPopup(commonMessageText);
       } else if (jqXhr.status == 403) {
            alert(JSON.parse(jqXhr.responseText).errors);
            if (navigator.app) { 
                navigator.app.exitApp(); 
            }
       } else if (jqXhr.status == 401) {
           var commonMessageText = "";
           var messages = JSON.parse(jqXhr.responseText).errors;
           _.each(messages, function (message) {
               commonMessageText += message + "<br/>";
           });
           showPopup(commonMessageText);
           isNeedShowErrorMessage = true;
           $('#message-popup').on("popupafterclose", function () {
               if (isNeedShowErrorMessage) {
                   isNeedShowErrorMessage = false;
                   resetData();
               }
           });
        } else if (jqXhr.status == 404) {
            if (url === SERVICE_URL + "/restaurant.json") {
                requestToServer("https://myrestaurantmobile.azati.com/api/versions.json", "GET", { application_token: APP_TOKEN } , function(data) {
                    var currentVersion = _.find(data.api, function(item) {
                        return item.version == API_VERSION;
                    });
                    if (currentVersion) {
                        if (!currentVersion.active) {
                            document.addEventListener("backbutton", coverBack, false);
                            showVersionPopup(data.restaurant.name, 
                                         "Your version of the application is outdated, please update:",
                                         "All user data will be saved",
                                         data.restaurant.market_urls);
                        } else {
                            showPopup(SERVER_CONNECTION_FAILED_TEXT);
                        }
                    }
                });
            } else {
                showPopup(SERVER_CONNECTION_FAILED_TEXT);
            }
        } else {
            showPopup(SERVER_CONNECTION_FAILED_TEXT);
        }

       console.log("Error! LogInToServer: Status: " + jqXhr.statusText + ' - ' + jqXhr.status + '. URL: ' + url + ' METHOD: ' + method);
   });
}