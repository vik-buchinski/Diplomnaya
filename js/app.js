var APP_TOKEN = "#app-token#";
var API_VERSION = "2.3";
var SERVICE_URL = "#services-address#api/v" + API_VERSION;
var CACHE_EXPIRE_TIME = 30; // min
var HOME_REDIRECT_TIME = 5000;
var MIN_CREDIT_CARD_LENGTH = 16;

var SPECIALS_MENU_QUERY = "SPECIALS";
var MAIN_MENU_QUERY = "MAIN";

var SERVER_CONNECTION_FAILED_TEXT = "Connecting to server has been failed. Please check your network.";
var NO_ORDER_ITEMS_TEXT = "You have no menu items in your current order. Go to the menu and select the what you would like to order.";
var MINIMUM_DELIVERY_AMOUNT_MESSAGE = "Minimum delivery amount is ";
var MINIMUM_CREDIT_ORDER_AMOUNT = "Minimum order amount for payment by credit card is ";
var DIRECTION_DETECTING_CODE_ONE = "The location acquisition process failed because the application does not have permission to use the Geolocation API.";
var DIRECTION_DETECTING_CODE_TWO = "The position of the device could not be determined. Ensure that Google's location service is enabled.";
var DIRECTION_DETECTING_CODE_THREE = "Request timeout.";
var DIRECTION_ROUTE_BUILDING_ERRORE = "Smth wrong with posittion.";

var ITEMS_PER_PAGE = 10;
var EXPIRATION_YEAR_OFFSET = 15;
// local storage keys
var MENU_KEY = "MENU_KEY";
var CURRENT_MENY_TYPE_KEY = "CURRENT_MENY_TYPE_KEY";
var OPENED_CATEGORIES_LIST_KEY = "OPENED_CATEGORIES_LIST_KEY";
var CURRENT_ORDER_ID_KEY = "CURRENT_ORDER_ID";
var RESTAURANT_KEY = "RESTAURANT_KEY";
var USER_KEY = "USER_KEY";

var LocalCurrentOrderID = null;
var LocalItemIdForAddedToOrder = null;
var LocalRestaurantInfo = null;
var LocalUserModel = null;

function getCurrentDate() {
    return { 
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    }
}

function renderMonthsAndYears(pageId) {
    var template = _.template($("#expiration-date-template").html());
    var currentDate = getCurrentDate();
    $(pageId)
        .find(".card-expiration-container")
        .html(template({
            current: currentDate,
            months: _.range(1, 13),
            years: _.range(currentDate.year, currentDate.year + EXPIRATION_YEAR_OFFSET)
        }))
        .trigger("create");
}

