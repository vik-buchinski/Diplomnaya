function CacheObject(object) {
    this.object = object;
}

function CreditCard(creditCard) {
    this.creditCardId = creditCard.id;
    this.creditCardNumber = creditCard.number;
    this.creditCardExpirationMonth = creditCard.expiration_month;
    this.creditCardExpirationYear = creditCard.expiration_year;
    this.creditCardSecurityCode = creditCard.security_code;
    this.fullName = creditCard.full_name;
}

function CustomerOrder(order) {
    this.id = order.id;
    this.name = order.name;
    this.createdAt = order.created_at;
}

function User(userToken, role, email, password, location_id, firstName, lastName, phone, notifications, coupons) {
    this.userToken = userToken;
    this.role = role;
    this.email = email;
    this.password = password;
    this.location_id = parseInt(location_id, 10);
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notifications = notifications;
    this.coupons = coupons;
}

function GiftCardRecepient(recFirstName, recLastName, recAddress, recCity, recState, recZip, recReason) {
    this.first_name = recFirstName;
    this.last_name = recLastName;
    this.address = recAddress;
    this.city = recCity;
    this.state = recState;
    this.zip = recZip;
    this.reason = recReason;
}

function GiftCardSender(sendFirstName, sendLastNames, sendCreditCardNumber, sendExpMonth, sendExpYear) {
    this.holder = sendFirstName + " " + sendLastNames;
    this.number = sendCreditCardNumber;
    this.expiration_month = sendExpMonth;
    this.expiration_year = sendExpYear;
}