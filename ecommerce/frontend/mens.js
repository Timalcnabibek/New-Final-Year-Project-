// Global function to update cart count
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cartItems")) || [];
    // Count total quantity across all items
    const count = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
    // Update all cart count elements on the page
    const cartCountElements = document.querySelectorAll(".cart-count");
    cartCountElements.forEach(element => {
        element.textContent = count;
    });
    console.log("Cart count updated to:", count);
}

// Global function to show notifications
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to the DOM
    document.body.appendChild(notification);
    
    // Add styles
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '4px';
    notification.style.color = 'white';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    
    if (type === 'success') {
        notification.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    }
    
    // Animate notification
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Global function to fetch cart and update localStorage
async function fetchCartAndUpdateLocalStorage(customerId) {
    try {
        const response = await fetch(`http://localhost:3000/api/cart/${customerId}`);
        const result = await response.json();

        let cartItems = [];

        if (Array.isArray(result)) {
            cartItems = result;
        } else if (result.items) {
            cartItems = result.items;
        } else if (result.cart) {
            cartItems = result.cart;
        }

        localStorage.setItem("cartItems", JSON.stringify(cartItems));
        console.log("🛒 Updated cartItems in localStorage:", cartItems);
        
        // Call the global updateCartCount function here
        updateCartCount();
    } catch (error) {
        console.error("❌ Error updating localStorage cart:", error);
    }
}

