const locations = [
  "București", "Cluj-Napoca", "Timișoara", "Iași", "Constanța", "Craiova", "Brașov", "Galați", "Ploiești", "Oradea", "Brăila", "Arad", "Pitești", "Sibiu", "Bacău", "Târgu Mureș", "Baia Mare", "Buzău", "Botoșani", "Satu Mare", "Râmnicu Vâlcea", "Suceava", "Piatra Neamț", "Drobeta-Turnu Severin", "Focșani", "Târgu Jiu", "Tulcea", "Târgoviște", "Reșița", "Slatina", "Hunedoara", "Vaslui", "Bârlad", "Roman", "Giurgiu", "Alba Iulia", "Zalău", "Sfântu Gheorghe", "Turda", "Mediaș", "Slobozia", "Călărași", "Alexandria", "Miercurea Ciuc", "Deva", "Lugoj", "Mangalia", "Sinaia", "Predeal", "Bușteni", "Mamaia",
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov", "Brăila", "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea", "Vrancea"
];
// Remove duplicates
const romanianLocations = [...new Set(locations)];

function normalizeString(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function initAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  let suggestionsWrapper;

  input.addEventListener('input', function() {
    const value = this.value;
    closeAllLists();
    if (!value || value.length < 3) {
      return false;
    }

    suggestionsWrapper = document.createElement("div");
    suggestionsWrapper.setAttribute("class", "autocomplete-items");
    
    // Append to body and position it absolutely relative to the input
    document.body.appendChild(suggestionsWrapper);
    const rect = this.getBoundingClientRect();
    suggestionsWrapper.style.left = rect.left + 'px';
    suggestionsWrapper.style.top = rect.bottom + 5 + 'px';
    suggestionsWrapper.style.width = rect.width + 'px';
    
    const normalizedValue = normalizeString(value).toUpperCase();

    const filteredLocations = romanianLocations.filter(loc => 
      normalizeString(loc).toUpperCase().startsWith(normalizedValue)
    );

    filteredLocations.forEach(city => {
      const suggestionItem = document.createElement("div");
      const matchIndex = normalizeString(city).toUpperCase().indexOf(normalizedValue);
      suggestionItem.innerHTML = "<strong>" + city.substr(matchIndex, value.length) + "</strong>" + city.substr(matchIndex + value.length);
      suggestionItem.innerHTML += "<input type='hidden' value='" + city + "'>";
      
      suggestionItem.addEventListener("click", function(e) {
          input.value = this.getElementsByTagName("input")[0].value;
          closeAllLists();
      });
      suggestionsWrapper.appendChild(suggestionItem);
    });
  });

  function closeAllLists(elmnt) {
    const items = document.getElementsByClassName("autocomplete-items");
    for (let i = 0; i < items.length; i++) {
      if (elmnt != items[i] && elmnt != input) {
        items[i].remove();
      }
    }
  }

  document.addEventListener("click", function (e) {
      closeAllLists(e.target);
  });
}