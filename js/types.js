// ----- Add Item To Order View Type -----
var sendOrderAutomatically = false;
var orderItem = null;
var menuItemId;
var categoryId;
var isNeedReloadOrder = false;

$(document).on('pageshow', '#add-item-to-order-page', function () {
    if (sendOrderAutomatically === true) {
        sendOrderAutomatically = false;
        addItemToOrderPage.addItem();
    }
});

$('#add-item-to-order-page, #edit-order-item-page').on("pagebeforeshow", function(event) {
    $(this).trigger("create");
    $(this).find(".ui-listview").listview("refresh");
});

var addItemToOrderPage = {
    buildPage: function(order, itemId, orderItemId) {
        menuCategories.getCategoryAndItem(itemId, function(menuItem, currentCategory) {
            var data = {
                menu_item: menuItem,
                menu_category_name: currentCategory.name,
                menu_category_image: currentCategory.imageURL,
                menu_category_id: currentCategory.category_id,
                customization_categories_length: menuItem.customization_categories.length,
                order: order,
                orderItemId: orderItemId
            };

            menuItemId = itemId;
            categoryId = currentCategory.category_id;

            var template = _.template($("#add-item-to-order-template").html());

            if (orderItemId != undefined) {
                $("#edit-order-item-page [data-role=content]").html(template(data));
                getOrderItem(getUserToken(), orderItemId, function(orderItem) {
                    $("#edit-order-item-page #count").val(orderItem.quantity);
                    $("#edit-order-item-page #order-item-instructions").val(orderItem.special_instructions);
                    addItemToOrderPage.buildPageTemplate(itemId, currentCategory, orderItemId);
                });
            } else {
                $("#add-item-to-order-page [data-role=content]").html(template(data));
                addItemToOrderPage.buildPageTemplate(itemId, currentCategory, orderItemId);
            }
        });
    },
    
    buildPageTemplate: function(itemId, currentCategory, orderItemId) {
        addItemToOrderPage.buildCustimizationCategories(itemId, currentCategory.category_id, orderItemId, function() {
            addItemToOrderPage.getMenuItemCost(itemId, currentCategory.category_id, function(costForItem) {
                $("#total-item-cost").html(costForItem);
            });
            if (orderItemId != undefined) {
                $("#edit-order-item-page #add-item-to-order").hide();
                $("#edit-order-item-page #save-order-item-changes").show();
                $("#edit-order-item-page #delete-order-item").show();
                gotoScreen('#edit-order-item-page');
            } else {
                $("#add-item-to-order-page #add-item-to-order").show();
                $("#add-item-to-order-page #save-order-item-changes").hide();
                $("#add-item-to-order-page #delete-order-item").hide();
                gotoScreen('#add-item-to-order-page');
            }
            addItemToOrderPage.recalculatePrice();
        });
    },
    
    buildCustimizationCategories: function(itemId, currentCategoryId, orderItemId, callback) {
        menuCategories.getCategoryById(currentCategoryId, function(currentCategory) {
            if (orderItemId != undefined) {
                getOrderItem(getUserToken(), orderItemId, function(orderItem) {
                    var menuItem = addItemToOrderPage.getItemFromCategory(currentCategory, itemId);
                    if (menuItem.customization_categories.length > 0) {
                        menuItem = addItemToOrderPage.proccessCustomizationCategories(menuItem, orderItem);
                    }

                    addItemToOrderPage.buildCustomizationTemplates(menuItem, "edit-order-item-page");
                    if (callback != undefined) {
                        callback();
                    }
                });
            } else {
                var pageId;
                if (getCurrentPageId() != "edit-order-item-page") {
                    pageId = "add-item-to-order-page";
                } else {
                    pageId = "edit-order-item-page";
                }
                addItemToOrderPage.buildCustomizationTemplates(addItemToOrderPage.getItemFromCategory(currentCategory, itemId), pageId);
                if (callback != undefined) {
                    callback();
                }
            }
        });
    },
    
    getItemFromCategory: function(currentCategory, itemId) {
        return _.find(currentCategory.menu_items, function(item) {
            if (item.id == itemId) {
                return true;
            }
        });
    },
    
    buildCustomizationTemplates: function(menuItem, pageId) {
        if (menuItem.customization_categories.length > 0) {
            $("#" + pageId + " #customization-categories-container fieldset").remove();
            var customizationsTemplate = _.template($("#customization-categories-template").html());
            $("#" + pageId + " #customization-categories-container").prepend(customizationsTemplate({ customization_categories: menuItem.customization_categories }));
            $("#" + pageId + " [data-role=content]").trigger("create");
            $("#" + pageId + " [data-role=content]").find(".ui-listview").listview("refresh");
            updateCurrency();
            if (getCurrentPageId() == pageId) {
                addItemToOrderPage.recalculatePrice();
            }
        }
    },
    
    proccessCustomizationCategories: function(menuItem, orderItem) {
        _.each(menuItem.customization_categories, function(customizationCategory) {
            _.each(customizationCategory.customization_items, function(customizationItem) {
                if (orderItem.customization_items.length > 0) {
                    var item = _.find(orderItem.customization_items, function(orderCustomizationItem) {
                        return orderCustomizationItem.id == customizationItem.id;
                    });

                    if (item != undefined) {
                        customizationItem.checked = true;
                    } else {
                        customizationItem.checked = false;
                    }
                } else {
                    customizationItem.checked = false;
                }
            });
        });
        return menuItem;
    },

    goToPage: function(itemId, orderItemId) {
        if (getCurrentOrderID() !== null) {
            retrieveOrderFromServer(getUserToken(), getCurrentOrderID(), function (order) {
                addItemToOrderPage.buildPage(order, itemId, orderItemId);
            });
        } else {
            addItemToOrderPage.buildPage(null, itemId, orderItemId);
        }
    },

    plus: function () {
        var count = $("#" + getCurrentPageId() + " #count").val();
        count++;
        addItemToOrderPage.recalculatePrice(count);
    },

    minus: function () {
        var count = parseFloat($("#" + getCurrentPageId() + " #count").val());
        if (count == 1) {
            return;
        }
        count--;
        addItemToOrderPage.recalculatePrice(count);
    },

    recalculatePrice: function(count) {
        if (count == undefined) {
            count = $("#" + getCurrentPageId() + " #count").val();
        }
        addItemToOrderPage.getMenuItemCost(menuItemId, categoryId, function(costForItem) {
            $("#" + getCurrentPageId() + " #count").val(count);
            $("#" + getCurrentPageId() + " #total-item-cost").html(costForItem * count);
            updateCurrency();
        });
    },

    getMenuItemCost: function (menuItemId, categoryId, callback) {
        menuCategories.getCategoryById(categoryId, function (category) {
            var selectedItemsPrice = 0;
            var menuItemSelected = _.find(category.menu_items, function (menuItem) {
                if (menuItem.id == menuItemId) {
                    return true;
                }
            });
            _.each(menuItemSelected.customization_categories, function (cutomizationCategory) {
                _.each(cutomizationCategory.customization_items, function (customizationItem) {
                    if ($("#" + getCurrentPageId() + " #choice-" + customizationItem.id).is(":checked")) {
                        selectedItemsPrice += parseFloat(customizationItem.cost);
                    }
                });
            });
            selectedItemsPrice += parseFloat(menuItemSelected.cost);
            callback(selectedItemsPrice);
        });
    },

    addItem: function(orderItemId) {
        if (getCurrentOrderID() !== null) {
            addItemToOrderPage.processViewData(menuItemId, categoryId, orderItemId);
        } else {
            attemptStartNewOrder(function () {
                addItemToOrderPage.processViewData(menuItemId, categoryId, orderItemId);
            });
        }
    },

    processViewData: function(menuItemId, categoryId, orderItemId) {
        addItemToOrderPage.getSelectedCustomizationString(menuItemId, categoryId, function (customizationsString) {
            var quantity = $("#" + getCurrentPageId() + " #count").val();
            var instructions = $("#" + getCurrentPageId() + " #order-item-instructions").val();
            
            if (getCurrentPageId() == "edit-order-item-page") {
                saveChangesOrderItem(getUserToken(), orderItemId, quantity, customizationsString, instructions, function() {
                    history.back();
                    gotoViewOrderScreen();
                });
            } else {
                addItemToOrderOnServer(getUserToken(), getCurrentOrderID(), instructions, customizationsString, menuItemId, quantity);
            }
        });
    },

    getSelectedCustomizationString: function (menuItemId, categoryId, callback) {
        menuCategories.getCategoryById(categoryId, function (category) {
            var menuItem = _.find(category.menu_items, function (item) {
                if (item.id == menuItemId) {
                    return true;
                }
            });
            var customizationCategories = [];
            _.each(menuItem.customization_categories, function (customizationCategory) {
                var selectedCustomizationsItems = [];
                _.each(customizationCategory.customization_items, function (customizationItem) {
                    if ($("#" + getCurrentPageId() + " #choice-" + customizationItem.id).prop("checked")) {
                        selectedCustomizationsItems.push(customizationItem.id);
                    }
                });
                if (selectedCustomizationsItems.length > 0) {
                    customizationCategories.push(new Array(customizationCategory.id, selectedCustomizationsItems));
                }
            });

            var queryLineAdditions = "";
            //building query line for server with selected customization items
            _.each(customizationCategories, function (customizationCategory, index) {
                var additionArray = customizationCategory;
                queryLineAdditions += additionArray[0] + '=';
                var selectedCustomizations = additionArray[1];
                _.each(selectedCustomizations, function (selectedCustomization, indexL) {
                    var lastSymbol = getLastSymbol(queryLineAdditions);
                    if (indexL <= selectedCustomizations.length - 1 && lastSymbol != ',' && lastSymbol != '=') {
                        queryLineAdditions += ",";
                    }
                    queryLineAdditions += selectedCustomization;
                });
                if (index < customizationCategories.length - 1) {
                    queryLineAdditions += '&';
                }
            });
            callback(queryLineAdditions);
        });
    }
};