var restaurant = {
    init: function() {
        $("#order-name-editing-popup").popup();
        getRestaurantInfoFromServer(function(restaurantApp) {
            toggleVisibility("#photo-gallery-home", restaurantApp.animation.length > 0);
            toggleVisibility("#photowall-button", restaurantApp.photos.length > 0);
            if (restaurantApp.animation.length > 0) {
                buildAnimation("photo-gallery-home", restaurantApp.animation);
                //buildSlider("photo-gallery-home", false, restaurantApp.animation);
            }

            setRestaurantInfo(restaurantApp);
            checkUserLocation();

            _.each(restaurantApp.features, function(parametrs, group) {
                restaurant.processRestaurantFeature(parametrs, group);
            });

            $('[data-role=page]').on('pageinit', function(event) {
                restaurant.buildFooter(event.target.id);
                updateCurrency();
                initializeButtonsHover();
            });

            restaurant.buildFooter("home-page");

            if (navigator.splashscreen !== undefined) {
                //waiting for animation load
                setTimeout(function() {
                    navigator.splashscreen.hide();
                }, 1000);
            }
        });
        $('[data-role="dialog"]').on('pagebeforeshow', function(e, ui) {
            ui.prevPage.addClass("ui-dialog-background fixed-posittion");
        });

        $('[data-role="dialog"]').on('pagebeforehide', function(e, ui) {
            $(".ui-dialog-background").removeClass("ui-dialog-background");
            $(".fixed-posittion").removeClass("fixed-posittion");
        });
    },
    
    processRestaurantFeature: function(parametrs, group) {
        switch (group) {
            case "view_only":
                if (parametrs.by_app != undefined) {
                    toggleVisibility("#manage-your-orders-button", !parametrs.by_app);
                    if (parametrs.by_app) {
                        toggleVisibility("#specials-button", !parametrs.by_app);
                    }
                }
                break;
            case "sharing":
                if (parametrs.by_email != undefined) {
                    toggleVisibility("#social-button", parametrs.by_email);
                    toggleVisibility("#share-email-welcome-button", parametrs.by_email);
                }
                break;
            case "coupons":
                if (parametrs.by_app != undefined) {
                    toggleVisibility("#coupons-button", parametrs.by_app);
                }
                break;
            case "gift_card":
                toggleVisibility("#gift-card-button", parametrs);
                break;
            case "order_by_phone":
                toggleVisibility("#order-call-button", parametrs);
                break;
            case "reservation":
                toggleVisibility("#reservations-button", parametrs);
                break;
            case "specials":
                if (!restaurant.isViewOnly(getRestaurantInfo())) {
                    toggleVisibility("#specials-button", parametrs);
                } else {
                    toggleVisibility("#specials-button", false);
                }
                break;
            default:
                break;
        }
    },

    buildFooter: function(pageId) {
        var footerTemplate = _.template($("#footer-template").html());
        var restaurantApp = getRestaurantInfo();
        var isSpecialsAllowed;
        if(restaurant.isViewOnly(getRestaurantInfo())) {
            isSpecialsAllowed = false;
        } else {
            isSpecialsAllowed = getRestaurantInfo().features.specials;
        }
        $("#" + pageId).find("[data-role=footer]").html(footerTemplate(
            {
                view_only: restaurant.isViewOnly(restaurantApp),
                specials_allowed: isSpecialsAllowed
            }));
        $("#" + pageId).trigger("create");
        $("#" + pageId).find(".ui-listview").listview("refresh");
    },

    isViewOnly: function(restaurantApp) {
        if (restaurantApp.features.view_only == undefined) {
            return false;
        } else if (restaurantApp.features.view_only.by_app == undefined) {
            return false;
        } else {
            return restaurantApp.features.view_only.by_app;
        }
    },
    
    isCouponsAllowed: function(restaurantApp) {
        if (restaurantApp.features.coupons == undefined) {
            return false;
        } else if (restaurantApp.features.coupons.by_app == undefined) {
            return false;
        } else {
            return restaurantApp.features.coupons.by_app;
        }
    }
};

if (isDevice()) {
    document.addEventListener("deviceready", restaurant.init, true);
} else {
    $(document).ready(restaurant.init);
}

function isDevice() {
    return navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/);
}

$.validator.addMethod(
    'phoneRegexp', function(value, element, regexp) {
        return this.optional(element) || new RegExp(regexp).test(value);
    }, "Enter valid phone number"
);
$.validator.addMethod(
    'cardRegexp', function(value, element, regexp) {
        return this.optional(element) || new RegExp(regexp).test(value);
    }, "Enter valid card number"
);

$.validator.addClassRules({
    phone: {
        phoneRegexp: /^\+?\(?([0-9]{3})?\)?([ .-]?)([0-9]{3})([ .-]?)([0-9]{4,6})$/
    },
    card: {
        cardRegexp: /^(([3-9]\d{3})\-?\d{4}\-?\d{4}\-?\d{4}|3[4,7]\d{13}|\d{18,19})$/
    }
});

$.validator.addMethod("checkDate", function() {
    var currentDate = getCurrentDate();
    if ($("#credit-card-expiration-year").val() == currentDate.year) {
        if ($("#credit-card-expiration-month").val() < currentDate.month) {
            return false;
        }
    }
    return true;
}, 'Invalid expiration date');