// Global function to add item to cart
async function addToCart(productId) {
    const customerId = localStorage.getItem("customerId");

    if (!customerId) {
        alert("❌ User not logged in! Redirecting to login page.");
        window.location.href = "login.html";
        return;
    }

    const requestData = {
        customerId,
        productId,
        quantity: 1
    };

    try {
        const response = await fetch("http://localhost:3000/api/cart/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (response.ok) {
            showNotification("✅ Product added to cart!");
            await fetchCartAndUpdateLocalStorage(customerId);
            // Cart count will be updated by fetchCartAndUpdateLocalStorage
        } else {
            showNotification(`❌ Failed to add: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error("❌ Error adding to cart:", error);
        showNotification("❌ Server error. Try again later.", 'error');
    }
}

// Main document ready function
document.addEventListener('DOMContentLoaded', function() {
    // Initialize cart count
    updateCartCount();
    
    // Filter products based on category
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            const category = button.getAttribute('data-category');
            
            // Show all products if 'all' is selected, otherwise filter
            productCards.forEach(card => {
                if (category === 'all' || card.getAttribute('data-category') === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Product action buttons functionality
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling
            
            const icon = button.querySelector('i');
            const productId = button.getAttribute('data-id');
            
            // Add to wishlist
            if (icon.classList.contains('fa-heart')) {
                icon.classList.toggle('fas');
                icon.classList.toggle('far');
                showNotification('Product added to wishlist!');
            }
            
            // Add to cart
            if (icon.classList.contains('fa-shopping-cart')) {
                if (productId) {
                    addToCart(productId);
                } else {
                    console.error("Missing product ID for cart action");
                }
            }
            
            // Quick view
            if (icon.classList.contains('fa-eye')) {
                showNotification('Quick view feature coming soon!');
            }
        });
    });

    // Newsletter form submission
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            
            if (emailInput.value.trim() !== '') {
                showNotification('Thank you for subscribing to our newsletter!');
                emailInput.value = '';
            } else {
                showNotification('Please enter a valid email address.', 'error');
            }
        });
    }

    // Mobile menu functionality
    const createMobileMenu = () => {
        if (window.innerWidth <= 768) {
            const navbar = document.querySelector('.navbar');
            const navLinks = document.querySelector('.nav-links');
            
            if (!document.querySelector('.mobile-menu-btn')) {
                // Create mobile menu button
                const mobileMenuBtn = document.createElement('button');
                mobileMenuBtn.className = 'mobile-menu-btn';
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                mobileMenuBtn.style.background = 'none';
                mobileMenuBtn.style.border = 'none';
                mobileMenuBtn.style.fontSize = '24px';
                mobileMenuBtn.style.cursor = 'pointer';
                mobileMenuBtn.style.display = 'none';
                
                // Insert before the logo
                navbar.insertBefore(mobileMenuBtn, navbar.firstChild);
                
                // Toggle mobile menu
                mobileMenuBtn.addEventListener('click', () => {
                    navLinks.classList.toggle('show-mobile-menu');
                    
                    // Toggle icon
                    if (navLinks.classList.contains('show-mobile-menu')) {
                        mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
                    } else {
                        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                    }
                });
            }
        }
    };

    // Initialize mobile menu
    createMobileMenu();
    
    // Handle window resize
    window.addEventListener('resize', createMobileMenu);
    
    // Fetch and render products
    const productSection = document.querySelector('.products');
    
    if (productSection) {
        async function fetchProductsByCategory(categoryId) {
            try {
                const response = await fetch(`http://localhost:3000/api/products/category/${categoryId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch products');
                }
                
                const products = await response.json();
                renderProducts(products);
            } catch (error) {
                console.error('Error fetching products:', error);
                productSection.innerHTML = `<p>Error loading products. ${error.message}</p>`;
            }
        }

        function renderProducts(products) {
            // Clear existing products
            productSection.innerHTML = '';

            products.forEach(product => {
                // Create product card dynamically
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');
                productCard.dataset.category = product.category.toLowerCase();
                productCard.dataset.id = product._id; // Add product ID to the card

                // Check if product is new
                const newBadge = product.isNew ? 
                    `<div class="product-badge">New</div>` : '';

                // Handle product image
                const productImage = product.images && product.images.length > 0 
                    ? product.images[0].url 
                    : 'https://via.placeholder.com/300x300';

                productCard.innerHTML = `
                    ${newBadge}
                    <div class="product-image">
                        <img src="${productImage}" alt="${product.name}">
                        <div class="product-actions">
                            <button class="action-btn wishlist" data-id="${product._id}">
                                <i class="fas fa-heart"></i>
                            </button>
                            <button class="action-btn add-to-cart" data-id="${product._id}">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                            <button class="action-btn view-details" data-id="${product._id}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p class="product-category">${product.category}</p>
                        <p class="product-price">Rs. ${product.price.toFixed(2)}</p>
                    </div>
                `;

                // Add click event to the entire product card for redirection
                productCard.addEventListener('click', function(e) {
                    // Avoid redirecting if action buttons are clicked
                    if (e.target.closest('.action-btn')) {
                        return;
                    }

                    // Redirect to product description page
                    const productId = this.dataset.id;
                    const category = this.dataset.category;
                    
                    // Store product details in sessionStorage
                    const productDetails = {
                        id: productId,
                        name: product.name,
                        price: product.price,
                        category: category,
                        image: productImage
                    };
                    
                    sessionStorage.setItem("selectedProduct", JSON.stringify(productDetails));
                    
                    // Redirect to product description page with query parameters
                    window.location.href = `products_description.html?productId=${productId}&category=${encodeURIComponent(category)}`;
                });

                productSection.appendChild(productCard);
            });

            // Add event listeners after rendering products
            productSection.querySelectorAll('.wishlist').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const productId = button.getAttribute('data-id');
                    console.log('Added to wishlist:', productId);
                    // Implement wishlist logic
                });
            });

            productSection.querySelectorAll('.add-to-cart').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const productId = button.getAttribute('data-id');
                    addToCart(productId);
                });
            });

            productSection.querySelectorAll('.view-details').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const productId = button.getAttribute('data-id');
                    console.log('View product details:', productId);
                    // Implement view details logic
                });
            });
        }

        // Fetch men's products by default
        fetchProductsByCategory('mens-clothing');
    }
});

// Sticky header behavior
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
        }
    }
});