var giftCardLocationID = null;
var signupLocationId;
var isNeedGotoWelcome = true;
var logInCallback;
var ordersTimer;

$('#welcome-page').on("pagebeforeshow", function (event) {
    var template = _.template($("#welcome-label-template").html());
    $("#welcome-label-container").html(template({ restaurant: getRestaurantInfo().name }));
});
$('#my-coupons-page').on("pagebeforeshow", function (event) {
    $(this).trigger("create");
    $(this).find(".ui-listview").listview("refresh");
});
$('#coupon-details-page').on("pagebeforeshow", function (event) {
    $(this).trigger("create");
    $(this).find(".ui-listview").listview("refresh");
});

// ------ COUPON CONTROLLER -----

var coupons = {
    redeemCoupon: function (couponId) {
        showPopup("Please confirm that you want to redeem this coupon now", "Cancel", "Redeem now", function() {
            redeemCoupon(getUserToken(), couponId, function() {
                coupons.gotoCouponsView();
            });
        });
    },
    
    redeemLocally: function (couponId) {
        var user = getUser();
        if (user.coupons.length > 0) {
            _.each(user.coupons, function (coupon, index) {
                if (coupon.id == couponId) {
                    user.coupons[index].status = "REDEEMED";
                    return;
                }
            });
        }
        setUser(user);
    },
    
    getCoupons: function (callback) {
        getListOfCouponsFromServer(getUserToken(), function(retrievedCoupons) {
            callback(retrievedCoupons);
        });
    },
    
    gotoCouponView: function (index) {
        coupons.getCoupons(function (coupons) {
            var coupon = _.find(coupons, function (selectedCoupon) {
                if (selectedCoupon.id == index) {
                    return selectedCoupon;
                }
            });
            var template = _.template($("#couponDetails").html());
            $("#coupon-details-page [data-role=content]").html(template(coupon));
            gotoScreen('#coupon-details-page');
        });
    },
    
    gotoCouponsView: function () {
        if (getUserToken() === null) {
            gotoLoginView(function () {
                coupons.gotoCouponsView();
            });
        } else {
            coupons.getCoupons(function (coupons) {
                var user = getUser();
                user.coupons = coupons;
                setUser(user);

                var availableCoupons = [];
                _.each(coupons, function(coupon) {
                    if ((coupon.restaurant_location_id == null) || (coupon.restaurant_location_id == user.location_id)) {
                        availableCoupons.push(coupon);
                    }
                });

                var locations = getRestaurantLocations();
                var availableLocation = [];

                _.each(locations, function(location) {
                    if (location.features.order.by_app) {
                        location.location_id = getUser().location_id;
                        availableLocation.push(location);
                    }
                });

                var template = _.template($("#coupons-template").html());
                $("#my-coupons-page [data-role=content]").html(template({ coupons: availableCoupons, locations: availableLocation }));
                gotoScreen("#my-coupons-page", false);
                $("#my-coupons-page > [data-role=content]").trigger("create");

            });
        }
    },

    changeLocation: function() {
        var currentId = getUser().location_id;
        var selectedLocationId = $("#coupons-locations-select").val();
        if (currentId != selectedLocationId) {
            var oldUser = getUser();
            oldUser.location_id = selectedLocationId;
            sendProfileToServer(getUserToken(), oldUser, function(user) {
                setUser(user);

                coupons.gotoCouponsView();
            });
        }
    }
};

// ------------ LOGIN CONTROLLER ---------------
function openRegisterPage() {
    var locations = getRestaurantLocations();
    var locationCount = _.filter(locations, function(item) {
        return (item.features.order.by_app);
    }).length;
    $(".js-select-name").html("Set Default Location <b>(" + locationCount + " available)</b>");

    var locationTemplate = _.template($("#location-select-template").html());
    $("#new-user-location").empty();
    _.each(locations, function(location) {
        location.location_id = null;
        $("#new-user-location").append(locationTemplate(location));
    });
    $("#new-user-location").trigger("change");
    gotoScreen("#register-page");
}

