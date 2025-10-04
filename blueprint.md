# Arhitectură refactorizată

```text
OuidoEvents/
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── base/
│   │   │   ├── _reset.css
│   │   │   ├── _typography.css
│   │   │   └── _variables.css
│   │   ├── layout/
│   │   │   └── _layout.css
│   │   ├── components/
│   │   │   ├── _badges.css
│   │   │   ├── _buttons.css
│   │   │   ├── _cards.css
│   │   │   ├── _footer.css
│   │   │   ├── _forms.css
│   │   │   └── _header.css
│   │   └── pages/
│   │       ├── _auth.css
│   │       ├── _contact.css
│   │       ├── _home.css
│   │       ├── _locations.css
│   │       └── _venue-details.css
│   └── js/
│       ├── main.js
│       ├── components/
│       │   └── layout.js
│       └── pages/
│           ├── homePage.js
│           ├── locationsPage.js
│           └── venueDetailsPage.js
├── contact.html
├── create-account.html
├── index.html
├── locations.html
├── login.html
├── readme.md
├── blueprint.md
└── venue-details.html
```

## Strategie de organizare

- **`assets/css/style.css`**: punct unic de intrare pentru stiluri. Folosește `@import` pentru a încărca modulele tematice, permițând browserelor să gestioneze eficient caching-ul și separarea responsabilităților.
- **`assets/css/base/`**: conține fundamentele vizuale ale proiectului — variabile globale, reset și reguli tipografice — pentru a asigura consistență pe toate paginile.
- **`assets/css/layout/`**: definește pattern-uri de layout reutilizabile (grid-uri, secțiuni, utilitare de spațiere) care pot fi compuse rapid în pagini diferite.
- **`assets/css/components/`**: găzduiește stiluri pentru componente partajate (header, footer, carduri, formulare, butoane, badge-uri). Astfel, modificările la un element comun se fac într-un singur loc.
- **`assets/css/pages/`**: izolează stilurile specifice fiecărei pagini (acasă, locații, contact, autentificare, detalii locație) pentru a evita scurgerile de stil și pentru a reduce greutatea încărcată pe paginile care nu au nevoie de ele.
- **`assets/js/main.js`**: punctul de intrare JavaScript care detectează pagina curentă, montează layout-ul partajat și încarcă la cerere modulele specifice.
- **`assets/js/components/layout.js`**: construiește și injectează dinamic header-ul și footer-ul, gestionează meniul mobil, switch-ul de gradient și starea link-urilor active, oferind un singur loc de întreținere pentru navigație.
- **`assets/js/pages/`**: module dedicate logicii fiecărei pagini (slider testimoniale, motor de filtrare locații, galerie și favorite în pagina de detalii), încărcate doar acolo unde sunt necesare pentru performanță optimă.
- **Fișierele HTML**: curățate de CSS/JS inline și legate exclusiv de resurse externe, conțin doar markup semantic și atribute `data-page` pentru bootstrap-ul modular.

Această structură separă clar responsabilitățile, elimină duplicarea de cod și facilitează extinderea ulterioară (adăugarea de noi componente sau pagini) fără afectarea secțiunilor existente.
