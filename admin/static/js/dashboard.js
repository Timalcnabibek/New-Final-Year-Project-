document.addEventListener("DOMContentLoaded", function () {
  // SALES CHART (STATIC DATA)
  const salesCtx = document.getElementById("salesChart").getContext("2d");
  const salesChart = new Chart(salesCtx, {
    type: "line",
    data: {
      labels: [
        "Mar 13",
        "Mar 14",
        "Mar 15",
        "Mar 16",
        "Mar 17",
        "Mar 18",
        "Mar 19",
        "Mar 20",
        "Mar 21",
        "Mar 22",
        "Mar 23",
        "Mar 24",
        "Mar 25",
        "Mar 26",
        "Mar 27",
        "Mar 28",
        "Mar 29",
        "Mar 30",
        "Mar 31",
        "Apr 1",
        "Apr 2",
      ],
      datasets: [
        {
          label: "Historical Sales",
          data: [
            16000,
            14000,
            15000,
            17000,
            19000,
            18000,
            16000,
            15000,
            14000,
            13000,
            12000,
            11000,
            11500,
            12000,
            12500,
            13000,
            12000,
            11000,
            10500,
            null,
            null,
          ],
          borderColor: "rgba(74, 134, 232, 0.8)",
          backgroundColor: "rgba(74, 134, 232, 0.2)",
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4,
        },
        {
          label: "Sales Forecast",
          data: [
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            16000,
            18000,
            20000,
            19000,
            21000,
            18000,
            20000,
            22000,
            24000,
            19000,
            20000,
            21000,
            22000,
            20000,
          ],
          borderColor: "rgba(156, 39, 176, 0.8)",
          backgroundColor: "rgba(156, 39, 176, 0.2)",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          min: 0,
          max: 32000,
          ticks: {
            callback: function (value) {
              if (value === 0) return "$0k";
              if (value === 8000) return "$8k";
              if (value === 16000) return "$16k";
              if (value === 24000) return "$24k";
              if (value === 32000) return "$32k";
              return "";
            },
          },
          grid: {
            drawBorder: false,
          },
        },
        x: {
          grid: {
            display: true,
            drawBorder: false,
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index", intersect: false },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    },
  });

  // CUSTOMER CHART (DYNAMIC FROM API)
  const customerCtx = document.getElementById("customerChart").getContext("2d");

  fetch("http://localhost:5000/api/customers")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const customers = data.customers;

        let active = 0,
          inactive = 0,
          pending = 0;
        customers.forEach((c) => {
          const status = c.status?.toLowerCase();
          if (status === "active") active++;
          else if (status === "inactive") inactive++;
          else if (status === "pending") pending++;
        });

        const total = active + inactive + pending;

        // Update total customer count
        document.querySelector(".customer-total").textContent =
          total.toLocaleString();

        // Update percentage values
        const segments = document.querySelectorAll(".customer-segment");
        if (segments.length >= 3) {
          segments[0].children[1].textContent = `${Math.round((pending / total) * 100)}%`;
          segments[1].children[1].textContent = `${Math.round((active / total) * 100)}%`;
          segments[2].children[1].textContent = `${Math.round((inactive / total) * 100)}%`;
        }

        // Render updated customer chart
        new Chart(customerCtx, {
          type: "doughnut",
          data: {
            labels: [
              "Pending Customers",
              "Active Customers",
              "Inactive Customers",
            ],
            datasets: [
              {
                data: [pending, active, inactive],
                backgroundColor: ["#ffca28", "#4caf50", "#e53935"],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return context.label + ": " + context.parsed;
                  },
                },
              },
            },
          },
        });
      }
    })
    .catch((err) => {
      console.error("Failed to fetch customer data:", err);
    });

  // Tab switching for line chart
  const tabs = document.querySelectorAll(".view-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      tabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      const tabText = this.textContent.trim();
      if (tabText === "Historical Sales") {
        salesChart.data.datasets[0].hidden = false;
        salesChart.data.datasets[1].hidden = true;
      } else if (tabText === "Sales Forecast") {
        salesChart.data.datasets[0].hidden = true;
        salesChart.data.datasets[1].hidden = false;
      } else {
        salesChart.data.datasets[0].hidden = false;
        salesChart.data.datasets[1].hidden = false;
      }

      salesChart.update();
    });
  });
});
// </script>