function RegistrationNewUser() {
    var notifications = [{ category: 'all', channel: 'email' }, { category: 'all', channel: 'push' }];
    if ($("#new-sms-rem").is(':checked')) notifications.push({ category: 'all', channel: 'sms' });

    var newUser = new User(null, null, $("#new-email").val(), $("#new-password1").val(), $("#new-user-location").val(), $("#new-first-name").val(), $("#new-last-name").val(), $("#new-phone").val(), notifications);

    sendRegistrationToServer(newUser, function(user) {
        setUser(user);
        $("#new-phone, #new-email, #new-first-name, #new-last-name, #new-password1, #new-password2").val("");
        $("#new-email-rem, #new-sms-rem, #new-push-rem").attr("checked", false).checkboxradio("refresh");

        setCurrentOrderID(null);
        if (!isNeedGotoWelcome) {
            isNeedGotoWelcome = true;
            sendOrderAutomatically = true;
            history.back();
        } else {
            gotoScreen('#welcome-page');
        }
    });
}

function updateDeliveryAddress() {
    var properties = {
        delivery_address: $("#delivery-address").val(),
        delivery_address_2: $("#delivery-suite").val(),
        delivery_city: $("#delivery-city").val()
    };
    updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function () {

    });
}

function validateDelivery() {
    var properties = { time_requested: $("#ready-time-select option:selected").val() };
    updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function() {
        if ($('#delivery-choise').is(':checked')) {
            $("#delivery-form").submit();
        } else {
            gotoScreen('#payment-method');
        }
    });
}

function gotoLoginView(callBack) {
    logInCallback = callBack;
    gotoScreen("#login-dialog", null, "none");
}

function LogIn() {
    var loginemail = $("#login-email").val();
    var loginpassword = $("#login-password").val();
    $("#login-email, #login-password").val("");

    LogInToServer(loginemail, loginpassword, function(user) {
        setUser(user);
        $('#login-dialog').dialog('close');
        $('#login-dialog').on('pagehide', function(event) {
            if (logInCallback !== undefined) {
                logInCallback();
                logInCallback = undefined;
            }
        });
    });
}

function RefreshUserArea() {
    setTimeout(function () {
        if (getUserToken() === null) {
            $("#btn-login, #btn-signup").show();
            $("#label-login").empty();
            $("#btn-logout, #btn-admin").hide();
        } else {
            $("#btn-login, #btn-signup, #btn-admin").hide();
            $("#label-login").html(getUser().email);
            $("#btn-logout").show();
            if (getUser().role === 'manager') {
                $("#btn-admin").css('display', 'block');
            }
        }
    }, 300);
}

function LogOut() {
    LogOutFromServer(getUserToken(), function () {
        resetData();
    });
}

function resetData() {
    setCurrentOrderID(null);
    var catItems = getObjectFromLocalStorage(MENU_KEY);
    if (catItems !== null && catItems.object !== null) {
        _.each(catItems.object, function (item) {
            setObjectToLocalStorage(null, item.name);
        });
    }
    
    _.each(localStorage, function (item) {
        localStorage.removeItem(item);
    });
    
    setObjectToLocalStorage(null, MENU_KEY);
    setUser(null);

    RefreshUserArea();
    gotoScreen("#home-page");
}

// -------------- MY ACCOUNT CONTROLLER ------------------
function attemptAccountView() {
    if (getUserToken() !== null) {
        var user = getUser();
        var locations = getRestaurantLocations();
        var account = {
            user: user,
            notifyEmail: checkNotificationExist(user.notifications, 'email'),
            notifySms: checkNotificationExist(user.notifications, 'sms'),
            notifyPush: checkNotificationExist(user.notifications, 'push')
        };

        var template = _.template($("#edit-account-template").html());
        $("#edit-account-page [data-role=content]").html(template(account));

        var locationCount = _.filter(locations, function(item) {
            return item.features.order.by_app;
        }).length;
        $(".js-select-name").html("Set Default Location <b>(" + locationCount + " available)</b>");

        var locationTemplate = _.template($("#location-select-template").html());
        $("#user-location").empty();
        _.each(locations, function(location) {
            location.location_id = account.user.location_id;
            $("#user-location").append(locationTemplate(location));
        });
        $("#user-location").trigger("change");

        $("#edit-account-page").trigger("create");

        //validate moved here because now it is not working when it inside app.js
        $("#edit-account-form").validate({
            submitHandler: function() {
                updateAccount();
            }
        });
        gotoScreen("#edit-account-page");
    } else {
        gotoLoginView(function() {
            attemptAccountView();
        });
    }
}

