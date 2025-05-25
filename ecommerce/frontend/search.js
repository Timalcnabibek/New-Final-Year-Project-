// Enhanced search functionality - Fixed version

// Global search variables
let searchTimeout;
let searchResults = [];
let isSearchActive = false;

// Ensure productStore exists
if (typeof productStore === 'undefined') {
    window.productStore = {
        newProducts: [],
        trendingProducts: []
    };
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchContainer = createSearchContainer();
    
    if (!searchInput) return;
    
    // Add event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    
    // Close search results when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.search')) {
            hideSearchResults();
        }
    });
}

// Create search results container
function createSearchContainer() {
    const searchDiv = document.querySelector('.search');
    if (!searchDiv) return null;
    
    // Check if container already exists
    let container = document.getElementById('searchResults');
    if (!container) {
        container = document.createElement('div');
        container.id = 'searchResults';
        container.className = 'search-results-container';
        container.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            max-height: 400px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: none;
        `;
        
        // Make search div relative for positioning
        searchDiv.style.position = 'relative';
        searchDiv.appendChild(container);
    }
    
    return container;
}

// Handle search input
function handleSearchInput(event) {
    const query = event.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Debounce search to avoid too many API calls
    searchTimeout = setTimeout(() => {
        if (query.length >= 2) {
            performSearch(query);
        } else {
            hideSearchResults();
        }
    }, 300);
}

// Handle search focus
function handleSearchFocus(event) {
    const query = event.target.value.trim();
    if (query.length >= 2 && searchResults.length > 0) {
        showSearchResults();
    }
}

// Handle keyboard navigation
function handleSearchKeydown(event) {
    const resultsContainer = document.getElementById('searchResults');
    const results = resultsContainer?.querySelectorAll('.search-result-item');
    
    if (!results || results.length === 0) return;
    
    const currentActive = resultsContainer.querySelector('.search-result-item.active');
    let activeIndex = currentActive ? Array.from(results).indexOf(currentActive) : -1;
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            activeIndex = (activeIndex + 1) % results.length;
            setActiveResult(results, activeIndex);
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            activeIndex = activeIndex <= 0 ? results.length - 1 : activeIndex - 1;
            setActiveResult(results, activeIndex);
            break;
            
        case 'Enter':
            event.preventDefault();
            if (currentActive) {
                currentActive.click();
            }
            break;
            
        case 'Escape':
            hideSearchResults();
            event.target.blur();
            break;
    }
}

// Set active search result
function setActiveResult(results, activeIndex) {
    results.forEach(result => result.classList.remove('active'));
    if (results[activeIndex]) {
        results[activeIndex].classList.add('active');
        results[activeIndex].scrollIntoView({ block: 'nearest' });
    }
}

// Perform search
async function performSearch(query) {
    try {
        showSearchLoading();
        
        // Search in local product store first (faster)
        const localResults = searchLocalProducts(query);
        
        // Also search via API for more comprehensive results
        const apiResults = await searchViaAPI(query);
        
        // Combine and deduplicate results
        const combinedResults = combineSearchResults(localResults, apiResults);
        
        searchResults = combinedResults;
        displaySearchResults(combinedResults, query);
        
    } catch (error) {
        console.error('Search error:', error);
        displaySearchError();
    }
}

// Search local products (from productStore)
function searchLocalProducts(query) {
    // Ensure productStore exists and has data
    if (!window.productStore || (!window.productStore.newProducts && !window.productStore.trendingProducts)) {
        console.log('ProductStore not available, skipping local search');
        return [];
    }
    
    const newProducts = window.productStore.newProducts || [];
    const trendingProducts = window.productStore.trendingProducts || [];
    const allProducts = [...newProducts, ...trendingProducts];
    
    if (allProducts.length === 0) {
        console.log('No products in local store yet');
        return [];
    }
    
    const queryLower = query.toLowerCase();
    
    return allProducts.filter(product => {
        const name = (product.name || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        
        return name.includes(queryLower) || 
               category.includes(queryLower) || 
               description.includes(queryLower);
    });
}

// Search via API - FIXED VERSION
async function searchViaAPI(query) {
    try {
        // Try dedicated search endpoint first
        let response = await fetch(`http://localhost:3000/api/products/search?q=${encodeURIComponent(query)}`);
        
        if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data : (data.products || []);
        }
        
        // If search endpoint fails or doesn't exist, fall back
        console.log('Search endpoint not available, using fallback');
        return await fallbackSearch(query);
        
    } catch (error) {
        console.log('API search failed, using fallback:', error.message);
        return await fallbackSearch(query);
    }
}

