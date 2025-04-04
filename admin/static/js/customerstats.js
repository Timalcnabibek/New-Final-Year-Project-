// Fetch customer statistics and update the UI
function fetchCustomerStats() {
    fetch('/api/customers/stats')
        .then(response => response.json())
        .then(data => {
            // Update total customers count
            document.getElementById('totalCustomersCount').textContent = data.totalCustomers;
            
            // Update active customers count
            document.getElementById('activeCustomersCount').textContent = data.activeCustomers;
            
            // Update customer growth percentage dynamically
            const growthElement = document.getElementById("customerGrowth");
            growthElement.textContent = `+${data.customerGrowthPercentage}%`;

            // Change color based on growth (red for negative, green for positive)
            if (data.customerGrowthPercentage < 0) {
                growthElement.classList.remove("positive");
                growthElement.classList.add("negative");
            } else {
                growthElement.classList.remove("negative");
                growthElement.classList.add("positive");
            }
        })
        .catch(error => console.error('Error fetching customer statistics:', error));
}

// Fetch stats every 5 seconds to update UI dynamically
setInterval(fetchCustomerStats, 5000);

// Run function when page loads
document.addEventListener('DOMContentLoaded', fetchCustomerStats);
