(function (window) {
  'use strict';

  //Push notification button
  var fabPushElement = $('#push').on('click', function () {
    var isSubscribed = (fabPushElement.is(':checked'));
    if (isSubscribed) {
      // Unsubscribe the user from push notifications
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
                  console.info('Push notification unsubscribed.');
                  console.log(subscription);
                  var subscription_id = subscription.endpoint.split('gcm/send/')[1];
                  fetch('/notify?del=1&id=' + subscription_id);
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
    else {
      // Ask User if he/she wants to subscribe to push notifications and then 
      // ..subscribe and send push notification
      navigator.serviceWorker.ready.then(function (registration) {
        if (!registration.pushManager) {
          return false;
        }

        //To subscribe `push notification` from push manager
        registration.pushManager.subscribe({
          userVisibleOnly: true //Always show notification when received
        })
          .then(function (subscription) {
            console.info('Push notification subscribed.');
            console.log(subscription);
            var subscription_id = subscription.endpoint.split('gcm/send/')[1];

            console.log("Subscription ID", subscription_id);

            fetch('notify?id=' + subscription_id);
            changePushStatus(true);
          })
          .catch(function (error) {
            changePushStatus(false);
            console.error('Push notification subscription error: ', error);
          });
      })

    }
  });
  if (!('serviceWorker' in navigator) || Notification.permission === 'denied' || !('PushManager' in window)) {
    fabPushElement.attr('disabled', true)
    return;
  }

  //To change status
  function changePushStatus(status) {
    fabPushElement[0].checked = status
  }

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
})(window);
