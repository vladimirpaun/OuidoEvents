import { initLayout } from './components/layout.js';

function getPageKey() {
  return document.body.dataset.page || 'home';
}

function initializePageModule(pageKey) {
  switch (pageKey) {
    case 'home':
      import('./pages/homePage.js').then(module => module.initHomePage());
      break;
    case 'locations':
      import('./pages/locationsPage.js').then(module => module.initLocationsPage());
      break;
    case 'venue-details':
      import('./pages/venueDetailsPage.js').then(module => module.initVenueDetailsPage());
      break;
    default:
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const pageKey = getPageKey();
  initLayout({ pageKey });

  initializePageModule(pageKey);
});
