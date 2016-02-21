'use strict';

if (window.DeviceOrientationEvent) {
  window.addEventListener('touchstart', function (e) {
    e.preventDefault();
  });

  document.getElementById('playButton').addEventListener('touchend', function (e) {
    var orientationString;

    if (e.changedTouches.length === 1) {
      orientationString = 'Portrait';

      if (window.orientation === 90 || window.orientation === -90) {
        orientationString = 'Landscape';
      }

      if (confirm('You are starting the game in:\n\'' + orientationString + ' Mode\'\n\nContinue?')) {
        window.location = 'game.html';
        return false;
      }
    }
  });

  document.getElementById('scoreButton').addEventListener('touchend', function (e) {
    if (e.changedTouches.length === 1) {
      window.location = 'scores.html';
      return false;
    }
  });

  document.getElementById('quitButton').addEventListener('touchend', function (e) {
    if (e.changedTouches.length === 1) {
      if (confirm('Are you sure you wish to quit?')) {
        window.close();
        return false;
      }
    }
  });

  if (window.localStorage) {
    if (localStorage.length > 0) {
      // High scores option is hidden unless scores exist on the device
      document.getElementById('scoreButton').style.display = 'inline-block';
    }
  }
}