function updateAccount() {
    var notifications = [{ category: 'all', channel: 'email' }, { category: 'all', channel: 'push' }];
    if ($("#sms-rem").is(':checked')) notifications.push({ category: 'all', channel: 'sms' });

    var newUser = new User(getUser().userToken, getUser().role, $("#email").val(), $("#password1").val(), $("#user-location").val(), $("#first-name").val(), $("#last-name").val(), $("#phone").val(), notifications);
    sendProfileToServer(getUserToken(), newUser, function (user) {
        gotoScreen("#home-page");
    });
}

// ---------------- PHOTO CONTROLLER -----------------
$('#photo-wall-page').on("pageshow", function () {
    buildSlider("photos-slider", true, getRestaurantInfo().photos);
});

$('#thanks-page').on("pageshow", function () {
    var info = getRestaurantInfo();
    
    if (info.animation.length > 0) {
        toggleVisibility("#thank-you-animation", true);
        buildSlider("thank-you-animation", false, info.animation);
    } else {
        toggleVisibility("#thank-you-animation", false);
    }

    setTimeout(function () {
        var pageId = getCurrentPageId();
        if (pageId == "thanks-page") {
            gotoScreen("#home-page");
        }
    }, HOME_REDIRECT_TIME);
});

function buildAnimation(containerId, photos) {
    if ($("#" + containerId + " > img").length < 2) {
        if (photos.length < 2) {
            $("#photo-gallery-home").removeClass("tcycle");
        } else {
            $("#photo-gallery-home").addClass("tcycle");
        }
        var template = _.template($("#animation-template").html());
        $("#" + containerId).append(template({ photos: photos }));
        $('.tcycle').tcycle();
    }
}

function buildSlider(containerId, handled, photos) {
    if ($("#" + containerId + " > .slider > div").length < 2) {

        var template = _.template($("#photos-template").html());
        $("#" + containerId + " > .slider").append(template({ photos: photos }));
        
        var optionsHandled = {
            $DragOrientation: 3,
            $Steps: 1,
            $DirectionNavigatorOptions: {
                $Class: $JssorDirectionNavigator$,
                $ChanceToShow: 2,
            }
        };
        var optionsAutoplay = {
            $DragOrientation: 0,
            $AutoPlay: true,
            $AutoPlayInterval: 2000,
            $SlideshowOptions: {
                $Class: $JssorSlideshowRunner$,
                $Transitions: [{ $Duration: 700, $Opacity: 2, $Brother: { $Duration: 1000, $Opacity: 2 } }],
                $TransitionsOrder: 1
            }
        };
        var jssor = new $JssorSlider$(containerId, handled ? optionsHandled : optionsAutoplay);

        var parentWidth = jssor.$Elmt.parentNode.clientWidth;
        if (parentWidth) {
            jssor.$SetScaleWidth(parentWidth);
            $('.arrow-left, .arrow-right').css("display", "block");
        } else {
            window.setTimeout(ScaleSlider, 30);
        }
    }
}

function updateUserLocation(selectId, callback) {
    var currentId = getUser().location_id;
    var selectedLocationId = $(selectId).val();
    if (currentId != selectedLocationId) {
        var oldUser = getUser();
        oldUser.location_id = selectedLocationId;
        sendProfileToServer(getUserToken(), oldUser, function(user) {
            setUser(user);
            if (callback != null) {
                callback(selectedLocationId);
            }
        });
    }
}

function updateOrderLocation() {
    updateUserLocation("#submit-order-location", function(selectedLocationId) {
        checkDeliveryTypes();
        var deliveryElement = $("#delivery-choise");
        var pickUpElement = $("#pickup-choise");
        var orderAcceptance;

        if (pickUpElement.length > 0) {
            orderAcceptance = pickUpElement.val();
        } else {
            orderAcceptance = deliveryElement.val();
        }
        
        var properties = {
            restaurant_location_id: selectedLocationId,
            order_acceptance: orderAcceptance
        };

        updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function() {
            if (pickUpElement.length > 0) {
                pickUpElement.prop("checked", "checked").checkboxradio("refresh");
                deliveryElement.removeProp("checked").checkboxradio("refresh");
                $('#delivery-form').hide();
            } else {
                deliveryElement.prop("checked", "checked").checkboxradio("refresh");
                $('#delivery-form').show();
            }
            submitOrder();
        });
    });
}

