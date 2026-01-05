// Client-side JavaScript for handling orders
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('orderForm');
    const productSelect = document.getElementById('product');
    const quantityInput = document.getElementById('quantity');
    const quantityGroup = document.getElementById('quantityGroup');
    const totalCostSpan = document.getElementById('totalCost');
    const prefillButton = document.getElementById('prefillButton');
    const orderDateDisplay = document.getElementById('orderDateDisplay');
    const buyerInput = document.getElementById('buyer');

    // API success/error messages
    const apiMessageContainer = document.createElement('div');
    apiMessageContainer.id = 'api-message-container';

    // Insert the message container right before the form
    if (form) {
        form.parentNode.insertBefore(apiMessageContainer, form);
    }

    // Task 5
    if (buyerInput && document.cookie.includes('customer_name=')) {
        const cookies = document.cookie.split('; ');
        for (const cookie of cookies) {
            if (cookie.startsWith('customer_name=')) {
                let name = cookie.substring('customer_name='.length);
                name = decodeURIComponent(name.replace(/\+/g, ' ')); 
                buyerInput.value = name;
                break;
            }
        }
    }

    // Set and Submit Current Date
    function displayCurrentDate() {
        const now = new Date();
        const dateTimeString = now.toLocaleString(); // Format date/time for display

        if (orderDateDisplay) {
            orderDateDisplay.textContent = dateTimeString;
        }

        let hiddenDateInput = document.getElementById('orderDateHidden');
        
        if (!hiddenDateInput) {
            hiddenDateInput = document.createElement('input');
            hiddenDateInput.type = 'hidden';
            hiddenDateInput.id = 'orderDateHidden';
            hiddenDateInput.name = 'order_date'; 
            form.appendChild(hiddenDateInput);
        }

        const serverDateFormat = now.getFullYear() + '-' + 
                                (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                                now.getDate().toString().padStart(2, '0') + ' ' + 
                                now.getHours().toString().padStart(2, '0') + ':' + 
                                now.getMinutes().toString().padStart(2, '0') + ':' + 
                                now.getSeconds().toString().padStart(2, '0');
        
        hiddenDateInput.value = serverDateFormat;
    }

    // Cost Calculation and Quantity Visibility
    function calculateTotalCost() {
        const selectedOption = productSelect.options[productSelect.selectedIndex];
        const price = parseFloat(selectedOption.getAttribute('data-cost'));
        let quantity = parseInt(quantityInput.value);

        if (isNaN(price) || price <= 0) {
            totalCostSpan.textContent = '$0.00';
            quantityGroup.classList.add('hidden');
            return;
        }

        if (productSelect.value) {
            quantityGroup.classList.remove('hidden');
        } else {
            quantityGroup.classList.add('hidden');
        }

        if (isNaN(quantity) || quantity < 1) {
            quantity = 1;
            quantityInput.value = 1;
        }

        const total = price * quantity;
        totalCostSpan.textContent = `$${total.toFixed(2)}`;
    }

    // Attach listeners for changes
    productSelect.addEventListener('change', calculateTotalCost);
    quantityInput.addEventListener('input', calculateTotalCost);

    displayCurrentDate(); // Display the date on load
    calculateTotalCost();


    // Prefill Form Functionality
    if (prefillButton) {
        prefillButton.addEventListener('click', (event) => {
            event.preventDefault(); 
            
            document.getElementById('buyer').value = 'Test User';
            document.getElementById('address').value = "Hedwig: 123 1st St Nowhere, MN 55555";
            productSelect.value = "The Sentinel Bifocal"; 
            quantityInput.value = 2;

            document.getElementById('shippingExpedited').checked = true;

            calculateTotalCost();
        });
    }

    // Task 3
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop the default HTML form submission!

            // Clear previous messages
            apiMessageContainer.innerHTML = '';
            apiMessageContainer.className = '';

            // Collect form data and structure it for JSON
            const formData = new FormData(form);
            const orderData = {};
            
            // Map form fields to the required API JSON structure
            for (const [key, value] of formData.entries()) {
                // Map 'buyer' field name to 'from_name' for the API
                const api_key = (key === 'buyer') ? 'from_name' : key;
                
                if (api_key === 'quantity') {
                    orderData[api_key] = parseInt(value);
                } else if (api_key !== 'order_date') {
                    orderData[api_key] = value;
                }
            }
            
            // Send the data using fetch to the API endpoint
            try {
                const response = await fetch('/api/order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // Convert the JavaScript object to a JSON string
                    body: JSON.stringify(orderData) 
                });

                // Read the JSON response
                const apiResponse = await response.json();

                // Handle the response based on the HTTP status code
                if (response.ok) { // Status 201 Created
                    apiMessageContainer.className = 'api-message api-success';
                    apiMessageContainer.innerHTML = `
                        <h2>Order Placed Successfully!</h2>
                        <p>Order ID: <strong><a href="/tracking/${apiResponse.order_id}">${apiResponse.order_id}</a>.</strong></p>
                    `;
                    form.reset(); 
                    calculateTotalCost();

                } else { // Status 400 Bad Request, 413 Too Large, whatever else.
                    apiMessageContainer.className = 'api-message api-error';
                    
                    let errorHtml = `<h2>Order Submission Failed (Status ${response.status})</h2>`;
                    
                    if (response.status === 413) {
                        errorHtml += `<p>${apiResponse.errors ? apiResponse.errors[0] : response.statusText}.</p>`;
                    } else if (apiResponse.errors && Array.isArray(apiResponse.errors)) {
                        errorHtml += '<p>Please correct the following issues:</p><ul>';
                        apiResponse.errors.forEach(err => {
                            errorHtml += `<li>${err}</li>`;
                        });
                        errorHtml += '</ul>';
                    } else {
                        // Fallback for general errors
                        errorHtml += `<p>An unexpected error occurred. Check server logs.</p>`;
                    }
                    apiMessageContainer.innerHTML = errorHtml;
                }

            } catch (error) {
                // Handle network error
                apiMessageContainer.className = 'error-message';
                apiMessageContainer.innerHTML = `<h2>Network Error</h2><p>Could not connect to the server or process the request.</p>`;
            }
        });
    }
});
