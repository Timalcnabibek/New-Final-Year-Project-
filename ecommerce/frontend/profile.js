function toggleDropdown(event) {
    event.preventDefault();
    const dropdown = document.getElementById("profileDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

// Close dropdown when clicking outside
document.addEventListener("click", function(event) {
    const dropdown = document.getElementById("profileDropdown");
    const profileIcon = document.querySelector(".profile-icon");
    if (!profileIcon.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = "none";
    }
});

function logout() {
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
        // Remove customerId from localStorage
        localStorage.removeItem("customerId");

        // Show a success message
        Swal.fire({
            title: "Logged Out!",
            text: "You have been successfully logged out.",
            icon: "success",
            timer: 2000, // Auto-close in 2 seconds
            showConfirmButton: false
        });

        // Redirect to login page after 2 seconds
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    }
});
}