function checkUserLocation() {
    if (getUserToken() !== null) {
        var tempUser = getUser();
        var locations = getRestaurantLocations();
        var location = _.find(locations, function(item) {
            return (item.id === tempUser.location_id && item.features.order.by_app);
        });

        if (!location) {
            var newLocationId = _.find(locations, function(item) {
                return (item.features.order.by_app);
            }).id;
            tempUser.location_id = newLocationId;
            sendProfileToServer(getUserToken(), tempUser, function (user) {
                setUser(user);
            });
        }
    }
}

function currentTimeInMinutes() {
    //Return the number of minutes since 1970/01/01:
    var totalMinutes = new Date().getTime() / 1000 / 60;
    return totalMinutes;
}

$('#home-page[data-role=page]').on('pagebeforeshow', function (event) {
    RefreshUserArea();
});

function updateCurrency() {
    $('.currency').currency({ region: 'USD' });
}

$(document).on('pageinit', function () {
    $("#register-form").validate({
        submitHandler: function () {
            RegistrationNewUser();
        }
    });

    $("#login-form").validate({
        submitHandler: function () {
            signupLocationId = null;
            LogIn();
        }
    });
    
    $("#new-card-form").validate({
        rules: {
             "credit-card-expiration-year": "checkDate"
        },
        groups: {
            "credit-card-expiration": "credit-card-expiration-month credit-card-expiration-year"
        },
        errorPlacement: function(error, element) {
            error.insertAfter(element.parent());
        },
        submitHandler: function () {
            creditCards.sendInputted();
        }
    });

    initGiftCardForm();

    $("#order-name-form").validate({
        submitHandler: function () {
            saveOrderName();
        }
    });

    $("#delivery-form").validate({
        submitHandler: function () {
            gotoScreen('#payment-method');
        }
    });
});

function initGiftCardForm() {
    $("#gift-card-form").validate({
        submitHandler: function() {
            sendGiftCard();
        }
    });
}

function gotoScreen(screenName, reverse, transition) {
    var functionTransition = "slide";
    if (typeof transition != "undefined") {
        functionTransition = transition;
    }
    $.mobile.changePage(screenName, {
        //transition: functionTransition,
        reverse: reverse
    });
}

function getLocalStorage() {
    return window.localStorage;
}

function setUser(user) {
    if (user === null) {
        getLocalStorage().removeItem(USER_KEY);
        LocalUserModel = null;
    } else {
        getLocalStorage().setItem(USER_KEY, JSON.stringify(user));
        LocalUserModel = user;
    }
}

function getUser() {
    if (LocalUserModel === null) {
        LocalUserModel = JSON.parse(getLocalStorage().getItem(USER_KEY));
    }
    return LocalUserModel;
}
function getUserToken() {
    return (getUser() !== null) ? LocalUserModel.userToken : null;
}

function getCurrentOrderID() {
    if (LocalCurrentOrderID === null) {
        LocalCurrentOrderID = getLocalStorage().getItem(CURRENT_ORDER_ID_KEY);
    }
    return LocalCurrentOrderID;
}

function setCurrentOrderID(orderId) {
    if (orderId === null || orderId === "") {
        getLocalStorage().removeItem(CURRENT_ORDER_ID_KEY);
        LocalCurrentOrderID = null;
    } else {
        getLocalStorage().setItem(CURRENT_ORDER_ID_KEY, orderId);
        LocalCurrentOrderID = orderId;
    }
}

function getRestaurantLocations() {
    return getRestaurantInfo().restaurant_locations;
}

function getRestaurantInfo() {
    if (LocalRestaurantInfo === null) {
        LocalRestaurantInfo = getLocalStorage().getItem(RESTAURANT_KEY);
    }
    return LocalRestaurantInfo;
}

function setRestaurantInfo(restaurantInfo) {
    setObjectToLocalStorage(restaurantInfo, RESTAURANT_KEY);
    if (restaurantInfo === null || restaurantInfo === "") {
        getLocalStorage().removeItem(RESTAURANT_KEY);
        LocalRestaurantInfo = null;
    } else {
        getLocalStorage().setItem(RESTAURANT_KEY, restaurantInfo);
        LocalRestaurantInfo = restaurantInfo;
    }
}