function getLastSymbol(string) {
    var symbols = string.split('');
    return symbols[symbols.length - 1];
}

// ----- CUSTOMER TYPE ------
function processAddMenuItemToOrder(itemId, orderItemId) {
    if (getCurrentPageId() != "add-item-to-order-page") {
        addItemToOrderPage.goToPage(itemId, orderItemId);
    }
}

function buildOrdersListView(orders) {
    var template = _.template($("#saved-orders-item-template").html());
    $("#previous-orders-page [data-role=content]").html(template({ orders: orders }));
}

function refreshOrdersListPage() {
    $("#previous-orders-page").trigger("create");
    $("#previous-orders-page").find(".ui-listview").listview("refresh");
}

function ordersList() {
    if (getUserToken() !== null) {
        retrieveListOfCustomerOrdersFromServer(getUserToken(), function (orders) {
            buildOrdersListView(orders);
            gotoScreen("#previous-orders-page");
            refreshOrdersListPage();
        });
    } else {
        gotoLoginView(function () {
            ordersList();
        });
    }
}

function onTipChanged() {
    var properties = { tips_percent: $("#tips-select").val() };
    updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function () {
        gotoViewOrderScreen();
    });
}

function removeItemFromOrder(orderItemId) {
    showPopup("Do you want to remove this item from order?", "Cancel", "Remove", function () {
        removeItemFromOrderFromServer(getUserToken(), getCurrentOrderID(), orderItemId, function (order) {
            gotoViewOrderScreen(order);
        });
    });
}

