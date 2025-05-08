// Global store for products
const productStore = {
    newProducts: [],
    trendingProducts: []
};

// Global wishlist cache
let userWishlist = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    fetchCartCount();
    
    // Fetch user's wishlist first to know which products are in it
    fetchUserWishlist().then(() => {
        // Fetch products after wishlist data is loaded
        fetchProducts('/api/products', 'newProducts', 8);
        fetchProducts('/api/products/trending', 'trendingProducts', 6);
    });
    
    // Initialize slider if it exists
    initializeSlider();
    
    // Initialize profile dropdown if it exists
    initializeProfileDropdown();
});

// Fetch user's wishlist to determine which products are already in it
async function fetchUserWishlist() {
    const customerId = localStorage.getItem("customerId");
    
    if (!customerId) {
        console.log("User not logged in, skipping wishlist fetch");
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/api/wishlist/${customerId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Wishlist data:", data);
        
        // Extract product IDs based on the API's response structure
        if (Array.isArray(data)) {
            userWishlist = data.map(item => item.productId || item._id);
        } else if (data.wishlist && Array.isArray(data.wishlist)) {
            userWishlist = data.wishlist.map(item => item.productId || item._id);
        } else if (data.items && Array.isArray(data.items)) {
            userWishlist = data.items.map(item => item.productId || item._id);
        }
        
        console.log("User's wishlist items:", userWishlist);
    } catch (error) {
        console.error("Error fetching wishlist:", error);
    }
}

// Function to check if a product is in the user's wishlist
function isInWishlist(productId) {
    return userWishlist.includes(productId);
}

// Function to fetch products from API
async function fetchProducts(endpoint, containerId, limit = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Loading products...</div>';
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
            container.innerHTML = '<p>No products found.</p>';
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        container.innerHTML = 
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

// Function to display products correctly
function displayProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    console.log("Products received:", products);

    let html = '';

    products.forEach(product => {
        console.log("Processing product:", product);

        // Default fallback image
        let imageUrl = "./image/default.jpg"; 

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

        // Check if this product is in the user's wishlist
        const inWishlist = isInWishlist(product._id);
        const heartIcon = inWishlist ? 
            '<i class="fas fa-heart"></i>' : 
            '<i class="far fa-heart"></i>';
        const wishlistBtnStyle = inWishlist ? 
            'style="background-color: #fee2e2; color: #ef4444;"' : 
            '';

        html += `
        <div class="product-card" data-id="${product._id}">
            ${badge ? `<div class="product-badge">${badge}</div>` : ''}
            <div class="product-image">
                <img src="${imageUrl}" alt="${title}" 
                     onerror="this.onerror=null; this.src='./image/default.jpg'">
            </div>
            <div class="product-info">
                <div class="product-category">${category}</div>
                <h3 class="product-title">${title}</h3>
                <div class="product-price">
                    <span class="current-price">${price}</span>
                    ${originalPrice ? `<span class="original-price">${originalPrice}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button class="wishlist-btn" ${wishlistBtnStyle}>
                        ${heartIcon}
                    </button>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
    attachProductEventListeners(); // Attach all product-related event listeners
}

// Fetch and update cart count
async function fetchCartCount() {
    const customerId = localStorage.getItem("customerId");
    const cartCountElement = document.getElementById("cartCount");

    if (!customerId || !cartCountElement) return;

    try {
        const res = await fetch(`http://localhost:3000/api/cart/${customerId}`);
        const data = await res.json();

        let itemCount = 0;

        if (Array.isArray(data)) {
            itemCount = data.length; // count distinct products
        } else if (data.cart && Array.isArray(data.cart)) {
            itemCount = data.cart.length;
        } else if (data.items && Array.isArray(data.items)) {
            itemCount = data.items.length;
        } else {
            cartCountElement.textContent = "0";
            return;
        }

        cartCountElement.textContent = itemCount;
    } catch (err) {
        console.error("❌ Error fetching cart count:", err);
        cartCountElement.textContent = "0";
    }
}

// Add to cart functionality
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
        console.log("Cart Response:", result); // Debugging
        
        if (response.ok) {
            alert(`✅ ${productName} added to cart!`);
            fetchCartCount(); // Live update the cart count
        } else {
            alert(`❌ Failed to add to cart: ${result.message || "Unknown error"}`);
        }
    } catch (error) {
        console.error("❌ Error adding to cart:", error);
        alert("❌ Server error. Please try again later.");
    }
}

// Add to wishlist functionality
async function addToWishlist(productId, productName) {
    const customerId = localStorage.getItem("customerId");
    
    if (!customerId) {
        alert("❌ User not logged in! Redirecting.");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/api/wishlist/addwish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, productId })
        });

        const result = await res.json();
        
        if (res.ok) {
            alert(`❤️ ${productName} added to wishlist!`);
            
            // Add to local wishlist cache for persistent state
            if (!userWishlist.includes(productId)) {
                userWishlist.push(productId);
            }
            
            return true;
        } else {
            alert("❌ " + (result.message || "Failed to add to wishlist"));
            return false;
        }
    } catch (err) {
        console.error("❌ Add to wishlist error:", err);
        alert("❌ Server error. Try again later.");
        return false;
    }
}

