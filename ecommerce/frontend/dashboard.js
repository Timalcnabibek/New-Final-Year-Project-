document.addEventListener('DOMContentLoaded', function() {
    // Fetch new arrivals (all products)
    fetchProducts('/api/products', 'newProducts', 4);
    
    // Fetch trending products
    fetchProducts('/api/products/trending', 'trendingProducts', 4);
});

// Global store for products
const productStore = {
    newProducts: [],
    trendingProducts: []
};

// Function to fetch products from API
async function fetchProducts(endpoint, containerId, limit = 4) {
    try {
        document.getElementById(containerId).innerHTML = '<div class="loading">Loading products...</div>';
        console.log(`Fetching from endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint);
        console.log(`Response status: ${response.status}`);

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        console.log(`Raw API response:`, data);
        
        // Check if the response structure matches what your code expects
        const products = Array.isArray(data) ? data : (data.products || []);
        console.log(`Processed products array:`, products);

        productStore[containerId] = products;
        
        if (products && products.length > 0) {
            displayProducts(products.slice(0, limit), containerId);
            if (products.length > limit) addShowMoreButton(containerId);
        } else {
            document.getElementById(containerId).innerHTML = '<p>No products found.</p>';
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        document.getElementById(containerId).innerHTML = 
            `<div class="error">Failed to load products. Please try again later. (${error.message})</div>`;
    }
}

// Function to add "Show More" button
function addShowMoreButton(containerId) {
    const container = document.getElementById(containerId);
    const showMoreButton = document.createElement('div');
    showMoreButton.className = 'show-more-container';
    showMoreButton.innerHTML = `
        <button class="show-more-btn" id="showMore-${containerId}">
            View All <i class="fas fa-chevron-down"></i>
        </button>
    `;
    container.parentNode.insertBefore(showMoreButton, container.nextSibling);

    document.getElementById(`showMore-${containerId}`).addEventListener('click', function () {
        window.location.href = 'viewall.html';
    });
    
}

// ✅ Function to display products correctly
function displayProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    console.log("Products received:", products);

    let html = '';

    products.forEach(product => {
        console.log("Processing product:", product);

        // Default fallback image
        let imageUrl = "https://lavishcharm.store/cache/medium/product/19/ZW8LSkrgvtS9Fg2Vg29LHr1jfbhsg5UoR8sGETCw.webp"; 

        // Handle different image formats that might exist in the database
        if (product.images && product.images.length > 0) {
            const firstImage = product.images[0];
            
            if (typeof firstImage === 'string') {
                // If image is directly a string URL
                imageUrl = firstImage;
            } else if (typeof firstImage === 'object') {
                // If image is an object with url property
                if (firstImage.url) {
                    imageUrl = firstImage.url;
                }
            }
        }

        const title = product.name || 'Product';
        const category = product.category || 'Uncategorized';
        const price = product.price ? `$${product.price.toFixed(2)}` : '$0.00';
        const originalPrice = product.discount_price ? 
            `$${product.discount_price.toFixed(2)}` : '';
        const badge = product.featured ? 'Featured' : (product.trending ? 'Trending' : '');

        html += `
        <div class="product-card" data-id="${product._id}">
            ${badge ? `<div class="product-badge">${badge}</div>` : ''}
            <div class="product-image">
                <img src="${imageUrl}" alt="${title}" 
                     onerror="this.onerror=null; this.src='https://lavishcharm.store/cache/medium/product/19/ZW8LSkrgvtS9Fg2Vg29LHr1jfbhsg5UoR8sGETCw.webp'">
            </div>
            <div class="product-info">
                <div class="product-category">${category}</div>
                <h3 class="product-title">${title}</h3>
                <div class="product-price">
                    <span class="current-price">${price}</span>
                    ${originalPrice ? `<span class="original-price">${originalPrice}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart" data-id="${product._id}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button class="wishlist-btn" data-id="${product._id}">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
    attachCartEventListeners(); // Make sure this function exists
}

// Make sure to also update your event listeners function
function attachCartEventListeners() {
    // Add-to-cart buttons
    document.querySelectorAll(".add-to-cart").forEach((button) => {
        button.onclick = function () {
            const productCard = this.closest(".product-card");
            if (!productCard) return;

            const productId = productCard.dataset.id;
            const productName = productCard.querySelector(".product-title").innerText;

            addToCart(productId, productName);
        };
    });

    // Wishlist buttons
    document.querySelectorAll(".wishlist-btn").forEach((button) => {
        button.addEventListener("click", function () {
            this.innerHTML = '<i class="fas fa-heart"></i>';
            this.style.backgroundColor = "#fee2e2";
            this.style.color = "#ef4444";
            alert("❤️ Product added to wishlist!");
        });
    });

    // ✅ Product card click → Redirect to payment page with query param
    document.querySelectorAll(".product-card").forEach((card) => {
  card.addEventListener("click", function (e) {
    // Avoid triggering when Add to Cart or Wishlist buttons are clicked
    if (e.target.closest(".add-to-cart") || e.target.closest(".wishlist-btn")) {
      return;
    }

    const productId = this.getAttribute("data-id");

    // 🔍 Search in both newProducts and trendingProducts
    const allProducts = [...productStore.newProducts, ...productStore.trendingProducts];
    const selectedProduct = allProducts.find(p => p._id === productId);

    if (selectedProduct) {
        
      const category = selectedProduct.category || "Uncategorized";
      sessionStorage.setItem("selectedProduct", JSON.stringify(selectedProduct));
      window.location.href = `products_description.html?productId=${productId}&category=${encodeURIComponent(category)}`;
    } else {
      console.warn("⚠️ Product not found in store for ID:", productId);
      window.location.href = `products_description.html?productId=${productId}`;
    }
  });
});

}


// ✅ Send cart data to backend
async function addToCart(productId, productName) {
    const customerId = localStorage.getItem("customerId");

    if (!customerId) {
        alert("❌ User not logged in! Redirecting to login page.");
        window.location.href = "login.html";
        return;
    }

    const requestData = { customerId, productId, quantity: 1 };

    try {
        const response = await fetch("http://localhost:3000/api/cart/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        const result = await response.json();
        console.log("Cart Response:", result); // ✅ Debugging
        if (response.ok) {
            alert(`✅ ${productName} added to cart!`);
        } else {
            alert(`❌ Failed to add to cart: ${result.message}`);
        }
    } catch (error) {
        console.error("❌ Error adding to cart:", error);
        alert("❌ Server error. Please try again later.");
    }
}

// ✅ Attach event listeners to buttons
function addProductEventListeners() {
    document.querySelectorAll(".add-to-cart").forEach(button => {
        button.addEventListener("click", function() {
            const productCard = this.closest(".product-card");
            if (!productCard) return;

            const productId = productCard.getAttribute("data-id");
            const productName = productCard.querySelector(".product-title").innerText;
            console.log(`🛒 Adding to cart: ${productId} - ${productName}`);
            
            addToCart(productId, productName);
        });
    });

    document.querySelectorAll(".wishlist-btn").forEach(button => {
        button.addEventListener("click", function() {
            this.innerHTML = '<i class="fas fa-heart"></i>';
            this.style.backgroundColor = "#fee2e2";
            this.style.color = "#ef4444";
            alert("❤️ Product added to wishlist!");
        });
    });
}