function checkDeliveryTypes() {
    var currentLocation = getLocationById(getRestaurantLocations(), getUser().location_id);
    
    var deliveryTypeTemplate = _.template($("#delivery-type-template").html());

    $("#types-container").html(deliveryTypeTemplate(
        {
            isPickUpAccepted: currentLocation.features.delivery.by_pickup,
            isDeliveryAccepted: currentLocation.features.delivery.by_delivery
        })).trigger("create");
}

function chooseDeliveryOptions() {
    checkDeliveryTypes();
    var pickUpElement = $("#pickup-choise");
    var deliveryElement = $("#delivery-choise");

    if (pickUpElement.length > 0) {
        pickUpElement.prop('checked', 'checked');
        $('#delivery-form').hide();
    } else {
        deliveryElement.prop('checked', 'checked');
        $('#delivery-form').show();
    }


    updateAcceptOrder();
}

function updateAcceptOrder() {
    var deliveryType = $("#delivery-type :radio:checked").val();
    if (deliveryType == undefined) {
        var pickUpElement = $("#pickup-choise");
        var deliveryElement = $("#delivery-choise");

        if (pickUpElement.length > 0) {
            deliveryType = pickUpElement.val();
        } else {
            deliveryType = deliveryElement.val();
        }
    }
    var properties = {
        order_acceptance: deliveryType
    };
    updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function() {
        submitOrder();
    });
}

function switchFromDelivery() {
    $('#delivery-form').hide();
    updateAcceptOrder();
}

var deliveryChoices = [];

$('input[name$="delivery-type-choice"]').change(function() {
    deliveryChoices.push($(this).val());
});

$('#order-delivery-page').on("pagebeforeshow", function(event) {
    $(this).trigger("create");
    $(this).find(".ui-listview").listview("refresh");
    deliveryChoices = [];
});

function switchToDelivery() {
    retrieveOrderFromServer(getUserToken(), getCurrentOrderID(), function(order) {
        var locations = getRestaurantLocations();
        var userLocationId = getUser().location_id;
        var selectedLocation = _.find(locations, function(location) {
            return location.id == userLocationId;
        });

        if (selectedLocation.delivery.minimum_order_amount != null && parseFloat(order.total_cost) < parseFloat(selectedLocation.delivery.minimum_order_amount)) {
            var previousCheck = deliveryChoices[deliveryChoices.length - 2];
            deliveryChoices.pop();
            if (previousCheck == undefined) {
                previousCheck = $("#pickup-choise").val();
            }
            if (previousCheck == $("#pickup-choise").val()) {
                //$("#delivery-choise").removeProp("checked").checkboxradio("refresh");
                $("#delivery-choise").removeAttr("checked").checkboxradio("refresh");
                $('#pickup-choise').prop("checked", "checked").checkboxradio("refresh");
            } /*else if (previousCheck == $("#eating-choice").val()) {
                $("#delivery-choise").removeProp("checked").checkboxradio("refresh");
                $('#eating-choice').prop("checked", "checked").checkboxradio("refresh");
            }*/
            showPopup(MINIMUM_DELIVERY_AMOUNT_MESSAGE + selectedLocation.delivery.minimum_order_amount + "$");
        } else {
            $('#delivery-form').show();
            var properties = {
                order_acceptance: $("#delivery-type :radio:checked").val()
            };
            updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function() {
                buildDeliveryPrices(selectedLocation.delivery.description);
            });
        }
    });
}

function startNewOrder(locationId, callback, parentOrderId) {
    retrieveNewOrderIDFromServer(getUserToken(), generateNewOrderName(), locationId, parentOrderId, function (orderId) {
        this.OrderID = orderId;
        setCurrentOrderID(orderId); // save current order to local storage
        if (callback !== undefined && callback !== null) {
            callback();
        }
    });
}
function gotoLocationView(locationId, goFromPhones) {
    var location = _.find(getRestaurantLocations(), function(item) {
        return (item.id === locationId);
    });

    location.default_location = (getUser() !== null) ? getUser().location_id : null;
    
    var headerTemplate = _.template($("#location-page-suheader-template").html());
    $("#location-view-subheader").html(headerTemplate({ goFromPhones: goFromPhones }));

    var locationTemplate = _.template($("#location-template").html());
    
    $("#location-page [data-role=content]").html(locationTemplate(location));
    gotoScreen("#location-page");
    $('#location-page').trigger("create");
    $('#location-page').find(".ui-listview").listview("refresh");
}

