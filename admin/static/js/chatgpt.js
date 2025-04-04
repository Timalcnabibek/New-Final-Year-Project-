document.addEventListener("DOMContentLoaded", function () {
    fetchCustomers();

    document.getElementById("add-customer-form").addEventListener("submit", function (event) {
        event.preventDefault();
        addCustomer();
    });
});

function fetchCustomers() {
    fetch("/customers")
        .then(response => response.json())
        .then(data => {
            document.getElementById("total-customers").innerText = data.length;
            const table = document.getElementById("customer-table");
            table.innerHTML = "";
            data.forEach(customer => {
                table.innerHTML += `
                    <tr>
                        <td>${customer.username}</td>
                        <td>${customer.email}</td>
                        <td>${customer.phone}</td>
                        <td>
                            <button onclick="deleteCustomer('${customer._id}')">Delete</button>
                        </td>
                    </tr>
                `;
            });
        });
}

function addCustomer() {
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;

    fetch("/add_customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, phone })
    }).then(response => response.json())
      .then(() => fetchCustomers());
}

function deleteCustomer(id) {
    fetch(`/delete_customer/${id}`, { method: "DELETE" })
        .then(() => fetchCustomers());
}
