document.addEventListener("DOMContentLoaded", function () {
    // Mobile menu toggle
    const menuToggle = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu");

    if (menuToggle && navMenu) {
        menuToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            navMenu.classList.toggle("show");
        });

        document.addEventListener("click", function (event) {
            if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
                navMenu.classList.remove("show");
            }
        });
    }

    // Tab Switching
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            this.classList.add("active");

            document.querySelectorAll(".tab-content").forEach(content => {
                content.classList.remove("active");
            });

            const tabId = this.getAttribute("data-tab");
            document.getElementById(tabId).classList.add("active");
        });
    });

    // Image Upload Preview
    const fileUpload = document.getElementById("productImages");
    const imagePreview = document.getElementById("imagePreview");

    if (fileUpload && imagePreview) {
        fileUpload.addEventListener("change", function (e) {
            imagePreview.innerHTML = "";
            const files = Array.from(e.target.files).slice(0, 5);

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const previewItem = document.createElement("div");
                    previewItem.className = "preview-item";

                    const img = document.createElement("img");
                    img.src = event.target.result;

                    const removeBtn = document.createElement("div");
                    removeBtn.className = "remove";
                    removeBtn.innerHTML = "x";
                    removeBtn.addEventListener("click", function (e) {
                        e.stopPropagation();
                        previewItem.remove();
                    });

                    previewItem.appendChild(img);
                    previewItem.appendChild(removeBtn);
                    imagePreview.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // Stock Input Controls
    const stockInput = document.getElementById("productStock");
    const minusBtn = document.querySelector(".stock-btn.minus");
    const plusBtn = document.querySelector(".stock-btn.plus");

    if (stockInput && minusBtn && plusBtn) {
        minusBtn.addEventListener("click", function () {
            const currentValue = parseInt(stockInput.value) || 0;
            if (currentValue > 0) stockInput.value = currentValue - 1;
        });

        plusBtn.addEventListener("click", function () {
            const currentValue = parseInt(stockInput.value) || 0;
            stockInput.value = currentValue + 1;
        });
    }

    // Form Submission
    const productForm = document.getElementById("productForm");

    if (productForm) {
        productForm.addEventListener("submit", function (e) {
            e.preventDefault();

            // Show loader
            document.getElementById("saveLoader").style.display = "inline-block";

            // Collect form data
            const formData = new FormData();
            formData.append("name", document.getElementById("productName").value);
            formData.append("sku", document.getElementById("productSKU").value);
            formData.append("description", document.getElementById("productDescription").value);
            formData.append("price", document.getElementById("productPrice").value);
            formData.append("discountPrice", document.getElementById("productDiscountPrice").value);
            formData.append("category", document.getElementById("productCategory").value);
            formData.append("stock", document.getElementById("productStock").value);
            formData.append("season", document.getElementById("productSeason").value);
            formData.append("material", document.getElementById("productMaterial").value);
            formData.append("releaseDate", document.getElementById("productReleaseDate").value);
            formData.append("weight", document.getElementById("productWeight").value);

            // Convert checkboxes to true/false
            formData.append("featured", document.getElementById("productFeatured").checked);
            formData.append("trending", document.getElementById("productTrending").checked);

            // Collect multi-select values (sizes, colors, tags)
            document.querySelectorAll('input[name="productSize"]:checked').forEach(cb => {
                formData.append("sizes", cb.value);
            });

            formData.append("colors", document.getElementById("productColor").value.split(",").map(c => c.trim()));
            formData.append("tags", document.getElementById("productTags").value.split(",").map(t => t.trim()));

            // Handle image uploads
            const imageFiles = document.getElementById("productImages").files;
            for (let i = 0; i < imageFiles.length && i < 5; i++) {
                formData.append("images", imageFiles[i]);
            }

            // Determine if this is an Add or Edit operation
            let url = '/products';
            let method = 'POST';

            if (productForm.dataset.mode === 'edit' && productForm.dataset.productId) {
                url = `/products/${productForm.dataset.productId}`;
                method = 'PUT';
            }

            // Send Data
            fetch(url, {
                method: method,
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    document.getElementById("saveLoader").style.display = "none";

                    if (data.success) {
                        Swal.fire({
                            icon: "success",
                            title: productForm.dataset.mode === "edit" ? "Product Updated!" : "Product Added!",
                            text: "Your product has been successfully saved.",
                            timer: 2000
                        });

                        productForm.reset();
                        imagePreview.innerHTML = "";

                        // Reset Form Mode
                        productForm.dataset.mode = "add";
                        delete productForm.dataset.productId;

                        // Reload Product List
                        loadProducts();
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: data.message || "Error saving product. Please try again."
                        });
                    }
                })
                .catch(error => {
                    console.error("Error:", error);
                    document.getElementById("saveLoader").style.display = "none";

                    Swal.fire({
                        icon: "error",
                        title: "Network Error",
                        text: "Please check your connection and try again."
                    });
                });
        });
    }

    // Function to load all products
    function loadProducts() {
        const productsList = document.getElementById("productsList");
        if (!productsList) return;

        fetch('/products')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    productsList.innerHTML = "";
                    data.products.forEach(product => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${product.name}</td>
                            <td>${product.sku || "-"}</td>
                            <td>${product.category || "-"}</td>
                            <td>$${product.price}</td>
                            <td>${product.stock}</td>
                        `;
                        productsList.appendChild(row);
                    });
                }
            });
    }
});