function setDefaultLocation(locationId) {
    if (getUser() === null) {
        signupLocationId = locationId;
        gotoLoginView(function () {
            setDefaultLocation(locationId);
        });
    } else {
        if (getUser().location_id != locationId) {
            var oldUser = getUser();
            oldUser.location_id = locationId;
            sendProfileToServer(getUserToken(), oldUser, function(user) {
                gotoRestaurantLocationsView();
            });
        } else {
            gotoLocationView(locationId);
        }
    }
}

$('#locations-page').on("pagebeforeshow", function () {
    $(this).trigger("create");
    $(this).find(".ui-listview").listview("refresh");
});

var directionsDisplay,
            directionsService;

$('#location-page').on("pageshow", function () {
    locationsGeolocation.init();
});

var locationsGeolocation = {
    init: function() {
        try {
            directionsDisplay = new google.maps.DirectionsRenderer();
            directionsService = new google.maps.DirectionsService();

            var position = new google.maps.LatLng(parseFloat($("#latitude").val()), parseFloat($("#longitude").val()));

            var map = new google.maps.Map(document.getElementById('map_canvas'), {
                zoom: 15,
                center: position,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });

            directionsDisplay.setMap(map);

            var positionMarker = new google.maps.Marker({
                position: position,
                map: map,
                title: "Direction"
            });

            var infowindow = new google.maps.InfoWindow();
            google.maps.event.addListener(positionMarker, 'click', function () {
                infowindow.setContent("Latitude: " + $("#latitude").val() + " Longitude: " + $("#longitude").val());
                infowindow.open(map, positionMarker);
            });
        } catch (e) {
            console.log("Map Error: " + e.message);
        }
    },
    buildDirection: function () {
        navigator.geolocation.getCurrentPosition(locationsGeolocation.directionFound, locationsGeolocation.directionFoundError);
    },
    directionFound: function (position) {        
        var request = {
            origin: new google.maps.LatLng(position.coords.latitude, position.coords.longitude),
            destination: new google.maps.LatLng(parseFloat($("#latitude").val()), parseFloat($("#longitude").val())),
            travelMode: google.maps.DirectionsTravelMode["DRIVING"]
        };

        directionsService.route(request, function (response, status) {
            if (status == google.maps.DirectionsStatus.OK) {
                directionsDisplay.setDirections(response);
            } else {
                showPopup(DIRECTION_ROUTE_BUILDING_ERRORE);
            }
        });
    },
    directionFoundError: function (error) {
        if (error.code == 1) {
            showPopup(DIRECTION_DETECTING_CODE_ONE);
        } else if (error.code == 2) {
            showPopup(DIRECTION_DETECTING_CODE_TWO);
        } else {
            showPopup(DIRECTION_DETECTING_CODE_THREE);
        }
    }
};

function gotoRestaurantLocationsView(isCall, isCallToOrder, isRevert, isReservations) {
    var locations = getRestaurantLocations();
    $("#locations-page [data-role=content] ul li:not(.js-static)").remove();
    $("#locations-page [data-role=content] ul").hide();
    if (isCall != undefined && isCall) {
        displayPhoneLocations(locations);
    } else if (isCallToOrder != undefined && isCallToOrder) {
        displayOrderPhoneLocations(locations);
    } else if(isReservations!=undefined&& isReservations) {
        displayReservationPhoneLocations(locations);
    } else {
        displayAllLocations(locations, isRevert);
    }
}

function displayReservationPhoneLocations(locations) {
    var template = _.template($("#location-view-item").html());
    var orderPhoneLocations = _.filter(locations, function(item) {
        return (item.features.reservation.by_phone && item.info.phone && item.info.phone != "");
    });

    var defaultLocation = (getUser() !== null) ? getUser().location_id : null;
    _.map(orderPhoneLocations, function(item) {
        $("#nonavailable-location-list").append($(template({ location: item, default_location: defaultLocation, goFromPhones: true })));
    });
    $("#nonavailable-location-list").show();
    gotoScreen("#locations-page");
}

