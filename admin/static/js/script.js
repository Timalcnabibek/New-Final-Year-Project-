document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to current tab and content
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // If "All Products" tab is clicked, load products
            if (tabId === 'all-products') {
                loadProducts();
            }
        });
    });
    
    // Hide success and error messages initially
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    
    // Stock control functionality
    const minusBtn = document.querySelector('.stock-btn.minus');
    const plusBtn = document.querySelector('.stock-btn.plus');
    const stockInput = document.getElementById('productStock');
    
    minusBtn.addEventListener('click', function() {
        let currentValue = parseInt(stockInput.value);
        if (currentValue > 0) {
            stockInput.value = currentValue - 1;
        }
    });
    
    plusBtn.addEventListener('click', function() {
        let currentValue = parseInt(stockInput.value);
        stockInput.value = currentValue + 1;
    });
    
    // Image upload preview
    const imageInput = document.getElementById('productImages');
    const imagePreview = document.getElementById('imagePreview');
    
    imageInput.addEventListener('change', function() {
        imagePreview.innerHTML = '';
        
        if (this.files.length > 5) {
            showError('Maximum 5 images allowed');
            this.value = '';
            return;
        }
        
        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showError('Image size should not exceed 5MB');
                continue;
            }
            
            // Create preview element
            const preview = document.createElement('div');
            preview.className = 'image-preview';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = function() {
                URL.revokeObjectURL(this.src);
            };
            
            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove-image';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', function() {
                preview.remove();
                // Note: This doesn't actually remove the file from the input
                // In a real implementation, you'd need to handle this properly
            });
            
            preview.appendChild(img);
            preview.appendChild(removeBtn);
            imagePreview.appendChild(preview);
        }
    });
    
    // Form submission
    const productForm = document.getElementById('productForm');
    const saveLoader = document.getElementById('saveLoader');
    
    productForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Show loader
        saveLoader.style.display = 'inline-block';
        
        // Create FormData object to handle file uploads
        const formData = new FormData();
        
        formData.append('productName', document.getElementById('productName').value);
        formData.append('productSKU', document.getElementById('productSKU').value);
        formData.append('productDescription', document.getElementById('productDescription').value);
        formData.append('productPrice', document.getElementById('productPrice').value);
        formData.append('productDiscountPrice', document.getElementById('productDiscountPrice').value);
        formData.append('productCategory', document.getElementById('productCategory').value);
        formData.append('productStock', document.getElementById('productStock').value);
        formData.append('productFeatured', document.getElementById('productFeatured').checked);
        
        // Add images
        const imageFiles = document.getElementById('productImages').files;
        for (let i = 0; i < imageFiles.length; i++) {
            formData.append('productImages', imageFiles[i]);
        }
        
        // Send data to server
        fetch('/products', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            saveLoader.style.display = 'none';
            
            if (data.success) {
                showSuccess('Product has been successfully saved!');
                resetForm();
            } else {
                showError(data.message || 'Error saving product. Please try again.');
            }
        })
        .catch(error => {
            saveLoader.style.display = 'none';
            showError('Network error. Please try again.');
            console.error('Error:', error);
        });
    });
    
    // Reset form
    const resetFormBtn = document.getElementById('resetForm');
    resetFormBtn.addEventListener('click', resetForm);
    
    function resetForm() {
        productForm.reset();
        imagePreview.innerHTML = '';
    }
    
    // Load products function
    function loadProducts() {
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading products...</td></tr>';
        
        fetch('/products')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.products.length === 0) {
                        productsList.innerHTML = '<tr><td colspan="7" style="text-align: center;">No products found</td></tr>';
                    } else {
                        productsList.innerHTML = '';
                        data.products.forEach(product => {
                            const row = document.createElement('tr');
                            
                            // Image cell - using Cloudinary URLs
                            const imageCell = document.createElement('td');
                            const img = document.createElement('img');
                            
                            // Check if product has images with URLs
                            if (product.images && product.images.length > 0 && product.images[0].url) {
                                img.src = product.images[0].url;
                            } else {
                                img.src = '/api/placeholder/60/60';
                            }
                            
                            img.alt = product.name;
                            img.className = 'product-image';
                            imageCell.appendChild(img);
                            
                            // Other cells
                            const nameCell = document.createElement('td');
                            nameCell.textContent = product.name;
                            
                            const skuCell = document.createElement('td');
                            skuCell.textContent = product.sku || 'N/A';
                            
                            const priceCell = document.createElement('td');
                            priceCell.textContent = `$${product.price.toFixed(2)}`;
                            
                            const stockCell = document.createElement('td');
                            stockCell.textContent = product.stock;
                            
                            const statusCell = document.createElement('td');
                            const statusBadge = document.createElement('span');
                            statusBadge.className = `badge ${product.stock > 0 ? 'badge-success' : 'badge-danger'}`;
                            statusBadge.textContent = product.stock > 0 ? 'In Stock' : 'Out of Stock';
                            statusCell.appendChild(statusBadge);
                            
                            // Actions cell
                            const actionsCell = document.createElement('td');
                            const actionsDiv = document.createElement('div');
                            actionsDiv.className = 'actions';
                            
                            const editBtn = document.createElement('div');
                            editBtn.className = 'action-btn edit-btn';
                            editBtn.innerHTML = '✏️';
                            editBtn.addEventListener('click', () => editProduct(product._id));
                            
                            const deleteBtn = document.createElement('div');
                            deleteBtn.className = 'action-btn delete-btn';
                            deleteBtn.innerHTML = '🗑️';
                            deleteBtn.addEventListener('click', () => deleteProduct(product._id, product.name));
                            
                            actionsDiv.appendChild(editBtn);
                            actionsDiv.appendChild(deleteBtn);
                            actionsCell.appendChild(actionsDiv);
                            
                            // Append all cells to row
                            row.appendChild(imageCell);
                            row.appendChild(nameCell);
                            row.appendChild(skuCell);
                            row.appendChild(priceCell);
                            row.appendChild(stockCell);
                            row.appendChild(statusCell);
                            row.appendChild(actionsCell);
                            
                            // Append row to table
                            productsList.appendChild(row);
                        });
                    }
                } else {
                    productsList.innerHTML = `<tr><td colspan="7" style="text-align: center;">${data.message || 'Error loading products'}</td></tr>`;
                }
            })
            .catch(error => {
                productsList.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading products. Please refresh the page.</td></tr>';
                console.error('Error:', error);
            });
    }
    
    // Delete product function
    function deleteProduct(productId, productName) {
        Swal.fire({
            title: "Are you sure?",
            text: `Do you really want to delete "${productName}"? This action cannot be undone!`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                console.log(`Sending DELETE request for product ID: ${productId}`);
    
                fetch(`/products/${productId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    console.log("Delete response:", data); // Debugging output
    
                    if (data.success) {
                        Swal.fire({
                            title: "Deleted!",
                            text: "Product has been successfully removed.",
                            icon: "success",
                            timer: 2000,
                            showConfirmButton: false
                        });
    
                        loadProducts(); // Refresh the product list
                    } else {
                        Swal.fire({
                            title: "Error!",
                            text: data.message || "Error deleting product.",
                            icon: "error"
                        });
                    }
                })
                .catch(error => {
                    console.error("Fetch Error:", error);
                    Swal.fire({
                        title: "Network Error!",
                        text: "An error occurred while deleting the product. Please try again.",
                        icon: "error"
                    });
                });
            }
        });
    }
    
    
    // Edit product function - we'll implement a simplified version
    function editProduct(productId) {
        // Switch to the add product tab
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
    
        document.querySelector('[data-tab="add-product"]').classList.add('active');
        document.getElementById('add-product').classList.add('active');
    
        // Show loader
        document.getElementById('loader').style.display = 'flex';
    
        // Fetch the product details
        fetch(`/products/${productId}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('loader').style.display = 'none'; // Hide loader
    
                if (data.success && data.product) {
                    const product = data.product;
    
                    // Populate the form with product data
                    document.getElementById('productName').value = product.name;
                    document.getElementById('productSKU').value = product.sku || '';
                    document.getElementById('productDescription').value = product.description || '';
                    document.getElementById('productPrice').value = product.price;
                    document.getElementById('productDiscountPrice').value = product.discount_price || '';
                    document.getElementById('productCategory').value = product.category;
                    document.getElementById('productStock').value = product.stock;
                    document.getElementById('productFeatured').checked = product.featured;
    
                    // Clear previous image preview
                    imagePreview.innerHTML = '';
    
                    // Display existing images
                    if (product.images && product.images.length > 0) {
                        product.images.forEach(image => {
                            if (image.url) {
                                const preview = document.createElement('div');
                                preview.className = 'image-preview';
    
                                const img = document.createElement('img');
                                img.src = image.url;
    
                                const removeBtn = document.createElement('div');
                                removeBtn.className = 'remove-image';
                                removeBtn.innerHTML = '×';
                                removeBtn.addEventListener('click', function () {
                                    preview.remove();
                                });
    
                                preview.appendChild(img);
                                preview.appendChild(removeBtn);
                                imagePreview.appendChild(preview);
                            }
                        });
                    }
    
                    // Set form attributes to indicate editing mode
                    productForm.setAttribute('data-editing', 'true');
                    productForm.setAttribute('data-product-id', productId);
    
                    // Change the submit button text to "Update Product"
                    document.getElementById('saveProduct').textContent = 'Update Product';
                } else {
                    showError(data.message || 'Error loading product details');
                }
            })
            .catch(error => {
                document.getElementById('loader').style.display = 'none'; // Hide loader
                showError('Network error. Please try again.');
                console.error('Error:', error);
            });
    }    
    
    // Show success message
    function showSuccess(message) {
        Swal.fire({
            title: "Success!",
            text: message,
            icon: "success",
            confirmButtonText: "OK"
        });
    }
    
    
    // Show error message
    function showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
});