function gotoViewOrderScreen(order) {
    if (getUserToken() === null) {
        gotoLoginView(function () {
            gotoViewOrderScreen();
        });
    } else {
        if (order !== undefined) {
            buildOrderView(order);
        } else {
            if (getCurrentOrderID() !== null) {
                retrieveOrderFromServer(getUserToken(), getCurrentOrderID(), function (recievedOrder) {
                    buildOrderView(recievedOrder);
                });
            } else {
                attemptStartNewOrder(function () {
                    gotoViewOrderScreen();
                });
            }
        }
    }
}

function buildOrderView(order) {
    order.order_items.sort();
    var viewOrderTemplate = _.template($("#view-order-template").html());
    $("#view-order-page [data-role=content]").html(viewOrderTemplate({ order: order }));
    gotoScreen("#view-order-page");
    $("#view-order-page").trigger("create");
    $("#view-order-page").find(".listview").trigger("refresh");
    updateCurrency();
    if (order.order_items.length === 0) {
        $("#submit-button").hide();
        if (getCurrentPageId() != "view-order-page") {
            setTimeout(function () {
                showPopup(NO_ORDER_ITEMS_TEXT);
            }, 1000);
        } else {
            showPopup(NO_ORDER_ITEMS_TEXT);
        }
    } else {
        $("#submit-button").show();
    }
}