function displayOrderPhoneLocations(locations) {
    var template = _.template($("#location-view-item").html());
    var orderPhoneLocations = _.filter(locations, function(item) {
        return (item.info.orders_phone != undefined && item.info.orders_phone != "");
    });
    
     var defaultLocation = (getUser() !== null) ? getUser().location_id : null;
     _.map(orderPhoneLocations, function(item) {
        $("#order-by-phone-location-list").append($(template({ location: item, default_location: defaultLocation, goFromPhones: true })));
     });
    $("#order-by-phone-location-list").show();
    gotoScreen("#locations-page");
}

function displayPhoneLocations(locations) {
    var template = _.template($("#location-view-item").html());
    var orderPhoneLocations = _.filter(locations, function(item) {
        return (item.info.phone != undefined && item.info.phone != "");
    });

    var defaultLocation = (getUser() !== null) ? getUser().location_id : null;
    _.map(orderPhoneLocations, function(item) {
        $("#nonavailable-location-list").append($(template({ location: item, default_location: defaultLocation, goFromPhones: true })));
    });
    $("#nonavailable-location-list").show();
    gotoScreen("#locations-page");
}

function displayAllLocations(locations, isRevert) {
    var template = _.template($("#location-view-item").html());
    var selectedLocations = _.filter(locations, function(item) {
        if (getUser() !== null) {
            return item.id == getUser().location_id;
        }
        return false;
    });
    if (selectedLocations.length > 0) {
        _.map(selectedLocations, function (item) {
            var defaultLocation = (getUser() !== null) ? getUser().location_id : null;
            $("#selected-location-list").append($(template({ location: item, default_location: defaultLocation, goFromPhones: false })));
        });
        $("#selected-location-list").show();
    } else {
        $("#selected-location-list").hide();
    }
    
    var availableLocations = _.filter(locations, function(item) {
        if (getUser() !== null) { 
            if (item.id == getUser().location_id) {
                return false;
            }
        }
        return item.features.order.by_app;
    });
    if (availableLocations.length > 0) {
        _.map(availableLocations, function(item) {
            $("#available-location-list").append($(template({ location: item, default_location: null, goFromPhones: false })));
        });
        $("#available-location-list").show();
    } else {
        $("#available-location-list").hide();
    }

    var nonavailableLocations = _.filter(locations, function(item) {
        return !item.features.order.by_app;
    });
    if (nonavailableLocations.length > 0) {
        _.map(nonavailableLocations, function (item) {
            $("#nonavailable-location-list").append($(template({ location: item, default_location: null, goFromPhones: false })));
        });
        $("#nonavailable-location-list").show();
    } else {
        $("#nonavailable-location-list").hide();
    }

    gotoScreen("#locations-page", isRevert);
}

function gotoGiftCardView(locationId) {
    gotoScreen('#gift-card-page');
    giftCardLocationID = locationId;
}

// ----------------- SHARE CONTROLLER ---------------------
$('#ShareView').on("pagebeforeshow", function () {
    $("#contacts-list").trigger("create");
    $("#contacts-list").listview("refresh");
});

function sendEmail() {
    var emailBody = "I wanted to let you know that " + getRestaurantInfo().name + " now has their own real mobile app that they created to better serve their customers, and of course its FREE.%0A" +
        "I'm using it and it's pretty cool. It lets you get their daily specials, coupons and place takeout orders right from the app.%0A" +
        "It even remembers your orders to make it even easier for you to order next time.%0A" +
        "As a special thanks for downloading the app, " + getRestaurantInfo().name + " gives you great coupons and offers.%0A" +
        "So take a minute to install the app. Just click on one of the below links to install%0A%0A";

    _.each(getRestaurantInfo().market_urls, function (item) {
        emailBody += item.name + " Install Link:%0A" + item.url + "%0A%0A";
    });
    document.location.href = "mailto:?subject=" + getRestaurantInfo().name + "&body=" + emailBody + "";
}

