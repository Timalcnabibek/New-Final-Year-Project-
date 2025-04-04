// script.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("Dashboard Loaded");
    
    const searchInput = document.querySelector(".search-bar input");
    const searchButton = document.querySelector(".search-bar button");
    
    searchButton.addEventListener("click", () => {
        alert("Searching for: " + searchInput.value);
    });
    
    const cartIcon = document.querySelector(".icons span");
    cartIcon.addEventListener("click", () => {
        alert("Cart Clicked");
    });
});
