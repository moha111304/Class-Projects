// Client-side JavaScript for handling updates
const SHIPPING_DURATION_MS = 5 * 60 * 1000; 

let countdownInterval;

// Helper function to format time in "Xm Ys"
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Use Math.max to ensure time is not negative if the server clock lags
    return `${Math.max(0, minutes)}m ${Math.max(0, seconds)}s`;
}

// Function to calculate and update the countdown display
function updateCountdown() {
    const timerElement = document.getElementById('countdown-timer');
    const buttonsContainer = document.querySelector('.tracking-buttons');

    if (!timerElement) {
        // Stop if the timer element isn't present (e.g., status is Shipped/Delivered/Cancelled)
        clearInterval(countdownInterval);
        return;
    }

    const orderDateStr = timerElement.getAttribute('data-order-date');
    
    // Format: "YYYY-MM-DD HH:MM:SS"
    const orderDate = new Date(orderDateStr.replace(' ', 'T')); 
    
    // Get the target shipment time
    const shipmentTime = orderDate.getTime() + SHIPPING_DURATION_MS;
    const now = new Date().getTime();
    
    // Remaining time in milliseconds
    let remainingTime = shipmentTime - now;

    if (remainingTime <= 0) {
        // If shipment time reached or passed
        timerElement.textContent = "Order Shipped";
        if (buttonsContainer) {
             // Remove buttons as the order is no longer Placed/eligible for client-side action
            buttonsContainer.style.display = 'none'; 
        }
        clearInterval(countdownInterval);
        return;
    }

    timerElement.textContent = formatTime(remainingTime);
}

// Global functions for showing/hiding the update form
function showUpdateForm() {
    const container = document.getElementById('update-shipping-container');    
    // Add the 'show' class to apply the visible (display: flex) styling
    container.classList.add('show'); 
}

// Function to hide the form
function hideUpdateForm() {
    const container = document.getElementById('update-shipping-container');
    // Remove the 'show' class to apply the hidden (display: none) styling
    container.classList.remove('show'); 
}

// Start the countdown timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Run once immediately, then set interval
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
    // --- HW4 TASK 4: CANCEL ORDER VIA DELETE API ---
    const cancelButton = document.getElementById('cancel-order-btn');
    const orderManagementBox = document.querySelector('.order-management-box'); // Parent container
    const orderDetailsStatus = document.querySelector('.order-details-box table tr:nth-child(4) td:nth-child(2)'); // Element displaying current status
    const updateShippingContainer = document.getElementById('update-shipping-container');
    
    // Error message container (assumed to exist in HTML)
    const apiErrorMessage = document.getElementById('api-error-message');
    
    // Get the order ID from the button's data attribute
    const orderId = cancelButton ? cancelButton.getAttribute('data-order-id') : null;

    if (!cancelButton || !orderId) return; // Exit if not on a trackable page

    cancelButton.addEventListener('click', async () => {
        apiErrorMessage.innerHTML = '';
        apiErrorMessage.className = '';

        try {
            const response = await fetch('/api/cancel_order', {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Send the order ID in the body
                body: JSON.stringify({ order_id: parseInt(orderId) })
            });

            if (response.status === 204) {                
                // Update the status display in the details table
                if (orderDetailsStatus) {
                    orderDetailsStatus.textContent = 'Cancelled';
                }
                
                // Clear the action buttons (Cancel/Update Shipping)
                const actionButtons = document.getElementById('action-buttons');
                if (actionButtons) actionButtons.innerHTML = '';
                
                // Hide the update form
                if (updateShippingContainer) updateShippingContainer.classList.add('update-shipping-form-hidden');
                
                // Update the countdown timer area
                const timerElement = document.getElementById('countdown-timer');
                if (timerElement) {
                    timerElement.textContent = 'Order Cancelled';
                    clearInterval(countdownInterval); // Stop the timer
                }

                // Display a success message near the top
                const confirmationBox = document.querySelector('.confirmation-box');
                if (confirmationBox) {
                    confirmationBox.innerHTML = '<h2>Order Cancelled</h2><p>This order was successfully cancelled and will not be shipped.</p>';
                    confirmationBox.classList.add('cancelled');
                }

            } else if (response.status === 404) {
                // Not found
                apiErrorMessage.className = 'error-message';
                apiErrorMessage.textContent = 'Cancellation failed: The order cannot be found.';
            
            } else if (response.status === 400) {
                // Invalid ID format or order is already processed/cancelled
                apiErrorMessage.className = 'error-message';
                apiErrorMessage.textContent = 'Cancellation failed: This order is ineligible for cancellation (it may be cancelled, shipped, or delivered).';
            
            } else {
                // Other server error (500)
                apiErrorMessage.className = 'error-message';
                apiErrorMessage.textContent = `Cancellation failed due to a server error (Status: ${response.status}).`;
            }

        } catch (error) {
            apiErrorMessage.className = 'error-message';
            apiErrorMessage.textContent = 'Network error during cancellation.';
        }
    });
});