function attemptStartNewOrder(callback, parentOrderId) {
    if (getUserToken() === null) {
        isNeedGotoWelcome = false;
        gotoLoginView(function () {
            isNeedGotoWelcome = true;
            attemptStartNewOrder(callback, parentOrderId);
        });
    } else {
        var locationId = getUser().location_id;
        startNewOrder(locationId, callback, parentOrderId);
    }
}

function startNewOrderGotoMenu() {
    if (getUserToken() === null) {
        gotoLoginView(function () {
            startNewOrderGotoMenu();
        });
    } else {
        attemptStartNewOrder(function () {
            gotoViewOrderScreen();
        }, null);
    }
}

function createOrderFromPrevious(parentOrderId) {
    attemptStartNewOrder(function () {
        gotoViewOrderScreen();
    }, parentOrderId);
}

// ----- RESTAURANT TYPE ------ 
function getLocationById(locations, locationId) {
    return _.find(locations, function (location) {
        if (location.id == locationId) {
            return true;
        }
    });
}

function callToOrder() {
    var locations = getRestaurantLocations();
    if (getUserToken() == null) {
        gotoRestaurantLocationsView(false, true);
    } else {
        var location = getLocationById(locations, getUser().location_id);
        if (location != null) {
            if (location.info.orders_phone != null && location.info.orders_phone != "") {
                call(location.info.orders_phone);
            } else {
                gotoRestaurantLocationsView(false, true);
            }
        } else {
            gotoRestaurantLocationsView(false, true);
        }
    }
}

function callUs(isReservations) {
    var locations = getRestaurantLocations();
    if (getUserToken() == null) {
        if (isReservations) {
            gotoRestaurantLocationsView(false, false, false, true);
        } else {
            gotoRestaurantLocationsView(true, false);
        }
    } else {
        var location = getLocationById(locations, getUser().location_id);
        if (location != null) {
            if (location.info.phone != null && location.info.phone != "") {
                if (isReservations && !location.features.reservation.by_phone) {
                    gotoRestaurantLocationsView(false, false, false, true);
                } else {
                    call(location.info.phone);
                }
            } else {
                if (isReservations) {
                    gotoRestaurantLocationsView(false, false, false, true);
                } else {
                    gotoRestaurantLocationsView(true, false);
                }
            }
        } else {
            if (isReservations) {
                gotoRestaurantLocationsView(false, false, false, true);
            } else {
                gotoRestaurantLocationsView(true, false);
            }
        }
    }
}

function call(phone) {
    document.location.href = "tel:" + phone;
}

function gotoGiftCards() {
    if (getUserToken() === null) {
        gotoLoginView(function() {
            buildGiftCardPage();
        });
    } else {
        buildGiftCardPage();
    }
}

function buildGiftCardPage() {
    var locations = getRestaurantLocations();
    var availableLocations = [];

    _.each(locations, function(location) {
        if (location.features.gift_card.by_email != null && location.features.gift_card.by_email) {
            location.location_id = getUser().location_id;
            availableLocations.push(location);
        }
    });
    var locationsTemplate = _.template($("#gift-cards-template").html());
    $("#gift-card-page [data-role=content]").html(locationsTemplate({ locations: availableLocations })).trigger("create");
    renderMonthsAndYears("#gift-card-page");
    gotoScreen('#gift-card-page', false);
    initGiftCardForm();
}

function submitOrder() {
    var locations = getRestaurantLocations();
    var deliveryDescription;
    var availableLocations = [];
    
    _.each(locations, function(location) {
        if (location.features.order.by_app) {
            location.location_id = getUser().location_id;
            availableLocations.push(location);
        }

        if (location.location_id != null && location.id == location.location_id) {
            deliveryDescription = location.delivery.description;
        }
    });
    var locationsTemplate = _.template($("#delivery-locations-template").html());
    $("#delivery-locations-container").html(locationsTemplate({ locations: availableLocations })).trigger("create");
    buildDeliveryPrices(deliveryDescription);
}