var admin = {
    sortConditionChanged: function() {
        if ($("#current-page")) {
            $("#current-page").html(1);
        }
        admin.refreshOrderList();
    },

    buildOrderView: function(orderData) {
        var template = _.template($("#admin-view-order-template").html());
        $("#admin-view-order-page > [data-role=content]").html(template(orderData)).trigger("create");
        updateCurrency();
        gotoScreen("#admin-view-order-page");
    },
    
    refreshOrderList: function() {
        ordersTimer.stop();
        var currentOfset = $("#current-page").html();
        if (currentOfset == undefined || currentOfset == "") {
            currentOfset = 0;
        } else {
            currentOfset--;
        }
        loadAdminOrderList(ITEMS_PER_PAGE, currentOfset * ITEMS_PER_PAGE, function(data) {
            admin.buildAdminOrderList(data);
        });
    },
    
    normaliseStatus: function(serverStatus) {
        switch (serverStatus) {
        case "SUBMITTED":
            return "Submitted";
        case "BEING_PREPARED":
            return "Being Prepared";
        case "CANCELED_BY_RESTAURANT":
            return "Rejected";
        case "READY":
            return "Ready";
        }
    },

    normalisePaymentType: function(paymentType) {
        switch (paymentType) {
            case "CREDIT_CARD":
                return "Credit Card Paid";
            case "CASH":
                return "Cash at the Restaurant or Delivery";
        }
    },
    
    buildAdminOrderList: function (data) {
        var currentOfset = $("#current-page").html();
        if (currentOfset == undefined || currentOfset == "") {
            currentOfset = 1;
        } else {
            currentOfset = parseFloat(currentOfset);
        }
        
        var totalPages = Math.ceil(data.orders_total / ITEMS_PER_PAGE);

        var selectedPeriod = $('#admin-orders-period option:selected').val();
        var selectedStatus = $('#admin-orders-status option:selected').val();

        var viewData = {
            orders: data.orders,
            current_page: currentOfset,
            total_pages: totalPages,
            selectedPeriod: selectedPeriod,
            selectedStatus: selectedStatus
        };

        var template = _.template($("#admin-order-list-template").html());
        $("#admin-list-orders-page [data-role=content]").html(template(viewData)).trigger("create");
        updateCurrency();
        ordersTimer.play();
    },
    
    nextPage: function() {
        ordersTimer.stop();
        var currentOfset = parseFloat($("#current-page").html());

        loadAdminOrderList(ITEMS_PER_PAGE, currentOfset * ITEMS_PER_PAGE, function(data) {
            $("#current-page").html(currentOfset + 1);
            admin.buildAdminOrderList(data);
            $.mobile.silentScroll(0);
        });
    },
    
    previousPage: function() {
        ordersTimer.stop();
        var currentOfset = parseFloat($("#current-page").html());
        currentOfset = currentOfset - 2;

        loadAdminOrderList(ITEMS_PER_PAGE, currentOfset * ITEMS_PER_PAGE, function(data) {
            $("#current-page").html(currentOfset + 1);
            admin.buildAdminOrderList(data);
            $.mobile.silentScroll(0);
        });
    }
};

function gotoAdminOrderList(isReverse) {
    if (isReverse != undefined) {
        gotoScreen("#admin-list-orders-page", isReverse);
    } else {
        gotoScreen("#admin-list-orders-page");
    }
}

$('#admin-list-orders-page').on("pageshow", function (event) {
    if (ordersTimer === undefined) {
        ordersTimer = $.timer(function () {
            admin.refreshOrderList();
        });
    }
    ordersTimer.set({ time: 30000, autostart: false });
    ordersTimer.play();
    admin.refreshOrderList();
});
$('#admin-list-orders-page').on("pagehide", function (event) {
    ordersTimer.stop();
});

$('#admin-view-order-page').on("pagebeforeshow", function (event) {
    $(this).trigger("create");
});

function sendGiftCard() {
    var recepient = new GiftCardRecepient($("#rec-first-name").val(), $("#rec-last-name").val(), $("#rec-address").val(), $("#rec-city").val(), $("#rec-state").val(), $("#rec-zip").val(), $("#rec-reason").val());
    var sender = new GiftCardSender($("#send-first-name").val(), $("#send-last-name").val(), $("#send-card-number").val(), $("#gift-card-page #credit-card-expiration-month").val(), $("#gift-card-page #credit-card-expiration-year").val());

    sendGiftCardToServer($("#user-location-select").val(), $("#gift-amount option:selected").val(), recepient, sender, function () {
        showPopup("Gift Card Sended");
        gotoScreen('#home-page');
    });
}

