document.addEventListener("DOMContentLoaded", async () => {
    await fetchCartData();
});

// Fetch cart data and display in UI
async function fetchCartData() {
    // Get user ID from both possible sources
    const user = JSON.parse(localStorage.getItem("user"));
    const customerId = user?.userId || localStorage.getItem("customerId");
    
    if (!customerId) {
        showNotification("❌ User not logged in! Redirecting to login page.", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
        return;
    }

    const cartTableBody = document.getElementById("cart-table-body");
    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");
    const taxElement = document.getElementById("tax");
    const shippingElement = document.getElementById("shipping");
    const discountElement = document.getElementById("discount");
    const checkoutBtn = document.querySelector(".checkout-btn");
    
    // Show loading state
    cartTableBody.innerHTML = `
        <tr>
            <td colspan="3" class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading your cart...</p>
            </td>
        </tr>
    `;
    
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = `<span class="loading-dots">Loading</span>`;
    }

    try {
        console.log("Fetching cart data for customer:", customerId);
        const response = await fetch(`http://localhost:3000/api/cart/${customerId}`);
        if (!response.ok) throw new Error("Failed to fetch cart data");

        const data = await response.json();
        console.log("✅ API Response:", data);

        // Handle different possible data structures
        let cartItems = [];
        
        // Try different possible structures based on API response
        if (Array.isArray(data)) {
            cartItems = data;
        } else if (data.cart && Array.isArray(data.cart)) {
            cartItems = data.cart;
        } else if (data.items && Array.isArray(data.items)) {
            cartItems = data.items;
        } else {
            console.warn("⚠️ Unexpected cart data format:", data);
            // If we can't determine the structure, show an error
            cartTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="error-message">
                        <p>Unable to process cart data. Please try again later.</p>
                        <button class="retry-btn" onclick="fetchCartData()">Try Again</button>
                    </td>
                </tr>`;
            return;
        }
        
        console.log("✅ Extracted cart items:", cartItems);

        if (cartItems.length === 0) {
            cartTableBody.innerHTML = `
                <tr class="empty-cart-message">
                    <td colspan="3">
                        <div class="empty-cart-container">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="8" cy="21" r="1"></circle>
                                <circle cx="19" cy="21" r="1"></circle>
                                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                            </svg>
                            <p>Your cart is empty</p>
                        </div>
                    </td>
                </tr>`;
            
            setOrderSummaryValues(0, 0, 0, 0);
            
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.innerHTML = `Proceed to Checkout`;
            }
            return;
        }

        let subtotal = 0;
        cartTableBody.innerHTML = ""; // Clear existing rows

        // Add items with animation
        cartItems.forEach((item, index) => {
            // Handle different possible product structures
            const product = item.productId || item.product || item;
            
            if (!product || !product.price) {
                console.warn("⚠ Missing product details for item:", item);
                return;
            }

            const quantity = item.quantity || 1;
            const itemTotal = product.price * quantity;
            subtotal += itemTotal;

            // Fix image path handling
            let productImage = "https://via.placeholder.com/80";
            if (product.images && product.images.length > 0) {
                if (typeof product.images[0] === 'string') {
                    productImage = product.images[0];
                } else if (product.images[0].url) {
                    productImage = product.images[0].url;
                }
                
                // If the image URL doesn't start with http/https, assume it's a relative path
                if (productImage && !productImage.startsWith('http')) {
                    productImage = `http://localhost:3000${productImage.startsWith('/') ? '' : '/'}${productImage}`;
                }
            }

            const row = document.createElement("tr");
            row.classList.add("cart-item");
            row.setAttribute("data-id", product._id);
            row.style.opacity = "0";
            row.style.transform = "translateY(20px)";

            row.innerHTML = `
                <td width="100">
                    <div class="img-container">
                        <img src="${productImage}" alt="${product.name}" class="cart-item-image" 
                             onerror="this.src='https://via.placeholder.com/80'">
                    </div>
                </td>
                <td>
                    <div class="cart-item-title">${product.name}</div>
                    <div class="cart-item-price">Unit price: Rs. ${product.price.toFixed(2)}</div>
                    <div class="quantity-control">
                        <button class="quantity-btn decrease" data-id="${product._id}" data-quantity="${quantity}" data-min-quantity="1">
                            <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
                                <path d="M1 1H11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                        <input type="text" class="quantity-input" value="${quantity}" readonly>
                        <button class="quantity-btn increase" data-id="${product._id}" data-quantity="${quantity}">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </td>
                <td class="price-cell">
                    Rs. ${itemTotal.toFixed(2)}
                    <button class="remove-btn" data-id="${product._id}" aria-label="Remove item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </td>
            `;

            cartTableBody.appendChild(row);
            
            // Animate row entrance with delay based on index
            setTimeout(() => {
                row.style.transition = "opacity 0.5s ease, transform 0.5s ease";
                row.style.opacity = "1";
                row.style.transform = "translateY(0)";
            }, 50 * index);
        });

        // Calculate total price with backend values
        const tax = 150; // From backend
        const shipping = subtotal > 5000 ? 0 : 150; // Free shipping over Rs. 5000
        let discount = 0; // Default no discount

