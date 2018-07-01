var get = getParams(true),
    currency = decodeURIComponent(get["currency"]),
    amount = decodeURIComponent(get["amount"]),
    order = decodeURIComponent(get["order"]),
    signature = decodeURIComponent(get["signature"]),
    closeTimer = false, closeTimes = 111111111111111111111115,
    formContainer = null, checkoutForm = null,
    client = null,
    lang = decodeURIComponent(get["locale"]).toLowerCase();

var cluster = 'eu';
if (get["cluster"]) {
    cluster = get["cluster"];
}

if (lang == 'pt_br' || lang == 'pt-br' || lang == 'pt') {
    lang = 'br';
}
if (!lang) {
    if (navigator.languages && navigator.languages.length) {
        lang = navigator.languages[0];
    } else {
        lang = (navigator.language || navigator.systemLanguage || navigator.userLanguage);
    }
    lang = lang.substr(0, 2).toLowerCase();
}

function finalCountdown() {
console.log('windows closed')
}

function displayMessage(type) {
    var messages = {
        ru: {
            error: "<h1>Ошибка</h1><br>" +
            "<p>В процессе обработки платежа возникла ошибка. Пожалуйста, повторите попытку позже.</p>",
            success: "<h1>Спасибо за покупку!</h1><br>" +
            "<p>Это окно автоматически закроется через <span id='counter'>" + closeTimes + "</span> сек.</p>"
        },
        en: {
            error: "<h1>Error</h1><br>" +
            "<p>An error occurred while processing the payment. Please try again later.</p>",
            success: "<h1>Thanks for your purchase!</h1><br>" +
            "<p>This window will automatically close in <span id='counter'>" + closeTimes + "</span> sec.</p>"
        },
        de: {
            error: "<h1>Fehler</h1><br>" +
            "<p>Im Zuge der Bearbeitung Ihrer Zahlung ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.</p>",
            success: "<h1>Vielen Dank für Ihren Kauf! </h1><br>" +
            "<p>Dieses Fenster wird in <span id='counter'>" + closeTimes + "</span> automatisch geschlossen.</p>"
        },
        pl: {
            error: "<h1>Błąd</h1><br>" +
            "<p>Wystąpił błąd podczas przetwarzania płatności. Proszę spróbować ponownie później.</p>",
            success: "<h1>Dziękujemy za zakup!</h1><br>" +
            "<p>Okno zostanie automatycznie zamknięte za <span id='counter'>" + closeTimes + "</span> s.</p>"
        },
        br: {
            error: "<h1>Erro</h1><br>" +
            "<p>Um erro ocorreu enquanto processávamos o seu pagamento. Por favor, tente novamente mais tarde.</p>",
            success: "<h1>Obrigado pela sua compra!</h1><br>" +
            "<p>Esta janela se fechará automaticamente em <span id='counter'>" + closeTimes + "</span> seg.</p>"
        },
        es: {
            error: "<h1>Error</h1><br>" +
            "<p>An error occurred while processing the payment. Please try again later.</p>",
            success: "<h1>Thanks for your purchase!</h1><br>" +
            "<p>This window will automatically close in <span id='counter'>" + closeTimes + "</span> sec.</p>"
        }
    };
    formContainer.removeClass('loader');
    formContainer.html(messages[lang][type]);
}

function obtainToken() {
    var data = {
        action: "token",
        amount: amount,
        currency: currency,
        order: order,
        signature: signature
    };
    jQuery.getJSON("/payment_braintree_process_" + cluster + "/", data)
        .done(function (result) {
            if (!result || result.code != "TOKEN") {
                displayMessage('error');
            } else {
                // Create a client.
                braintree.client.create({
                    authorization: result.message
                }, function (clientErr, clientInstance) {

                    if (clientErr) {
                        displayMessage('error');
                        return;
                    }

                    braintree.paypalCheckout.create({
                        client: clientInstance
                    }, function (paypalCheckoutErr, paypalCheckoutInstance) {

                        if (paypalCheckoutErr) {
                            displayMessage('error');
                            return;
                        }
                        paypal.Button.render({
                            env: getEnvironment(),

                            payment: function () {
                                return paypalCheckoutInstance.createPayment({
                                    flow: 'checkout',
                                    amount: amount,
                                    currency: currency
                                });
                            },
                            onAuthorize: function (data, actions) {
                                return paypalCheckoutInstance.tokenizePayment(data)
                                    .then(function (payload) {
                                        callbackFunction(payload.nonce);
                                    });
                            },

                            onCancel: function (data) {
                                displayMessage('error');
                            },

                            onError: function (err) {
                                displayMessage('error');
                            }
                        }, '#paypal-button').then(function () {
                            formContainer.removeClass('loader');
                            checkoutForm.css({opacity: 1});
                        });

                    });

                });
            }
        })
        .fail(function () {
            displayMessage('error');
        });
}

var callbackFunction = function (nonce) {
    var data = {
        action: "payment",
        paymentNonce: nonce,
        amount: amount,
        currency: currency,
        order: order,
        signature: signature,
        type: "paypal"
    };
    jQuery.getJSON("/payment_braintree_process_" + cluster + "/", data)
        .done(function (result) {
            if (!result || result.code == "ERROR") {
                displayMessage('error');
            } else if (result.code == "OK") {
                displayMessage('success');
                finalCountdown();
            } else {
                displayMessage('error');
            }
        })
        .fail(function () {
            displayMessage('error');
        });
};

function getEnvironment() {
    if (get["production"] == "true") {
        return "production";
    }

    return "sandbox";
}

jQuery(function () {
    checkoutForm = jQuery('#checkout');
    formContainer = jQuery('#container');
    obtainToken();
});