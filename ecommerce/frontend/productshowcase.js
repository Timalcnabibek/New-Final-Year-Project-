document.addEventListener('DOMContentLoaded', function () {
    fetchProducts();
});


// Function to fetch products from API
function fetchProducts() {
    fetch('http://localhost:3000/api/products')
        .then(response => response.json())
        .then(products => {
            if (products.length === 0) {
                document.getElementById('newProducts').innerHTML = "<p>No products found.</p>";
                document.getElementById('trendingProducts').innerHTML = "<p>No trending products available.</p>";
                return;
            }

            // Filter products for sections
            const newArrivals = products.slice(0, 4); // First 4 products as new arrivals
            const trending = products.filter(product => product.trending).slice(0, 4); // Trending products

            generateProductCards(newArrivals, 'newProducts');
            generateProductCards(trending, 'trendingProducts');
        })
        .catch(error => {
            console.error("Error fetching products:", error);
            // document.getElementById('newProducts').innerHTML = "<p>Error loading products.</p>";
            // document.getElementById('trendingProducts').innerHTML = "<p>Error loading trending products.</p>";
        });
}

// Function to generate product cards dynamically
function generateProductCards(products, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear container before inserting new products

    products.forEach(product => {
        const stars = generateStars(product.rating || 5); // Default rating if missing

        const productCard = `
            <div class="product-card">
                ${product.trending ? `<div class="product-badge">Trending</div>` : ''}
                <div class="product-image">
                    <img src="${product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300'}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">$${product.price}</span>
                        ${product.discount_price ? `<span class="original-price">$${product.discount_price}</span>` : ''}
                    </div>
                    <div class="product-rating">${stars}</div>
                    <div class="product-actions">
                        <button class="add-to-cart"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
                        <button class="wishlist-btn"><i class="far fa-heart"></i></button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML += productCard;
    });

    // Add event listeners for buttons
    attachEventListeners();
}

// Generate star ratings dynamically
function generateStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < 5 - Math.ceil(rating); i++) {
        stars += '<i class="far fa-star"></i>';
    }

    return stars;
}

// Attach event listeners to buttons
function attachEventListeners() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function () {
            alert('Product added to cart!');
        });
    });

    document.querySelectorAll('.wishlist-btn').forEach(button => {
        button.addEventListener('click', function () {
            this.innerHTML = '<i class="fas fa-heart"></i>';
            this.style.backgroundColor = '#fee2e2';
            this.style.color = '#ef4444';
            alert('Product added to wishlist!');
        });
    });
}
