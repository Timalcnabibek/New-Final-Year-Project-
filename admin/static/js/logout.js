document.getElementById("logoutButton").addEventListener("click", function(event) {
    event.preventDefault(); // Prevent default link behavior

    Swal.fire({
        title: "Are you sure?",
        text: "Do you really want to log out?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, Logout!",
        cancelButtonText: "Cancel"
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "/logout"; // Redirect to logout URL
        }
    });
});