function buildDeliveryPrices(deliveryDescription) {
    retrieveOrderFromServer(getUserToken(), getCurrentOrderID(), function(order) {
        var template = _.template($("#delivery-template").html());
        $("#delivery-container").html(template({ delivery: order.delivery_charge, delivery_description: deliveryDescription }));

        var orderPiceData = {
            tax: order.tax,
            total: order.total_cost
        };

        var orderPiceTemplate = _.template($("#order-pice-template").html());
        $("#price-container").html(orderPiceTemplate(orderPiceData)).trigger("create");

        gotoScreen("#order-delivery-page");
        $('#order-delivery-page').trigger("create");
        $('#order-delivery-page').find(".ui-listview").listview("refresh");
        updateCurrency();
    });
}


function showEditPopup(orderName) {
    var data = {
        orderName: orderName
    };
    var template = _.template($("#input-template").html());
    $("#popup-ordername-container").html(template(data));
    $("#order-name-editing-popup").trigger("create");
    $("#order-name-editing-popup").popup("open");
}

function saveOrderName() {
    var orderName = $("#order-name-input").val();
    isNeedReloadOrder = true;

    var properties = { name: escape(orderName) };

    updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function () {
        $("#order-name-editing-popup").on({
            popupafterclose: function () {
                if (isNeedReloadOrder) {
                    gotoViewOrderScreen();
                    isNeedReloadOrder = false;
                }
            }
        });
        $("#order-name-editing-popup").popup("close");
    });
}

/* Work with new logic of displaying categories */
var menuViewer = {

    displayWholeMenu: function (menuType, isSaveToStack) {
        $("#menu-page [data-role=content]").empty();
        var buttonContent = {
            id: "main"
        };
        var template = _.template($("#nav-buttons-template").html());
        $("#menu-page [data-role=content]").append(template(buttonContent));
        menuCategories.get(function (menuCategories) {
            //saving currently selected menu
            if (isSaveToStack === undefined || isSaveToStack) {
                openedCategoriesStack.add(menuType, true);
            }
            if (menuCategories !== null) {
                _.each(menuCategories, function (category) {
                    menuViewer.buldCategory(category, '#buttons-container-main');
                });
            } else {
                $("#menu-page [data-role=content]").empty();
                var noItemsTemplate = _.template($("#no-categories-template").html());
                $("#menu-page [data-role=content]").html(noItemsTemplate(""));
            }
            $.mobile.silentScroll(0);
            gotoScreen("#menu-page");
            $('#menu-page').trigger("create");
            updateCurrency();
            initializeButtonsHover();
        }, menuType);
    },

    displayCategory: function (categoryId, isSaveToStack) {
        $("#menu-page [data-role=content]").empty();
        var template = _.template($("#nav-buttons-template").html());
        $("#menu-page [data-role=content]").append(template({ id: "main" }));

        menuCategories.getCategoryById(categoryId, function (menuCategory) {
            //saving currently selected category
            if (isSaveToStack === undefined || isSaveToStack) {
                openedCategoriesStack.add(menuCategory.category_id);
            }

            menuCategory.expanded = true;
            menuViewer.buldCategory(menuCategory, '#buttons-container-main');
            $.mobile.silentScroll(0);
            gotoScreen("#menu-page");
            $('#menu-page').trigger("create");
            updateCurrency();
            initializeButtonsHover();
        });
    },

    buldUnexpandedButton: function (category, buttonContainerId) {
        var buttonContent = {
            categoryId: category.category_id,
            categoryName: category.name
        };

        var buttonWhole = _.template($("#button-large-template").html());

        if (!$("#custom-image-" + category.category_id).length) {
            var style = document.createElement('style');
            style.id = "custom-image-" + category.category_id;
            style.type = 'text/css';
            style.innerHTML = ".ui-icon-" + category.category_id + ":after { background-image: url('" + category.image_url + "'); }";
            $("head").append(style);
        }

        $(buttonWhole(buttonContent))
            .appendTo(buttonContainerId)
            .addClass("ui-icon-" + category.category_id)
            .trigger('create');
    },

    buldCategory: function (category, buttonContainerId) {
        if (category.expanded == false) {
            this.buldUnexpandedButton(category, buttonContainerId);
        } else {
            var menuItemsTemplate = _.template($("#expanded-category-container-template").html());
            $("#menu-page [data-role=content]").append(menuItemsTemplate({ categoryId: "div" + category.category_id }));

            var menuCategoryWhole = _.template($("#expanded-menu-category-template").html());
            $(menuCategoryWhole({ category: category, is_view_only: getRestaurantInfo().features.view_only.by_app }))
                .appendTo("#div" + category.category_id);
            if (category.subcategories != undefined && category.subcategories !== null && category.subcategories.length > 0) {
                var template = _.template($("#nav-buttons-template").html());
                $("#menu-page [data-role=content]").append(template({ id: category.category_id }));
                _.each(category.subcategories, function (subcategory) {
                    menuViewer.buldUnexpandedButton(subcategory, '#buttons-container-' + category.category_id);
                });
            }
        }
    },

    goBack: function () {
        var previouslyOpenedCategory = openedCategoriesStack.get();
        if (previouslyOpenedCategory === undefined) {
            history.back();
        } else if (previouslyOpenedCategory == SPECIALS_MENU_QUERY || previouslyOpenedCategory == MAIN_MENU_QUERY) {
            this.displayWholeMenu(previouslyOpenedCategory, false);
        } else {
            this.displayCategory(previouslyOpenedCategory, false);
        }
    }
};