// Fallback search when API search endpoint is not available - FIXED VERSION  
async function fallbackSearch(query) {
    try {
        // Get all products and filter client-side
        const response = await fetch('http://localhost:3000/api/products');
        if (!response.ok) {
            console.log('Fallback search: Could not fetch products');
            return [];
        }
        
        const data = await response.json();
        const products = Array.isArray(data) ? data : (data.products || []);
        
        const queryLower = query.toLowerCase();
        return products.filter(product => {
            const name = (product.name || '').toLowerCase();
            const category = (product.category || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            
            return name.includes(queryLower) || 
                   category.includes(queryLower) || 
                   description.includes(queryLower);
        });
        
    } catch (error) {
        console.error('Fallback search failed:', error);
        return [];
    }
}

// Combine and deduplicate search results
function combineSearchResults(localResults, apiResults) {
    const seen = new Set();
    const combined = [];
    
    // Add local results first (they're already loaded)
    localResults.forEach(product => {
        if (!seen.has(product._id)) {
            seen.add(product._id);
            combined.push(product);
        }
    });
    
    // Add API results that weren't in local results
    apiResults.forEach(product => {
        if (!seen.has(product._id)) {
            seen.add(product._id);
            combined.push(product);
        }
    });
    
    return combined.slice(0, 10); // Limit to 10 results for better UX
}

// Display search results - FIXED VERSION
function displaySearchResults(results, query) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    let html = ''; // FIXED: Declare html variable
    
    if (results.length === 0) {
        html = `
            <div class="search-no-results">
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; color: #ccc;"></i>
                    <p>No products found for "${query}"</p>
                    <p style="font-size: 14px;">Try different keywords or check spelling</p>
                </div>
            </div>
        `;
    } else {
        html = `<div class="search-results-header">
            <span style="padding: 10px; font-weight: bold; color: #333; border-bottom: 1px solid #eee; display: block;">
                Found ${results.length} product${results.length !== 1 ? 's' : ''} for "${query}"
            </span>
        </div>`;
        
        results.forEach((product, index) => {
            const imageUrl = getProductImageUrl(product);
            const price = product.price ? `$${product.price.toFixed(2)}` : '$0.00';
            const inWishlist = isProductInWishlist(product._id);
            
            html += `
                <div class="search-result-item" data-product-id="${product._id}" style="
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " 
                onmouseover="this.style.backgroundColor='#f8f9fa'"
                onmouseout="this.style.backgroundColor=''"
                onclick="selectSearchResult('${product._id}')">
                    
                    <img src="${imageUrl}" alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px;"
                         onerror="this.src='./image/default.jpg'">
                    
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; color: #333; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${highlightSearchTerm(product.name || 'Product', query)}
                        </div>
                        <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
                            ${product.category || 'Uncategorized'}
                        </div>
                        <div style="font-weight: bold; color: #e74c3c;">
                            ${price}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-left: 12px;">
                        <button onclick="event.stopPropagation(); addToCartFromSearch('${product._id}', '${(product.name || '').replace(/'/g, "\\'")}')" 
                                style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;"
                                onmouseover="this.style.backgroundColor='#218838'"
                                onmouseout="this.style.backgroundColor='#28a745'">
                            <i class="fas fa-cart-plus"></i>
                        </button>
                        <button onclick="event.stopPropagation(); toggleWishlistFromSearch('${product._id}', '${(product.name || '').replace(/'/g, "\\'")}')" 
                                style="background: ${inWishlist ? '#fee2e2' : '#f8f9fa'}; color: ${inWishlist ? '#ef4444' : '#666'}; border: 1px solid #ddd; padding: 6px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            <i class="fa${inWishlist ? 's' : 'r'} fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    showSearchResults();
}

// Get product image URL (reusing logic from main code)
function getProductImageUrl(product) {
    let imageUrl = "./image/default.jpg";
    
    if (product.images && product.images.length > 0) {
        const firstImage = product.images[0];
        if (typeof firstImage === 'string') {
            imageUrl = firstImage;
        } else if (typeof firstImage === 'object' && firstImage.url) {
            imageUrl = firstImage.url;
        }
    }
    
    return imageUrl;
}

// Highlight search term in text
function highlightSearchTerm(text, term) {
    if (!term || !text) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 1px 2px;">$1</mark>');
}

// Show search loading
function showSearchLoading() {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666;">
            <i class="fas fa-spinner fa-spin" style="font-size: 18px; margin-bottom: 8px;"></i>
            <p>Searching products...</p>
        </div>
    `;
    showSearchResults();
}

// Display search error
function displaySearchError() {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 18px; margin-bottom: 8px;"></i>
            <p>Search failed. Please try again.</p>
        </div>
    `;
    showSearchResults();
}

// Show search results
function showSearchResults() {
    const container = document.getElementById('searchResults');
    if (container) {
        container.style.display = 'block';
        isSearchActive = true;
    }
}

// Hide search results
function hideSearchResults() {
    const container = document.getElementById('searchResults');
    if (container) {
        container.style.display = 'none';
        isSearchActive = false;
    }
}

// Select search result
function selectSearchResult(productId) {
    // Find product in search results
    const product = searchResults.find(p => p._id === productId);
    
    if (product) {
        const category = product.category || "Uncategorized";
        sessionStorage.setItem("selectedProduct", JSON.stringify(product));
        window.location.href = `products_description.html?productId=${productId}&category=${encodeURIComponent(category)}`;
    } else {
        // Fallback if product not found
        window.location.href = `products_description.html?productId=${productId}`;
    }
    
    hideSearchResults();
}

// Check if product is in wishlist (safe version)
function isProductInWishlist(productId) {
    if (typeof isInWishlist === 'function') {
        return isInWishlist(productId);
    }
    // Fallback if isInWishlist function is not available
    if (typeof userWishlist !== 'undefined' && Array.isArray(userWishlist)) {
        return userWishlist.includes(productId);
    }
    return false;
}

// Add to cart from search results
async function addToCartFromSearch(productId, productName) {
    if (typeof addToCart === 'function') {
        await addToCart(productId, productName);
    } else {
        console.error('addToCart function not available');
        alert('Add to cart functionality not available');
    }
}

// Toggle wishlist from search results
async function toggleWishlistFromSearch(productId, productName) {
    const isCurrentlyInWishlist = isProductInWishlist(productId);
    
    let success = false;
    
    if (isCurrentlyInWishlist) {
        if (typeof removeFromWishlist === 'function') {
            success = await removeFromWishlist(productId, productName);
        }
    } else {
        if (typeof addToWishlist === 'function') {
            success = await addToWishlist(productId, productName);
        }
    }
    
    if (success) {
        // Update the search results display
        const button = document.querySelector(`[data-product-id="${productId}"] button:last-child`);
        if (button) {
            const newInWishlist = !isCurrentlyInWishlist;
            button.style.background = newInWishlist ? '#fee2e2' : '#f8f9fa';
            button.style.color = newInWishlist ? '#ef4444' : '#666';
            button.innerHTML = `<i class="fa${newInWishlist ? 's' : 'r'} fa-heart"></i>`;
        }
    } else if (!success && (typeof addToWishlist !== 'function' || typeof removeFromWishlist !== 'function')) {
        alert('Wishlist functionality not available');
    }
}

// Enhanced search with filters (optional advanced feature)
function performAdvancedSearch(query, filters = {}) {
    // This function can be expanded to include price range, category filters, etc.
    const results = searchLocalProducts(query);
    
    let filteredResults = results;
    
    // Apply category filter
    if (filters.category) {
        filteredResults = filteredResults.filter(product => 
            product.category?.toLowerCase() === filters.category.toLowerCase()
        );
    }
    
    // Apply price range filter
    if (filters.minPrice !== undefined) {
        filteredResults = filteredResults.filter(product => 
            product.price >= filters.minPrice
        );
    }
    
    if (filters.maxPrice !== undefined) {
        filteredResults = filteredResults.filter(product => 
            product.price <= filters.maxPrice
        );
    }
    
    return filteredResults;
}

// Add CSS styles for search functionality
function addSearchStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .search-result-item.active {
            background-color: #e3f2fd !important;
        }
        
        .search-results-container::-webkit-scrollbar {
            width: 6px;
        }
        
        .search-results-container::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        
        .search-results-container::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }
        
        .search-results-container::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
        
        @media (max-width: 768px) {
            .search-results-container {
                max-height: 300px;
                font-size: 14px;
            }
            
            .search-result-item img {
                width: 40px !important;
                height: 40px !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for the main script to initialize productStore
    const checkProductStore = () => {
        if (typeof window.productStore !== 'undefined') {
            initializeSearch();
            addSearchStyles();
        } else {
            // If productStore doesn't exist, create it and retry after a delay
            window.productStore = {
                newProducts: [],
                trendingProducts: []
            };
            setTimeout(() => {
                initializeSearch();
                addSearchStyles();
            }, 500);
        }
    };
    
    // Add a small delay to ensure other elements are initialized first
    setTimeout(checkProductStore, 100);
});

// Expose functions to global scope
window.selectSearchResult = selectSearchResult;
window.addToCartFromSearch = addToCartFromSearch;
window.toggleWishlistFromSearch = toggleWishlistFromSearch;