/** Menu functions */
var menuCategories = {

    /* gets all categories from local storage or from server */
    get: function (successCallback, menuType) {
        if (menuType === undefined || menuType === null) {
            menuType = this.getCurrentMenuType();
        } else {
            this.setCurrentMenuType(menuType);
        }
        var items = getObjectFromLocalStorage(menuType);
        if (items === null) {
            var params = {
                name: menuType
            };
            retrieveMenuFromServer(params, function (categories) {
                menuCategories.set(categories);
                successCallback(categories);
            });
        } else {
            successCallback(items.object);
        }
    },

    /* save categories into local storage */
    set: function (categories) {
        setObjectToLocalStorage(new CacheObject(categories), this.getCurrentMenuType());
    },

    /* gets category by id, or null if no such category */
    getCategoryById: function (id, successCallback) {
        this.get(function (categories) {
            var categoryToReturn = null;
            if (categories !== null) {
                _.find(categories, function (category) {
                    categoryToReturn = menuCategories.processCategory(id, category);
                    if(categoryToReturn !== null) {
                        return true;
                    }
                });
            }
            successCallback(categoryToReturn);
        });
    },
    
    processCategory: function (categoryId, category) {
        if (categoryId == category.category_id) {
            return category;
        }
        var categoryToReturn = null;
        if (category.subcategories !== undefined && category.subcategories.length > 0) {
            _.find(category.subcategories, function (subCategory) {
                categoryToReturn = menuCategories.processCategory(categoryId, subCategory);
                if (categoryToReturn !== null) {
                    return true;
                }
            });
        }
        return categoryToReturn;
    },

    /* gets menu item by id, and category */
    getCategoryAndItem: function(itemId, successCallback, categoryId) {
        var self = this;
        if (categoryId != undefined && categoryId != null) {
            this.getCategoryById(categoryId, function(category) {
                var itemToReturn = null;
                _.find(category.menuItems, function(menuItem) {
                    if (menuItem.id == itemId) {
                        itemToReturn = menuItem;
                        return;
                    }
                });
                successCallback(itemToReturn, category);
            });
        } else {
            this.get(function(categories) {
                _.find(categories, function(category) {
                    return self.findItemById(category, itemId, successCallback);
                });
            });
        }
    },

    findItemById: function(category, itemId, callback) {
        var self = this;
        var menuItem = _.find(category.menu_items, function(item) {
            return item.id == itemId;
        });
        if (menuItem != undefined) {
            callback(menuItem, category);
            return true;
        } else {
            var result = _.find(category.subcategories, function(subcategory) {
                return self.findItemById(subcategory, itemId, callback);
            });
            if (result != undefined) {
                return true;
            } else {
                return false;
            }
        }
    },

    /* gets currently selected menu type */
    getCurrentMenuType: function () {
        var menuType = getObjectFromLocalStorage(CURRENT_MENY_TYPE_KEY, true);
        return (menuType === null) ? MAIN_MENU_QUERY : menuType;
    },

    /* sets currently selected menu type */
    setCurrentMenuType: function (menuType) {
        setObjectToLocalStorage(menuType, CURRENT_MENY_TYPE_KEY);
    }
};

var openedCategoriesStack = {

    add: function (categoryId, isNewMenu) {
        if (isNewMenu != undefined && isNewMenu != null && isNewMenu) {
            this.resetStack();
        }
        var stack = this.getAll();
        if (stack === null) {
            stack = [];
        }
        stack.push(categoryId);
        setObjectToLocalStorage(stack, OPENED_CATEGORIES_LIST_KEY);
    },

    /* returns menu category which was opened or null if no last opened categories*/
    get: function () {
        var stack = this.getAll();
        if (stack === null || stack.length === 0) {
            return undefined;
        }
        var categoryToReturn = stack[stack.length - 2];
        stack.pop();
        setObjectToLocalStorage(stack, OPENED_CATEGORIES_LIST_KEY);
        return categoryToReturn;
    },
    getOpenedCategory: function () {
        var stack = this.getAll();
        if (stack === null || stack.length === 0) {
            return null;
        }
        return stack[stack.length - 1];
    },

    getAll: function () {
        return getObjectFromLocalStorage(OPENED_CATEGORIES_LIST_KEY, true);
    },

    resetStack: function () {
        setObjectToLocalStorage(null, OPENED_CATEGORIES_LIST_KEY);
    }
};