// ✅ Now it is safe to check and fetch reward
if (customerId) {
    const reward = await fetchActiveReward(customerId);
    if (reward && reward.discount) {
        const { type, value } = reward.discount;
        if (type === "fixed") {
            discount = parseFloat(value);
        } else if (type === "percentage") {
            discount = (parseFloat(value) / 100) * subtotal;
        }
        console.log(`🎁 Reward discount applied: Rs. ${discount}`);
    }
}

                const total = subtotal + tax + shipping - discount;

        // Update summary with animation
        animateCountUp(subtotalElement, 0, subtotal, "Rs. ", 2);
        animateCountUp(taxElement, 0, tax, "Rs. ", 2);
        if (shipping === 0) {
            shippingElement.textContent = "Free";
            shippingElement.classList.add("free-shipping");
        } else {
            animateCountUp(shippingElement, 0, shipping, "Rs. ", 2);
            shippingElement.classList.remove("free-shipping");
        }
        animateCountUp(discountElement, 0, discount, "Rs. ", 2);
        animateCountUp(totalElement, 0, total, "Rs. ", 2);

        // Re-enable checkout button with animation
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = `
                Proceed to Checkout
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
            `;
            checkoutBtn.classList.add("active");
        }

        attachCartEventListeners();

    } catch (error) {
        console.error("Error fetching cart:", error);
        cartTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="error-message">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>Error loading cart: ${error.message}</p>
                    <button class="retry-btn" onclick="fetchCartData()">Try Again</button>
                </td>
            </tr>`;
            
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = `Proceed to Checkout`;
        }
    }
}

// Helper function for animated count-up
function animateCountUp(element, start, end, prefix = "", decimals = 0) {
    if (!element) return;
    
    const duration = 1000;
    const frameDuration = 1000/60;
    const totalFrames = Math.round(duration / frameDuration);
    const easeOutQuad = t => t * (2 - t);
    
    let frame = 0;
    const countTo = end;
    
    const counter = setInterval(() => {
        frame++;
        const progress = easeOutQuad(frame / totalFrames);
        const currentCount = Math.round((countTo - start) * progress + start);
        
        if (decimals > 0) {
            element.textContent = `${prefix}${currentCount.toFixed(decimals)}`;
        } else {
            element.textContent = `${prefix}${currentCount}`;
        }
        
        if (frame === totalFrames) {
            clearInterval(counter);
        }
    }, frameDuration);
}

// Set order summary values
function setOrderSummaryValues(subtotal, tax, shipping, discount) {
    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");
    const taxElement = document.getElementById("tax");
    const shippingElement = document.getElementById("shipping");
    const discountElement = document.getElementById("discount");
    
    if (subtotalElement) subtotalElement.textContent = `Rs. ${subtotal.toFixed(2)}`;
    if (taxElement) taxElement.textContent = `Rs. ${tax.toFixed(2)}`;
    
    if (shippingElement) {
        shippingElement.textContent = shipping === 0 ? "Free" : `Rs. ${shipping.toFixed(2)}`;
        if (shipping === 0) {
            shippingElement.classList.add("free-shipping");
        } else {
            shippingElement.classList.remove("free-shipping");
        }
    }
    
    if (discountElement) discountElement.textContent = `Rs. ${discount.toFixed(2)}`;
    
    const total = subtotal + tax + shipping - discount;
    if (totalElement) totalElement.textContent = `Rs. ${total.toFixed(2)}`;
}

// Show notification
function showNotification(message, type = "info") {
    // Create notification element if it doesn't exist
    let notification = document.getElementById("cart-notification");
    if (!notification) {
        notification = document.createElement("div");
        notification.id = "cart-notification";
        notification.className = "notification";
        document.body.appendChild(notification);
    }
    
    // Set message and type
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = "block";
    
    // Animate in
    setTimeout(() => {
        notification.classList.add("show");
    }, 10);
    
    // Auto hide after delay
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            notification.style.display = "none";
        }, 300);
    }, 3000);
}

// Attach event listeners for cart actions
function attachCartEventListeners() {
    document.querySelectorAll(".increase").forEach(button => {
        button.addEventListener("click", async function (event) {
            event.preventDefault();
            const productId = this.getAttribute("data-id");
            const currentQuantity = parseInt(this.getAttribute("data-quantity") || "0");
            
            // Optimistic UI update
            const quantityInput = this.parentElement.querySelector(".quantity-input");
            const newQuantity = currentQuantity + 1;
            quantityInput.value = newQuantity;
            this.setAttribute("data-quantity", newQuantity);
            
            // Update row price display
            updateRowPrice(productId, newQuantity);
            
            // Update cart in background
            await updateCartItem(productId, newQuantity);
        });
    });

    document.querySelectorAll(".decrease").forEach(button => {
        button.addEventListener("click", async function (event) {
            event.preventDefault();
            const productId = this.getAttribute("data-id");
            const inputField = this.parentElement.querySelector(".quantity-input");
            const currentQuantity = parseInt(inputField.value || "1"); // Use the input value directly
            const minQuantity = parseInt(this.getAttribute("data-min-quantity") || "1");
    
            console.log("Decrease clicked - Product ID:", productId);
            console.log("Current quantity (input):", currentQuantity);
            console.log("Minimum quantity:", minQuantity);
    
            if (currentQuantity > minQuantity) {
                const newQuantity = currentQuantity - 1;
    
                // Update all elements consistently
                inputField.value = newQuantity;
                this.setAttribute("data-quantity", newQuantity);
                const increaseButton = this.parentElement.querySelector(".increase");
                if (increaseButton) increaseButton.setAttribute("data-quantity", newQuantity);
    
                updateRowPrice(productId, newQuantity);
                await updateCartItem(productId, newQuantity);
            } else {
                showNotification(`Minimum quantity (${minQuantity}) reached`, "info");
            }
        });
    });

    document.querySelectorAll(".remove-btn").forEach(button => {
        button.addEventListener("click", async function (event) {
            event.preventDefault();
            const productId = this.getAttribute("data-id");
            const row = this.closest(".cart-item");
            
            // Optimistic UI update - animate row removal
            row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            row.style.opacity = "0";
            row.style.transform = "translateX(20px)";
            
            // Remove from cart in background
            await removeCartItem(productId);
        });
    });
}

// Update row price display
function updateRowPrice(productId, newQuantity) {
    const row = document.querySelector(`.cart-item[data-id="${productId}"]`);
    if (!row) return;
    
    const priceText = row.querySelector(".cart-item-price").textContent;
    const unitPrice = parseFloat(priceText.replace("Unit price: Rs. ", ""));
    const newTotal = unitPrice * newQuantity;
    
    row.querySelector(".price-cell").innerHTML = `
        Rs. ${newTotal.toFixed(2)}
        <button class="remove-btn" data-id="${productId}" aria-label="Remove item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </button>
    `;
    
    // Re-attach event listener to the new remove button
    row.querySelector(".remove-btn").addEventListener("click", async function (event) {
        event.preventDefault();
        const productId = this.getAttribute("data-id");
        const row = this.closest(".cart-item");
        
        // Animate row removal
        row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        row.style.opacity = "0";
        row.style.transform = "translateX(20px)";
        
        await removeCartItem(productId);
    });
    
    // Recalculate totals
    calculateSummary();
}

// Update cart item quantity with the absolute quantity value
async function updateCartItem(productId, newQuantity) {
    const user = JSON.parse(localStorage.getItem("user"));
    const customerId = user?.userId || localStorage.getItem("customerId");
    if (!customerId) return;

    try {
        const response = await fetch("http://localhost:3000/api/cart/update", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, productId, quantity: newQuantity }),
        });
        
        const data = await response.json();
        console.log("✅ Remove response:", data);
        
        // ✅ Remove product from localStorage.cartItems
        let localCart = JSON.parse(localStorage.getItem("cartItems")) || [];
        localCart = localCart.filter(item => {
            const product = item.productId || item.product || item;
            return product._id !== productId;
        });
        localStorage.setItem("cartItems", JSON.stringify(localCart));
                console.log("✅ Update response:", data);
        
        // No need to fetch the entire cart again, just update the summary
        calculateSummary();
        
        // Show success message
        showNotification("Cart updated successfully", "success");
    } catch (error) {
        console.error("Error updating cart:", error);
        showNotification("Failed to update cart", "error");
        
        // Revert optimistic update by refreshing the cart
        await fetchCartData();
    }
}

// Function to remove an item from the cart
async function removeCartItem(productId) {
    const user = JSON.parse(localStorage.getItem("user"));
    const customerId = user?.userId || localStorage.getItem("customerId");
    if (!customerId) return;

    try {
        console.log("🗑️ Removing product:", productId, "for customer:", customerId);
        
        const response = await fetch("http://localhost:3000/api/cart/remove", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, productId }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to remove item");
        }
        
        const data = await response.json();
        console.log("✅ Remove response:", data);
        
        // Remove row with animation after API confirms success
        const row = document.querySelector(`.cart-item[data-id="${productId}"]`);
        if (row) {
            setTimeout(() => {
                row.remove();
                
                // Check if cart is now empty
                const remainingItems = document.querySelectorAll(".cart-item");
                if (remainingItems.length === 0) {
                    const cartTableBody = document.getElementById("cart-table-body");
                    cartTableBody.innerHTML = `
                        <tr class="empty-cart-message">
                            <td colspan="3">
                                <div class="empty-cart-container">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="8" cy="21" r="1"></circle>
                                        <circle cx="19" cy="21" r="1"></circle>
                                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                                    </svg>
                                    <p>Your cart is empty</p>
                                </div>
                            </td>
                        </tr>`;
                    
                    // Disable checkout button
                    const checkoutBtn = document.querySelector(".checkout-btn");
                    if (checkoutBtn) {
                        checkoutBtn.disabled = true;
                    }
                    
                    // Reset summary values
                    setOrderSummaryValues(0, 0, 0, 0);
                } else {
                    // Recalculate totals
                    calculateSummary();
                }
                
                showNotification("Item removed from cart", "success");
            }, 300);
        }
    } catch (error) {
        console.error("Error removing cart item:", error);
        showNotification("Failed to remove item from cart", "error");
        
        // Revert optimistic update by refreshing the cart
        await fetchCartData();
    }
}



//fetch reward from database
async function fetchActiveReward(customerId) {
    try {
        const res = await fetch(`http://localhost:3000/api/${customerId}/reward`);
        if (!res.ok) throw new Error("Failed to fetch rewards");

        const data = await res.json();
        if (Array.isArray(data.activeRewards) && data.activeRewards.length > 0) {
            const sorted = data.activeRewards.sort((a, b) => 
                new Date(b.redeemedAt) - new Date(a.redeemedAt));
            return sorted[0]; // Return the latest reward
        }
    } catch (err) {
        console.error("❌ Error fetching active reward:", err);
    }
    return null;
}





