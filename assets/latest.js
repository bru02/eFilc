(function () {
  'use strict';

  var app = {
    spinner: document.querySelector('.loader')
  };

  var container = document.querySelector('.container');

  document.getElementById('butRefresh').addEventListener('click', function () {
    // Get fresh, updated data from Github whenever you are clicked
    toast('Fetching latest data...');
    fetchCommits();
    console.log("Getting fresh data!!!");
  });

  function display(response) {
    var commitData = {};

    for (var i = 0; i < posData.length; i++) {
      commitData[posData[i]] = {
        message: response[i].commit.message,
        author: response[i].commit.author.name,
        time: response[i].commit.author.date,
        link: response[i].html_url
      };
    }


    for (var i = 0; i < commitContainer.length; i++) {

      container.querySelector("" + commitContainer[i]).innerHTML =
        "<h4> Message: " + response[i].commit.message + "</h4>" +
        "<h4> Author: " + response[i].commit.author.name + "</h4>" +
        "<h4> Time committed: " + (new Date(response[i].commit.author.date)).toUTCString() + "</h4>" +
        "<h4>" + "<a href='" + response[i].html_url + "'>Click me to see more!</a>" + "</h4>";

    }

    app.spinner.setAttribute('hidden', true); // hide spinner
  }
  // Get Commit Data from Github API
  function fetchCommits() {
    var url = 'https://api.github.com/repos/unicodeveloper/resources-i-like/commits';

    app.spinner.setAttribute('visible', true);
    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
      caches.match(url).then(function (response) {
        if (response) {
          response.json().then(function updateFromCache(json) {

            display(json);
          });
        }
      });
    }
    if (navigator.onLine) {
      fetch(url)
        .then(function (fetchResponse) {
          return fetchResponse.json();
        })
        .then(function (response) {
          console.log("Response from Github", response);
          display(response);


        })
        .catch(function (error) {
          console.error(error);
        });
    }

  };

  fetchCommits();
})();