// Remove from wishlist functionality
async function removeFromWishlist(productId, productName) {
    const customerId = localStorage.getItem("customerId");
    
    if (!customerId) {
        alert("❌ User not logged in! Redirecting.");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/api/wishlist/removewish", {
            method: "POST", // or DELETE depending on your API
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, productId })
        });

        const result = await res.json();
        
        if (res.ok) {
            alert(`💔 ${productName} removed from wishlist!`);
            
            // Remove from local wishlist cache
            userWishlist = userWishlist.filter(id => id !== productId);
            
            return true;
        } else {
            alert("❌ " + (result.message || "Failed to remove from wishlist"));
            return false;
        }
    } catch (err) {
        console.error("❌ Remove from wishlist error:", err);
        alert("❌ Server error. Try again later.");
        return false;
    }
}

// Combined function to attach all product-related event listeners
function attachProductEventListeners() {
    // Add to cart buttons
    document.querySelectorAll(".add-to-cart").forEach(button => {
        button.addEventListener("click", function(e) {
            e.stopPropagation(); // Prevent card click event
            
            const card = this.closest(".product-card");
            const productId = card?.getAttribute("data-id");
            const productName = card?.querySelector(".product-title")?.innerText || "Product";
            
            if (productId) {
                addToCart(productId, productName);
            }
        });
    });

    // Wishlist buttons
    document.querySelectorAll(".wishlist-btn").forEach(button => {
        button.addEventListener("click", function(e) {
            e.stopPropagation(); // Prevent card click event
            
            const card = this.closest(".product-card");
            const productId = card?.getAttribute("data-id");
            const productName = card?.querySelector(".product-title")?.innerText || "Product";
            
            if (!productId) return;

            const isAlreadyInWishlist = this.querySelector("i").classList.contains("fas");
            
            if (isAlreadyInWishlist) {
                // Remove from wishlist
                removeFromWishlist(productId, productName).then(success => {
                    if (success) {
                        // Update button visual state to "not in wishlist"
                        this.innerHTML = '<i class="far fa-heart"></i>';
                        this.style.backgroundColor = "";
                        this.style.color = "";
                    }
                });
            } else {
                // Add to wishlist
                addToWishlist(productId, productName).then(success => {
                    if (success) {
                        // Update button visual state to "in wishlist"
                        this.innerHTML = '<i class="fas fa-heart"></i>';
                        this.style.backgroundColor = "#fee2e2";
                        this.style.color = "#ef4444";
                    }
                });
            }
        });
    });

    // Product card click (product details page navigation)
    document.querySelectorAll(".product-card").forEach(card => {
        card.addEventListener("click", function(e) {
            // Avoid triggering when Add to Cart or Wishlist buttons are clicked
            if (e.target.closest(".add-to-cart") || e.target.closest(".wishlist-btn")) {
                return;
            }

            const productId = this.getAttribute("data-id");

            // Search in both newProducts and trendingProducts
            const allProducts = [...productStore.newProducts, ...productStore.trendingProducts];
            const selectedProduct = allProducts.find(p => p._id === productId || p._id.toString() === productId);
            console.log("Selected productId:", productId);
            console.log("Searching in allProducts:", allProducts);

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

// Initialize slider functionality
function initializeSlider() {
    const slides = document.querySelectorAll(".slide");
    if (slides.length === 0) return;
    
    let slideIndex = 0;
    
    function showSlides() {
        slides.forEach(slide => slide.classList.remove("active"));
        slideIndex++;
        if (slideIndex > slides.length) slideIndex = 1;
        slides[slideIndex - 1].classList.add("active");
        setTimeout(showSlides, 5000); // Change slide every 5 seconds
    }
    
    // Define change slide function
    function changeSlide(n) {
        slideIndex += n - 1;
        showSlides();
    }
    
    // Handle prev/next buttons if they exist
    const prevButton = document.querySelector(".prev");
    const nextButton = document.querySelector(".next");
    
    if (prevButton) {
        prevButton.addEventListener("click", () => changeSlide(-1));
    }
    
    if (nextButton) {
        nextButton.addEventListener("click", () => changeSlide(1));
    }
    
    // Start the slider
    showSlides();
    
    // Expose change slide function to window for inline onclick handlers
    window.changeSlide = changeSlide;
}

// Initialize profile dropdown functionality
function initializeProfileDropdown() {
    // Initialize dropdown toggle for inline handlers
    window.toggleDropdown = function(event) {
        event.preventDefault();
        const dropdown = document.getElementById("profileDropdown");
        if (dropdown) {
            dropdown.classList.toggle("show");
        }
    };
    
    // Add direct event listener to profile icon if it exists
    const profileIcon = document.getElementById("profileIcon");
    if (profileIcon) {
        profileIcon.addEventListener("click", function(event) {
            event.preventDefault();
            const dropdown = document.getElementById("profileDropdown");
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener("click", function(event) {
        // Handle both toggle cases
        if (!event.target.matches('.profile-icon')) {
            // For class-based dropdown
            const dropdowns = document.getElementsByClassName("dropdown-menu");
            for (let i = 0; i < dropdowns.length; i++) {
                const openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
            
            // For style-based dropdown
            const styledDropdown = document.getElementById("profileDropdown");
            const icon = document.getElementById("profileIcon");
            if (styledDropdown && icon && !styledDropdown.contains(event.target) && !icon.contains(event.target)) {
                styledDropdown.style.display = "none";
            }
        }
    });
}

// Enhanced logout functionality using SweetAlert if available
function logout(event) {
    // Prevent <a href="#"> from causing a page jump
    if (event) event.preventDefault();
    
    // Check if SweetAlert is available
    if (typeof Swal !== 'undefined') {
        // Use SweetAlert for confirmation
        Swal.fire({
            title: "Are you sure?",
            text: "You will be logged out of your account.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, log me out",
            cancelButtonText: "Cancel"
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem("customerId");
                localStorage.removeItem("token");

                Swal.fire({
                    title: "Logged Out!",
                    text: "You have been successfully logged out.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 2000);
            }
        });
    } else {
        // Fallback to regular confirm if SweetAlert is not available
        if (confirm("Are you sure you want to log out?")) {
            localStorage.removeItem("customerId");
            localStorage.removeItem("token");
            window.location.href = "login.html";
        }
    }
}

// Expose necessary functions to global scope for inline event handlers
window.addToCart = addToCart;
window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;
window.logout = logout;