function cashSelected() {
    $("#credit-card-button").hide();
    $("#order-confirmation").show();
}

function creditCardSelected() {
    $("#credit-card-button").show();
    $("#order-confirmation").hide();
}

$('#process-order-page, #enter-credit-card-page').on("pagebeforeshow", function (event) {
    $(this).trigger("create");
    $(this).find(".ui-listview").listview("refresh");
});

$('#payment-method').on("pagebeforeshow", function (event) {
    var locations = getRestaurantLocations();
    var selectedLocation = _.find(locations, function (location) {
        if (location.id == getUser().location_id) {
            return true;
        }
    });

    if (selectedLocation.features.payments.by_cash && !selectedLocation.features.payments.by_credit_card) {
        $("#radio-payment-cash-input, #radio-payment-cash-label").show();
        $("#radio-payment-credit-input, #radio-payment-credit-label").hide();
        $("#radio-payment-cash-label").addClass('ui-last-child ui-first-child');
        $('#radio-payment-cash-input').prop("checked", "checked").checkboxradio("refresh");
        cashSelected();
    } else if (!selectedLocation.features.payments.by_cash && selectedLocation.features.payments.by_credit_card) {
        $("#radio-payment-cash-input, #radio-payment-cash-label").hide();
        $("#radio-payment-credit-input, #radio-payment-credit-label").show();
        $("#radio-payment-credit-label").addClass('ui-first-child ui-last-child');
        $('#radio-payment-credit-input').prop("checked", "checked").checkboxradio("refresh");
        creditCardSelected();
    } else {
        $("#radio-payment-credit-label").addClass('ui-first-child');
        $("#radio-payment-cash-label").addClass('ui-last-child');
    }
});

