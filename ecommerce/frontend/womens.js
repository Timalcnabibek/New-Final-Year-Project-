// Category filter functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');

    // Filter products based on category
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
            
            const icon = button.querySelector('i');
            
            // Add to wishlist
            if (icon.classList.contains('fa-heart')) {
                icon.classList.toggle('fas');
                icon.classList.toggle('far');
                showNotification('Product added to wishlist!');
            }
            
            // Add to cart
            if (icon.classList.contains('fa-shopping-cart')) {
                updateCartCount();
                showNotification('Product added to cart!');
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

    // Helper functions
    function updateCartCount() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            let count = parseInt(cartCount.textContent);
            cartCount.textContent = count + 1;
        }
    }

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
});

// Image slider for product cards (if needed in the future)
const initializeImageSliders = () => {
    // Implementation for product image sliders can be added here
};

// Sticky header behavior
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
    }
});



document.addEventListener('DOMContentLoaded', () => {
    const productSection = document.querySelector('.products');
    
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

            // Check if product is new (you might want to add a logic for this)
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

            // Add event listeners for product actions
            productCard.querySelector('.wishlist')?.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click when clicking action buttons
                handleWishlist(product._id);
            });
            productCard.querySelector('.add-to-cart')?.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click when clicking action buttons
                handleAddToCart(product._id);
            });
            productCard.querySelector('.view-details')?.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click when clicking action buttons
                handleViewDetails(product._id);
            });

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
    }

    // Existing helper functions remain the same
    function handleWishlist(productId) {
        console.log('Added to wishlist:', productId);
        // Implement wishlist logic
    }

    function handleAddToCart(productId) {
        const customerId = localStorage.getItem("customerId");
        if (!customerId) {
            alert("Please log in to add products to your cart.");
            window.location.href = "login.html";
            return;
        }
    
        const requestData = {
            customerId: customerId,
            productId: productId,
            quantity: 1
        };
    
        fetch("http://localhost:3000/api/cart/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(async (data) => {
            if (data.success || data.message?.includes("added")) {
                showNotification("✅ Product added to cart!");
                await updateCartCount();  // Refresh count from localStorage
            } else {
                showNotification("❌ Failed to add to cart.", "error");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            showNotification("❌ Server error. Try again.", "error");
        });
    }


    async function updateCartCount() {
        const customerId = localStorage.getItem("customerId");
        if (!customerId) return;
    
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
    
            // Store in localStorage for persistence
            localStorage.setItem("cartItems", JSON.stringify(cartItems));
    
            // Count total quantity
            const totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
            document.querySelectorAll(".cart-count").forEach(el => el.textContent = totalCount);
            console.log("🛒 Cart Count Updated:", totalCount);
        } catch (err) {
            console.error("Error updating cart count:", err);
        }
    }
    
    

    function handleViewDetails(productId) {
        console.log('View product details:', productId);
        // Implement view details logic
    }

    // Fetch men's products by default
    fetchProductsByCategory('womens-clothing');
    updateCartCount(); // Sync initial cart count

});