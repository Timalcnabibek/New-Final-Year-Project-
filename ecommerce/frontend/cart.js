document.addEventListener("DOMContentLoaded", async () => {
    await fetchCartData();
});

// Fetch cart data and display in UI
async function fetchCartData() {
    const user = JSON.parse(localStorage.getItem("user"));
    const customerId = user?.userId;
        if (!customerId) {
        alert("❌ User not logged in! Redirecting to login page.");
        window.location.href = "login.html";
        return;
    }

    const cartTableBody = document.getElementById("cart-table-body");
    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");
    const taxElement = document.getElementById("tax");
    const shippingElement = document.getElementById("shipping");
    const discountElement = document.getElementById("discount");

    try {
        console.log("Fetching cart data for customer:", customerId);
        const response = await fetch(`http://localhost:3000/api/cart/${customerId}`);
        if (!response.ok) throw new Error("Failed to fetch cart data");

        const data = await response.json();
        console.log("✅ API Response:", data);

        const cartItems = Array.isArray(data.cart) ? data.cart : [];
        console.log("✅ Extracted cart items:", cartItems);

        if (cartItems.length === 0) {
            cartTableBody.innerHTML = `<tr><td colspan="3">🛒 Your cart is empty.</td></tr>`;
            subtotalElement.textContent = "Rs. 0.00";
            totalElement.textContent = "Rs. 0.00";
            taxElement.textContent = "Rs. 0.00";
            shippingElement.textContent = "Free";
            discountElement.textContent = "Rs. 0.00";
            return;
        }

        let subtotal = 0;
        cartTableBody.innerHTML = ""; // Clear existing rows

        cartItems.forEach((item) => {
            const product = item.productId;
            if (!product || !product.price) {
                console.warn("⚠ Missing product details for item:", item);
                return;
            }

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            // Fix image path handling
            let productImage = "https://via.placeholder.com/80";
            if (product.images && product.images.length > 0) {
                if (product.images[0].url) {
                    productImage = product.images[0].url;
                    // If the image URL doesn't start with http/https, assume it's a relative path
                    if (!productImage.startsWith('http')) {
                        productImage = `http://localhost:3000${productImage.startsWith('/') ? '' : '/'}${productImage}`;
                    }
                }
            }

            const row = document.createElement("tr");
            row.classList.add("cart-item");
            row.setAttribute("data-id", product._id);

            row.innerHTML = `
                <td width="80">
                    <img src="${productImage}" alt="${product.name}" class="cart-item-image">
                </td>
                <td>
                    <div class="cart-item-title"> ${product.name}</div>
                    <div class="cart-item-price">Unit price: Rs. ${product.price.toFixed(2)}</div>
                    <div class="quantity-control">
                        <button class="quantity-btn decrease" data-id="${product._id}" data-quantity="${item.quantity}">−</button>
                        <input type="text" class="quantity-input" value="${item.quantity}" readonly>
                        <button class="quantity-btn increase" data-id="${product._id}" data-quantity="${item.quantity}">+</button>
                        <button class="remove-btn" data-id="${product._id}">🗑</button>
                    </div>
                </td>
                <td class="price-cell">Rs. ${itemTotal.toFixed(2)}</td>
            `;

            cartTableBody.appendChild(row);
        });

        // Calculate total price with backend values
        const tax = 150; // From backend
        const shipping = subtotal > 5000 ? 0 : 150; // Free shipping over $100
        const discount = 200; // From backend
        const total = subtotal + tax + shipping - discount;

        subtotalElement.textContent = `Rs. ${subtotal.toFixed(2)}`;
        taxElement.textContent = `Rs. ${tax.toFixed(2)}`;
        shippingElement.textContent = shipping === 0 ? "Free" : `Rs. ${shipping.toFixed(2)}`;
        discountElement.textContent = `Rs. ${discount.toFixed(2)}`;
        totalElement.textContent = `Rs. ${total.toFixed(2)}`;

        attachCartEventListeners();

    } catch (error) {
        console.error("Error fetching cart:", error);
        cartTableBody.innerHTML = `<tr><td colspan="3">❌ Error loading cart.</td></tr>`;
    }
}

// Attach event listeners for cart actions
function attachCartEventListeners() {
    document.querySelectorAll(".increase").forEach(button => {
        button.addEventListener("click", async function (event) {
            event.preventDefault();
            const productId = this.getAttribute("data-id");
            const currentQuantity = parseInt(this.getAttribute("data-quantity") || "0");
            await updateCartItem(productId, currentQuantity + 1);
        });
    });

    document.querySelectorAll(".decrease").forEach(button => {
        button.addEventListener("click", async function (event) {
            event.preventDefault();
            const productId = this.getAttribute("data-id");
            const currentQuantity = parseInt(this.getAttribute("data-quantity") || "0");
            if (currentQuantity > 1) {
                await updateCartItem(productId, currentQuantity - 1);
            } else {
                await removeCartItem(productId);
            }
        });
    });

    document.querySelectorAll(".remove-btn").forEach(button => {
        button.addEventListener("click", async function (event) {
            event.preventDefault();
            const productId = this.getAttribute("data-id");
            await removeCartItem(productId);
        });
    });
}

// Update cart item quantity with the absolute quantity value
async function updateCartItem(productId, newQuantity) {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) return;

    try {
        const response = await fetch("http://localhost:3000/api/cart/update", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, productId, quantity: newQuantity }),
        });
        
        const data = await response.json();
        console.log("✅ Update response:", data);
        
        await fetchCartData();
    } catch (error) {
        console.error("Error updating cart:", error);
    }
}

// Function to remove an item from the cart
async function removeCartItem(productId) {
    const customerId = localStorage.getItem("customerId");
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
        
        // Refresh the cart UI
        await fetchCartData();
    } catch (error) {
        console.error("Error removing cart item:", error);
        alert("Failed to remove item from cart. Please try again.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const checkoutBtn = document.querySelector(".checkout-btn");
    
    function updateSummaryDisplay(summary) {
      document.getElementById("subtotal").textContent = `Rs. ${summary.subtotal.toFixed(2)}`;
      document.getElementById("tax").textContent = `Rs. ${summary.tax.toFixed(2)}`;
      document.getElementById("shipping").textContent = summary.shipping === 0 ? "Free" : `Rs. ${summary.shipping.toFixed(2)}`;
      document.getElementById("discount").textContent = `Rs. ${summary.discount.toFixed(2)}`;
      document.getElementById("total").textContent = `Rs. ${summary.total.toFixed(2)}`;
    }

    function calculateSummary() {
      const cartItems = [];
    
      document.querySelectorAll("#cart-table-body .cart-item").forEach((row) => {
        const productId = row.getAttribute("data-id");
        const name = row.querySelector(".cart-item-title")?.textContent || "Unknown";
        const price = parseFloat(row.querySelector(".cart-item-price")?.textContent.replace("Unit price: Rs. ", "")) || 0;
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
      const discount = 200; 
      
      const total = parseFloat((subtotal + tax + shipping - discount).toFixed(2));
    
      const summary = {
        items: cartItems,
        subtotal,
        tax,
        shipping,
        discount,
        total,
      };
    
      updateSummaryDisplay(summary);
    
      return summary;
    }
    
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        
        const summary = calculateSummary();
        
        // Save to sessionStorage
        sessionStorage.setItem("orderSummary", JSON.stringify(summary));
        
        // Redirect
        window.location.href = "payment.html";
      });
    }
    
    // Initial render
    calculateSummary();
});