var creditCards = {
    show: function () {
        retrieveOrderFromServer(getUserToken(), getCurrentOrderID(), function (order) {
            var locations = getRestaurantLocations();
            var userLocationId = getUser().location_id;
            var selectedLocation = _.find(locations, function(location) {
                return location.id == userLocationId;
            });

            if (selectedLocation.payments.minimum_order_amount != null && parseFloat(selectedLocation.payments.minimum_order_amount) > parseFloat(order.total_cost)) {
                showPopup(MINIMUM_CREDIT_ORDER_AMOUNT + selectedLocation.payments.minimum_order_amount + "$");
            } else {
                getUserCreditCard(getUserToken(), function(cards) {
                    if (cards.length > 0) {
                        $("#credit-cards-list").empty();
                        var template = _.template($("#credit-cards-template").html());
                        $("#credit-cards-list").append(template({ cards: cards }));
                        gotoScreen("#process-order-page");
                    } else {
                        creditCards.useDifferent();
                    }
                });
            }
        });
    },

    useDifferent: function () {
        var enterPaymentInfo = {
            creditCardNumber: "",
            creditCardSecCode: "",
            creditCardFullName: getUser().firstName + ' ' + getUser().lastName
        };
        var enterPaymentInfoTemplate = _.template($("#enter-credit-card-template").html());
        $("#enter-credit-card-page > [data-role=content] > form").html(enterPaymentInfoTemplate(enterPaymentInfo));
        renderMonthsAndYears("#enter-credit-card-page");

        gotoScreen("#enter-credit-card-page");
    },

    sendInputted: function () {
        var creditCardNumber = $("#credit-card-number").val();
        var creditCardExpirationMonth = $("#enter-credit-card-page #credit-card-expiration-month").val();
        var creditCardExpirationYear = $("#enter-credit-card-page #credit-card-expiration-year").val();
        var creditCardSecurityCode = $("#credit-card-security-code").val();
        var creditCard = new CreditCard({ id: null, number: creditCardNumber, expiration_month: creditCardExpirationMonth, expiration_year: creditCardExpirationYear, security_code: creditCardSecurityCode });

        sendUserCreditCard(getUserToken(), creditCard, function (data) {
            order.setCreditCard(data.creditCardId, order.displayInfo);
        });
    }
};

function processPaymentType() {
    var paymentType = $("#payment-type :radio:checked").val();
    var properties = {
        payment_type: paymentType
    };

    updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function () {
        if(paymentType == $("#radio-payment-cash-input").val()) {
            order.displayInfo();
        } else if (paymentType == $("#radio-payment-credit-input").val()) {
            creditCards.show();
        }

    });
}

var order = {
    submit: function () {
        var element = $('#coupons-select');
        if (element.length > 0) {
            var couponId = $('#coupons-select option:selected').val();
            if (couponId != "default") {
                var properties = {
                    coupon_id: couponId
                };
                updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function () {
                    order.submitOrderOnServer(couponId);
                });
            } else {
                order.submitOrderOnServer(couponId);
            }
        } else {
            order.submitOrderOnServer();
        }
    },

    submitOrderOnServer: function (couponId) {
        submitOrderToServer(getUserToken(), getCurrentOrderID(), function () {
            if (couponId != undefined) {
                coupons.redeemLocally(couponId);
            }
            var orderData = {
                orderId: getCurrentOrderID()
            };
            var orderTemplate = _.template($("#thank-text-template").html());
            $("#thank-text-container").html(orderTemplate(orderData));

            setCurrentOrderID(null);
            gotoScreen("#thanks-page", false);
        });
    },

    setCreditCard: function (cardId, callback) {
        
        var properties = {
            credit_card_id: cardId
        };

        updateOrderOnServer(properties, getCurrentOrderID(), getUserToken(), function() {
            callback();
        });
    },
    
    displayInfo: function () {
        retrieveOrderFromServer(getUserToken(), getCurrentOrderID(), function (order) {
            if ($("#delivery-type :radio:checked").val() == "PICKUP") {
                order.delivery_charge = null;
            }

            var locations = getRestaurantLocations();
            var locationInfo;

            _.find(locations, function (location) {
                if (location.id == getUser().location_id) {
                    locationInfo = location.info.name + " - " + location.address.address + ", " + location.address.city;
                    return;
                }
            });
            var user = getUser();
            var availableCoupons = [];
            if (restaurant.isCouponsAllowed(getRestaurantInfo())) {
                _.each(user.coupons, function(coupon) {
                    if (coupon.status == "ISSUED" && ((coupon.restaurant_location_id == null) || (coupon.restaurant_location_id == user.location_id))) {
                        availableCoupons.push(coupon);
                    }
                });
            }

            var orderTemplate = _.template($("#order-info-template").html());
            $("#total-order-info-page [data-role=content]").html(orderTemplate({ order: order, locationInfo: locationInfo, coupons: availableCoupons }));

            gotoScreen("#total-order-info-page");
            $("#total-order-info-page").trigger("create");
            updateCurrency();
        });
    }
};