function setObjectToLocalStorage(object, key) {
    if (object === null || object === "") {
        getLocalStorage().removeItem(key);
    } else {
        object.timeWhenSaved = currentTimeInMinutes();
        getLocalStorage().setItem(key, JSON.stringify(object));
    }
}

function getObjectFromLocalStorage(key) {
    return getObjectFromLocalStorage(key, false);
}

function getObjectFromLocalStorage(key, getAllTime) {
    var object = getLocalStorage().getItem(key);
    if (object === null) return null;
    object = JSON.parse(object);
    if (getAllTime === true) {
        return object;
    }
    var time = currentTimeInMinutes() - object.timeWhenSaved;
    if (time > CACHE_EXPIRE_TIME) {
        return null;
    }

    return object;
}

function generateNewOrderName() {
    var date = new Date();
    return "New Order-" + date.getFullYear() + '-' + (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) + '-' + (date.getDate() < 10 ? '0' : '') + date.getDate();
}

function checkNotificationExist(notifications, channelName) {
    if (notifications) {
        return _.filter(notifications, function (i) { return i.channel == channelName; });
    }
    return false;
}

function toggleVisibility(elementId, visible) {
    $(elementId).css('display', visible ? 'block' : 'none');
}

function showVersionPopup(title, text, description, market_urls) {
    var $popUp = $("<div id='message-popup' class='ui-content' align='center'/>")
                    .popup({
                        dismissible: false,
                        theme: "b",
                        transition: "pop",
                    }).on("popupafterclose", function () {
                        $(this).remove();
                    });

    $("<h3>", { text: title }).appendTo($popUp);
    $("<h4>", { text: text }).appendTo($popUp);

    _.each(market_urls, function (market_url) {
        $("<a>")
            .text("Go to " + market_url.name)
            .buttonMarkup({ theme: 'a' })
            .click(function () {
                window.open(market_url.url, '_system');
            })
            .appendTo($popUp);
    });

    $("<h6>", { text: description }).appendTo($popUp);
    $popUp.popup('open');
}

showPopup = function(message, cancelText, okText, btnOkPressed) {
    var $popUp = $("<div id='message-popup' class='ui-content' align='center'/>")
        .popup({
            dismissible: false,
            theme: "b",
            transition: "pop",
        }).on("popupafterclose", function() {
            $(this).remove();
        });
    
    $("<h4>").html(message).appendTo($popUp);

    if (btnOkPressed) {
        $("<a>").text(okText || "Cancel").buttonMarkup({ mini: true, inline: true, theme: 'a' })
            .bind("click", function() {
                $popUp.popup("close");
                $('#message-popup').on("popupafterclose", function() {
                    btnOkPressed();
                });
            }).appendTo($popUp);
    }

    $("<a>").text(cancelText || "OK").buttonMarkup({ mini: true, inline: true, theme: 'a' })
        .bind("click", function() {
            $popUp.popup("close");
        })
        .appendTo($popUp);

    $popUp.popup('open');
};

$("[data-role=page], [data-role=dialog]:not(#login-dialog)").on('focus', 'input, textarea', function () {
    $('[data-role=page] > [data-role=footer]').addClass('unfixed-posittion').trigger("create");
});

$("[data-role=page], [data-role=dialog]:not(#login-dialog)").on('blur', 'input, textarea', function () {
    $('[data-role=page] > [data-role=footer]').removeClass('unfixed-posittion').trigger("create");
    $.mobile.silentScroll($('[data-role=page] > [data-role=header]').offset().top);
});

function initializeButtonsHover() {
    $("nav.large > .ui-btn").hover(
        function() {
            $(this).addClass("ui-btn-hover");
        }, function() {
            $(this).removeClass("ui-btn-hover");
        }
    );
}

function getCurrentPageId() {
    return $.mobile.activePage.attr('id');
}