// Calculate and update order summary
async function calculateSummary() {
    const cartItems = [];
    
    document.querySelectorAll("#cart-table-body .cart-item").forEach((row) => {
        const productId = row.getAttribute("data-id");
        const name = row.querySelector(".cart-item-title")?.textContent || "Unknown";
        const priceText = row.querySelector(".cart-item-price")?.textContent || "";
        const price = parseFloat(priceText.replace("Unit price: Rs. ", "")) || 0;
        const quantity = parseInt(row.querySelector(".quantity-input")?.value) || 1;
    
        cartItems.push({
            productId,
            name,
            price,
            quantity,
            subtotal: parseFloat((price * quantity).toFixed(2)),
        });
    });
    
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Backend values
    const tax = 150;
    const shipping = subtotal > 5000 ? 0 : 150;
    let discount = 0; // Default no discount
    
    const user = JSON.parse(localStorage.getItem("user"));
    const customerId = user?.userId || localStorage.getItem("customerId");
    
    if (customerId) {
        const reward = await fetchActiveReward(customerId); // ✅ Correct
        if (reward && reward.discount) {
            const { type, value } = reward.discount;
            if (type === "fixed") {
                discount = parseFloat(value);
            } else if (type === "percentage") {
                discount = (parseFloat(value) / 100) * subtotal;
            }
            console.log(`🎁 Reward discount applied: Rs. ${discount}`);
        }
    }
    
    
    const total = parseFloat((subtotal + tax + shipping - discount).toFixed(2));
    
    const summary = {
        items: cartItems,
        subtotal,
        tax,
        shipping,
        discount,
        total,
    };
    
    // Update UI with smooth transitions
    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");
    const taxElement = document.getElementById("tax");
    const shippingElement = document.getElementById("shipping");
    const discountElement = document.getElementById("discount");
    
    if (subtotalElement) {
        const currentSubtotal = parseFloat(subtotalElement.textContent.replace("Rs. ", "")) || 0;
        animateCountUp(subtotalElement, currentSubtotal, subtotal, "Rs. ", 2);
    }
    
    if (taxElement) {
        taxElement.textContent = `Rs. ${tax.toFixed(2)}`;
    }
    
    if (shippingElement) {
        if (shipping === 0) {
            shippingElement.textContent = "Free";
            shippingElement.classList.add("free-shipping");
        } else {
            shippingElement.textContent = `Rs. ${shipping.toFixed(2)}`;
            shippingElement.classList.remove("free-shipping");
        }
    }
    
    if (discountElement) {
        discountElement.textContent = `Rs. ${discount.toFixed(2)}`;
    }
    
    if (totalElement) {
        const currentTotal = parseFloat(totalElement.textContent.replace("Rs. ", "")) || 0;
        animateCountUp(totalElement, currentTotal, total, "Rs. ", 2);
    }
    
    // Save order summary to sessionStorage
    sessionStorage.setItem("orderSummary", JSON.stringify(summary));
    
    return summary;
}

// Initialize checkout button functionality
document.addEventListener("DOMContentLoaded", () => {
    const checkoutBtn = document.querySelector(".checkout-btn");
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            
            // Add loading state
            checkoutBtn.disabled = true;
            const originalButtonText = checkoutBtn.innerHTML;
            checkoutBtn.innerHTML = `
                <div class="spinner-small"></div>
                Processing...
            `;
            
            // Calculate summary
            const summary = calculateSummary();
            sessionStorage.removeItem('selectedProduct');
            
            // Save to sessionStorage
            sessionStorage.setItem("orderSummary", JSON.stringify(summary));
            
            // Simulate processing delay
            setTimeout(() => {
                // Redirect
                window.location.href = "payment.html";
            }, 800);
        });
    }
});