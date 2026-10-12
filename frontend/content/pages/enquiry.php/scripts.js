(function runWhenReady() {
  function init() {
document.addEventListener('DOMContentLoaded', function() {
    // Phone validation
    const phoneInput = document.getElementById('phone');
    const phoneError = document.getElementById('phone-error');
    const submitBtn = document.getElementById('submit-btn');
    
    // Bogus patterns to check against
    const bogusPatterns = [
        '1234567890', '0123456789', '9876543210', '1111111111',
        '2222222222', '3333333333', '4444444444', '5555555555',
        '6666666666', '7777777777', '8888888888', '9999999999',
        '0000000000', '1212121212', '1010101010', '0987654321'
    ];
    
    function validatePhone(phone) {
        // Remove all non-numeric characters
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        // Check length
        if (cleanPhone.length !== 10) {
            return { valid: false, message: 'Mobile number must be exactly 10 digits' };
        }
        
        // Check if starts with valid digit
        const firstDigit = cleanPhone.charAt(0);
        if (!['6', '7', '8', '9'].includes(firstDigit)) {
            return { valid: false, message: 'Mobile number must start with 6, 7, 8, or 9' };
        }
        
        // Check for bogus patterns
        if (bogusPatterns.includes(cleanPhone)) {
            return { valid: false, message: 'Please enter a valid mobile number' };
        }
        
        // Check for too many repeating digits
        for (let i = 0; i <= 9; i++) {
            const count = (cleanPhone.match(new RegExp(i.toString(), 'g')) || []).length;
            if (count > 6) {
                return { valid: false, message: 'Please enter a valid mobile number' };
            }
        }
        
        return { valid: true, message: '' };
    }
    
    function showError(message) {
        phoneInput.classList.add('is-invalid');
        phoneError.textContent = message;
        phoneError.style.display = 'block';
        submitBtn.disabled = true;
    }
    
    function hideError() {
        phoneInput.classList.remove('is-invalid');
        phoneInput.classList.add('is-valid');
        phoneError.style.display = 'none';
        submitBtn.disabled = false;
    }
    
    // Real-time validation
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            // Allow only numbers
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Limit to 10 digits
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
            
            const validation = validatePhone(this.value);
            
            if (this.value.length === 10) {
                if (!validation.valid) {
                    showError(validation.message);
                } else {
                    hideError();
                }
            } else if (this.value.length > 0) {
                phoneInput.classList.remove('is-valid', 'is-invalid');
                phoneError.style.display = 'none';
                submitBtn.disabled = false;
            } else {
                phoneInput.classList.remove('is-valid', 'is-invalid');
                phoneError.style.display = 'none';
                submitBtn.disabled = false;
            }
        });
        
        // Prevent paste of non-numeric content
        phoneInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const numericPaste = paste.replace(/[^0-9]/g, '');
            if (numericPaste.length <= 10) {
                this.value = numericPaste;
                this.dispatchEvent(new Event('input'));
            }
        });
        
        // Initialize validation state
        if (phoneInput.value) {
            phoneInput.dispatchEvent(new Event('input'));
        }
    }
    
    // Form submission validation
    const enquiryForm = document.getElementById('enquiry-form');
    if (enquiryForm) {
        enquiryForm.addEventListener('submit', function(e) {
            if (phoneInput) {
                const validation = validatePhone(phoneInput.value);
                if (!validation.valid) {
                    e.preventDefault();
                    showError(validation.message);
                    phoneInput.focus();
                    return false;
                }
            }
        });
    }
    
        // State loading based on country selection
    const countryDropdown = document.getElementById('country_id');
    if (countryDropdown) {
        countryDropdown.addEventListener('change', function() {
            const countryId = this.value;
            const stateDropdown = document.getElementById('state_id');
            
            // Clear current options
            stateDropdown.innerHTML = '<option value="">Select State</option>';
            
            if (countryId) {
                // Show loading indicator
                stateDropdown.innerHTML = '<option value="">Loading states...</option>';
                
                // Debug
                console.log('Fetching states for country ID:', countryId);
                
                // Construct the URL with the country ID
                const url = '/api/get_states.php?country_id=' + encodeURIComponent(countryId);
                console.log('API URL:', url);
                
                // Fetch states for the selected country
                fetch(url)
                    .then(response => {
                        console.log('Response status:', response.status);
                        return response.json();
                    })
                    .then(data => {
                        console.log('API response:', data);
                        
                        // Reset dropdown
                        stateDropdown.innerHTML = '<option value="">Select State</option>';
                        
                        // Add state options if available
                        if (data.success && data.states && data.states.length > 0) {
                            data.states.forEach(state => {
                                const option = document.createElement('option');
                                option.value = state.id;
                                option.textContent = state.state_name;
                                stateDropdown.appendChild(option);
                            });
                        } else {
                            stateDropdown.innerHTML = '<option value="">No states available</option>';
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching states:', error);
                        stateDropdown.innerHTML = '<option value="">Error loading states</option>';
                    });
            }
        });
    }
    
    // Word counter for remarks
    const remarksField = document.getElementById('remarks');
    if (remarksField) {
        function countWords() {
            const text = remarksField.value;
            const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
            const wordCountDisplay = document.getElementById('word-count');
            
            if (wordCountDisplay) {
                wordCountDisplay.textContent = wordCount;
                
                // Visual indication if exceeding limit
                if (wordCount > 200) {
                    wordCountDisplay.classList.add('text-danger');
                    wordCountDisplay.classList.add('fw-bold');
                    
                    // Optional: Show warning
                    if (!document.getElementById('word-limit-warning')) {
                        const warningDiv = document.createElement('div');
                        warningDiv.id = 'word-limit-warning';
                        warningDiv.className = 'text-danger small';
                        warningDiv.textContent = 'Please limit your remarks to 200 words.';
                        remarksField.parentNode.appendChild(warningDiv);
                    }
                } else {
                    wordCountDisplay.classList.remove('text-danger');
                    wordCountDisplay.classList.remove('fw-bold');
                    
                    // Remove warning if exists
                    const warningDiv = document.getElementById('word-limit-warning');
                    if (warningDiv) {
                        warningDiv.remove();
                    }
                }
            }
        }
        
        // Initial word count
        countWords();
        
        // Update count on input
        remarksField.addEventListener('input', countWords);
    }
    
    // Pincode validation
    const pincodeField = document.getElementById('pincode');
    if (pincodeField) {
        const validationPattern = '';
        
        pincodeField.addEventListener('input', function() {
            const pincode = this.value.trim();
            const pincodeError = document.getElementById('pincode-error');
            
            if (validationPattern && pincode && pincodeError) {
                try {
                    const regex = new RegExp(validationPattern);
                    const isValid = regex.test(pincode);
                    
                    if (!isValid) {
                        pincodeError.textContent = 'Please enter a valid pincode format';
                        pincodeError.style.display = 'block';
                        this.classList.add('is-invalid');
                        this.classList.remove('is-valid');
                    } else {
                        pincodeError.style.display = 'none';
                        this.classList.remove('is-invalid');
                        this.classList.add('is-valid');
                    }
                } catch (e) {
                    console.error('Invalid regex pattern:', e);
                }
            }
        });
    }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();