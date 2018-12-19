(function (window) {
  'use strict';

  //Push notification button
  var fabPushElement = $('#push');
  if (!'serviceWorker' in navigator || Notification.permission === 'denied' || !('PushManager' in window)) {
    fabPushElement.attr('disabled', true)
    return;
  }

  //To check `push notification` is supported or not
  function isPushSupported() {

    //Get `push notification` subscription
    //If `serviceWorker` is registered and ready
    navigator.serviceWorker.ready
      .then(function (registration) {
        registration.pushManager.getSubscription()
          .then(function (subscription) {
            //If already access granted, enable push button status
            if (subscription) {
              changePushStatus(true);
            }
            else {
              changePushStatus(false);
            }
          })
          .catch(function (error) {
            console.error('Error occurred while enabling push ', error);
          });
      });
  }

  // Ask User if he/she wants to subscribe to push notifications and then 
  // ..subscribe and send push notification
  function subscribePush() {
    navigator.serviceWorker.ready.then(function (registration) {
      if (!registration.pushManager) {
        return false;
      }

      //To subscribe `push notification` from push manager
      registration.pushManager.subscribe({
        userVisibleOnly: true //Always show notification when received
      })
        .then(function (subscription) {
          toast('Subscribed successfully.');
          console.info('Push notification subscribed.');
          console.log(subscription);
          saveSubscriptionID(subscription);
          changePushStatus(true);
        })
        .catch(function (error) {
          changePushStatus(false);
          console.error('Push notification subscription error: ', error);
        });
    })
  }

  // Unsubscribe the user from push notifications
  function unsubscribePush() {
    navigator.serviceWorker.ready
      .then(function (registration) {
        //Get `push subscription`
        registration.pushManager.getSubscription()
          .then(function (subscription) {
            //If no `push subscription`, then return
            if (!subscription) {
              return;
            }

            //Unsubscribe `push notification`
            subscription.unsubscribe()
              .then(function () {
                toast('Unsubscribed successfully.');
                console.info('Push notification unsubscribed.');
                console.log(subscription);
                deleteSubscriptionID(subscription);
                changePushStatus(false);
              })
              .catch(function (error) {
                console.error(error);
              });
          })
          .catch(function (error) {
            console.error('Failed to unsubscribe push notification.');
          });
      })
  }

  //To change status
  function changePushStatus(status) {
    fabPushElement.toggleClass('active', status)
  }

  //Click event for subscribe push
  fabPushElement.on('click', function () {
    var isSubscribed = (fabPushElement.is('.active'));
    if (isSubscribed) {
      unsubscribePush();
    }
    else {
      subscribePush();
    }
  });

  function saveSubscriptionID(subscription) {
    var subscription_id = subscription.endpoint.split('gcm/send/')[1];

    console.log("Subscription ID", subscription_id);

    fetch('notify?id=' + subscription_id);
  }

  function deleteSubscriptionID(subscription) {
    var subscription_id = susbcription.endpoint.split('gcm/send/')[1];
    fetch('/notify?del=1&id=' + subscription_id);
  }

  isPushSupported(); //Check for push notification support
})(window);
