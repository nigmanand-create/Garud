(function runWhenReady() {
  function init() {
// Number formatting function based on settings
function formatNumber(num) {
    const format = 'indian';
    const currency = '₹';
    
    if (format === 'indian') {
        // Indian number format (12,34,567)
        const formatter = new Intl.NumberFormat('en-IN');
        return currency + formatter.format(num);
    } else {
        // International format (1,234,567)
        const formatter = new Intl.NumberFormat('en-US');
        return currency + formatter.format(num);
    }
}

// EMI Calculation
function calculateEMI() {
    const principal = parseFloat(document.getElementById('loanAmount').value);
    const rate = parseFloat(document.getElementById('interestRate').value);
    const tenure = parseInt(document.getElementById('loanTenure').value);
    
    const monthlyRate = rate / 100 / 12;
    let emi, totalPayment, totalInterest;
    
    if (monthlyRate === 0) {
        emi = principal / tenure;
        totalPayment = principal;
        totalInterest = 0;
    } else {
        emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
        totalPayment = emi * tenure;
        totalInterest = totalPayment - principal;
    }
    
    // Update display
    document.getElementById('emiAmount').textContent = formatNumber(Math.round(emi));
    document.getElementById('totalInterest').textContent = formatNumber(Math.round(totalInterest));
    document.getElementById('totalPayment').textContent = formatNumber(Math.round(totalPayment));
    
    // Update chart
    updateEMIChart(principal, totalInterest);
    
    // Update amortization if enabled
        updateAmortizationSchedule(principal, rate, tenure, emi);
    }

// Update EMI Chart
function updateEMIChart(principal, interest) {
    const ctx = document.getElementById('emiChart').getContext('2d');
    
    if (window.emiChartInstance) {
        window.emiChartInstance.destroy();
    }
    
    window.emiChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Principal', 'Interest'],
            datasets: [{
                data: [principal, interest],
                backgroundColor: ['#3b82f6', '#1e40af'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Sync sliders with inputs
function syncInputs() {
    // Loan Amount
    const loanAmount = document.getElementById('loanAmount');
    const loanAmountSlider = document.getElementById('loanAmountSlider');
    
    loanAmount.addEventListener('input', function() {
        loanAmountSlider.value = this.value;
        calculateEMI();
    });
    
    loanAmountSlider.addEventListener('input', function() {
        loanAmount.value = this.value;
        calculateEMI();
    });
    
    // Interest Rate
    const interestRate = document.getElementById('interestRate');
    const interestRateSlider = document.getElementById('interestRateSlider');
    
    interestRate.addEventListener('input', function() {
        interestRateSlider.value = this.value;
        calculateEMI();
    });
    
    interestRateSlider.addEventListener('input', function() {
        interestRate.value = this.value;
        calculateEMI();
    });
    
    // Loan Tenure
    const loanTenure = document.getElementById('loanTenure');
    const loanTenureSlider = document.getElementById('loanTenureSlider');
    
    loanTenure.addEventListener('input', function() {
        loanTenureSlider.value = this.value;
        calculateEMI();
    });
    
    loanTenureSlider.addEventListener('input', function() {
        loanTenure.value = this.value;
        calculateEMI();
    });
}

// Amortization Schedule
function updateAmortizationSchedule(principal, rate, tenure, emi) {
    const loader = document.getElementById('amortizationLoader');
    const tableContainer = document.getElementById('amortizationTable');
    
    loader.style.display = 'block';
    tableContainer.innerHTML = '';
    
    setTimeout(() => {
        const monthlyRate = rate / 100 / 12;
        let balance = principal;
        let yearlyData = {};
        let currentYear = 1;
        
        let html = '<table class="amortization-table">';
        html += '<thead><tr>';
        html += '<th>Year</th><th>Month</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Balance</th>';
        html += '</tr></thead><tbody>';
        
        for (let month = 1; month <= tenure; month++) {
            const interest = balance * monthlyRate;
            const principalPayment = emi - interest;
            balance -= principalPayment;
            
            if (month === tenure && Math.abs(balance) < 1) {
                balance = 0;
            }
            
            const year = Math.ceil(month / 12);
            
            if (!yearlyData[year]) {
                yearlyData[year] = {
                    principal: 0,
                    interest: 0,
                    balance: balance
                };
            }
            
            yearlyData[year].principal += principalPayment;
            yearlyData[year].interest += interest;
            yearlyData[year].balance = balance;
            
            // Show only first and last month of each year for brevity
            if (month % 12 === 1 || month % 12 === 0 || month === tenure) {
                html += '<tr>';
                html += '<td>' + year + '</td>';
                html += '<td>' + month + '</td>';
                html += '<td>' + formatNumber(Math.round(emi)) + '</td>';
                html += '<td>' + formatNumber(Math.round(principalPayment)) + '</td>';
                html += '<td>' + formatNumber(Math.round(interest)) + '</td>';
                html += '<td>' + formatNumber(Math.round(Math.max(0, balance))) + '</td>';
                html += '</tr>';
            }
        }
        
        html += '</tbody></table>';
        
        tableContainer.innerHTML = html;
        loader.style.display = 'none';
    }, 500);
}

// Eligibility Calculator
function calculateEligibility() {
    const monthlyIncome = parseFloat(document.getElementById('monthlyIncome').value);
    const existingEmi = parseFloat(document.getElementById('existingEmi').value);
    const rate = parseFloat(document.getElementById('eligibilityRate').value);
    const tenure = parseInt(document.getElementById('eligibilityTenure').value);
    const foir = parseFloat(document.getElementById('foir').value);
    
    const availableEmi = (monthlyIncome * foir / 100) - existingEmi;
    
    if (availableEmi <= 0) {
        document.getElementById('eligibleAmount').textContent = formatNumber(0);
        document.getElementById('availableEmi').textContent = formatNumber(0);
        document.getElementById('maxLoanAmount').textContent = 'Not Eligible';
        updateEligibilityChart(monthlyIncome, existingEmi, 0);
        return;
    }
    
    const monthlyRate = rate / 100 / 12;
    let eligibleAmount;
    
    if (monthlyRate === 0) {
        eligibleAmount = availableEmi * tenure;
    } else {
        eligibleAmount = availableEmi * (Math.pow(1 + monthlyRate, tenure) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, tenure));
    }
    
    document.getElementById('eligibleAmount').textContent = formatNumber(Math.round(eligibleAmount));
    document.getElementById('availableEmi').textContent = formatNumber(Math.round(availableEmi));
    document.getElementById('maxLoanAmount').textContent = formatNumber(Math.round(eligibleAmount));
    
    // Update chart
    updateEligibilityChart(monthlyIncome, existingEmi, availableEmi);
}

// Update Eligibility Chart
function updateEligibilityChart(income, existingEmi, availableEmi) {
    const ctx = document.getElementById('eligibilityChart').getContext('2d');
    
    if (window.eligibilityChartInstance) {
        window.eligibilityChartInstance.destroy();
    }
    
    window.eligibilityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Monthly Income', 'Existing EMI', 'Available for EMI'],
            datasets: [{
                label: 'Amount',
                data: [income, existingEmi, availableEmi],
                backgroundColor: ['#3b82f6', '#e53e3e', '#48bb78']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Loan Comparison
function compareLoans() {
    const loanAmount = parseFloat(document.getElementById('compareLoanAmount').value);
    const options = [];
    
    // Gather all options
    document.querySelectorAll('.comparison-option').forEach((option, index) => {
        const rate = parseFloat(option.querySelector('.compare-rate').value);
        const tenure = parseInt(option.querySelector('.compare-tenure').value);
        
        const monthlyRate = rate / 100 / 12;
        let emi, totalPayment, totalInterest;
        
        if (monthlyRate === 0) {
            emi = loanAmount / tenure;
            totalPayment = loanAmount;
            totalInterest = 0;
        } else {
            emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
            totalPayment = emi * tenure;
            totalInterest = totalPayment - loanAmount;
        }
        
        options.push({
            name: 'Option ' + (index + 1),
            rate: rate,
            tenure: tenure,
            emi: emi,
            totalPayment: totalPayment,
            totalInterest: totalInterest
        });
    });
    
    // Display results
    const tbody = document.getElementById('comparisonTableBody');
    tbody.innerHTML = '';
    
    // Interest Rate row
    let html = '<tr><td><strong>Interest Rate</strong></td>';
    options.forEach(opt => {
        html += '<td>' + opt.rate + '%</td>';
    });
    html += '</tr>';
    
    // Tenure row
    html += '<tr><td><strong>Tenure</strong></td>';
    options.forEach(opt => {
        html += '<td>' + opt.tenure + ' months</td>';
    });
    html += '</tr>';
    
    // EMI row
    html += '<tr><td><strong>Monthly EMI</strong></td>';
    options.forEach(opt => {
        html += '<td>' + formatNumber(Math.round(opt.emi)) + '</td>';
    });
    html += '</tr>';
    
    // Total Interest row
    html += '<tr><td><strong>Total Interest</strong></td>';
    options.forEach(opt => {
        html += '<td>' + formatNumber(Math.round(opt.totalInterest)) + '</td>';
    });
    html += '</tr>';
    
    // Total Payment row
    html += '<tr><td><strong>Total Payment</strong></td>';
    options.forEach(opt => {
        html += '<td>' + formatNumber(Math.round(opt.totalPayment)) + '</td>';
    });
    html += '</tr>';
    
    tbody.innerHTML = html;
    document.getElementById('comparisonResults').style.display = 'block';
    
    // Update comparison chart
    updateComparisonChart(options);
}

// Update Comparison Chart
function updateComparisonChart(options) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    if (window.comparisonChartInstance) {
        window.comparisonChartInstance.destroy();
    }
    
    window.comparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: options.map(opt => opt.name),
            datasets: [
                {
                    label: 'EMI',
                    data: options.map(opt => Math.round(opt.emi)),
                    backgroundColor: '#3b82f6'
                },
                {
                    label: 'Total Interest',
                    data: options.map(opt => Math.round(opt.totalInterest)),
                    backgroundColor: '#1e40af'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Download Excel/CSV functionality
function downloadExcel() {
    const calculatorType = 'emi';
    const siteName = 'DroneHub';
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const fileName = siteName + '_Loan_Calculator_' + dateStr;
    
    if (calculatorType === 'emi') {
        downloadEMICalculatorExcel(fileName);
    } else if (calculatorType === 'eligibility') {
        downloadEligibilityCalculatorExcel(fileName);
    } else if (calculatorType === 'compare') {
        downloadComparisonExcel(fileName);
    }
}

// Download EMI Calculator as Excel/CSV
function downloadEMICalculatorExcel(fileName) {
    const principal = parseFloat(document.getElementById('loanAmount').value);
    const rate = parseFloat(document.getElementById('interestRate').value);
    const tenure = parseInt(document.getElementById('loanTenure').value);
    const currency = '₹';
    
    // Calculate EMI
    const monthlyRate = rate / 100 / 12;
    let emi, totalPayment, totalInterest;
    
    if (monthlyRate === 0) {
        emi = principal / tenure;
        totalPayment = principal;
        totalInterest = 0;
    } else {
        emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
        totalPayment = emi * tenure;
        totalInterest = totalPayment - principal;
    }
    
    // Create CSV content
    let csvContent = "EMI Calculator Report\n";
    csvContent += "Generated by: DroneHub\n";
    csvContent += "Date: " + new Date().toLocaleDateString() + "\n\n";
    
    csvContent += "Loan Details\n";
    csvContent += "Parameter,Value,Currency\n";
    csvContent += "Loan Amount," + principal.toFixed(2) + "," + currency + "\n";
    csvContent += "Interest Rate," + rate + "%,\n";
    csvContent += "Loan Tenure," + tenure + " months,\n\n";
    
    csvContent += "Calculation Results\n";
    csvContent += "Parameter,Value,Currency\n";
    csvContent += "Monthly EMI," + emi.toFixed(2) + "," + currency + "\n";
    csvContent += "Total Interest," + totalInterest.toFixed(2) + "," + currency + "\n";
    csvContent += "Total Payment," + totalPayment.toFixed(2) + "," + currency + "\n\n";
    
    // Add amortization schedule if enabled
        csvContent += "Amortization Schedule\n";
    csvContent += "Month,EMI,Principal,Interest,Balance,Currency\n";
    
    let balance = principal;
    for (let month = 1; month <= tenure; month++) {
        const interest = balance * monthlyRate;
        const principalPayment = emi - interest;
        balance -= principalPayment;
        
        if (month === tenure && Math.abs(balance) < 1) {
            balance = 0;
        }
        
        csvContent += month + "," + 
                     emi.toFixed(2) + "," + 
                     principalPayment.toFixed(2) + "," + 
                     interest.toFixed(2) + "," + 
                     Math.max(0, balance).toFixed(2) + "," +
                     currency + "\n";
    }
        
    // Download the file
    downloadCSV(csvContent, fileName + '.csv');
}

// Download Eligibility Calculator as Excel/CSV
function downloadEligibilityCalculatorExcel(fileName) {
    const monthlyIncome = parseFloat(document.getElementById('monthlyIncome').value);
    const existingEmi = parseFloat(document.getElementById('existingEmi').value);
    const rate = parseFloat(document.getElementById('eligibilityRate').value);
    const tenure = parseInt(document.getElementById('eligibilityTenure').value);
    const foir = parseFloat(document.getElementById('foir').value);
    const currency = '₹';
    
    const availableEmi = (monthlyIncome * foir / 100) - existingEmi;
    const monthlyRate = rate / 100 / 12;
    let eligibleAmount = 0;
    
    if (availableEmi > 0) {
        if (monthlyRate === 0) {
            eligibleAmount = availableEmi * tenure;
        } else {
            eligibleAmount = availableEmi * (Math.pow(1 + monthlyRate, tenure) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, tenure));
        }
    }
    
    // Create CSV content
    let csvContent = "Loan Eligibility Calculator Report\n";
    csvContent += "Generated by: DroneHub\n";
    csvContent += "Date: " + new Date().toLocaleDateString() + "\n\n";
    
    csvContent += "Income Details\n";
    csvContent += "Parameter,Value,Currency\n";
    csvContent += "Monthly Income," + monthlyIncome.toFixed(2) + "," + currency + "\n";
    csvContent += "Existing EMI," + existingEmi.toFixed(2) + "," + currency + "\n";
    csvContent += "FOIR," + foir + "%,\n\n";
    
    csvContent += "Loan Parameters\n";
    csvContent += "Parameter,Value\n";
    csvContent += "Interest Rate," + rate + "%\n";
    csvContent += "Loan Tenure," + tenure + " months\n\n";
    
    csvContent += "Eligibility Results\n";
    csvContent += "Parameter,Value,Currency\n";
    csvContent += "Available EMI," + availableEmi.toFixed(2) + "," + currency + "\n";
    csvContent += "Maximum Loan Amount," + eligibleAmount.toFixed(2) + "," + currency + "\n";
    
    // Download the file
    downloadCSV(csvContent, fileName + '.csv');
}

// Download Comparison as Excel/CSV
function downloadComparisonExcel(fileName) {
    const loanAmount = parseFloat(document.getElementById('compareLoanAmount').value);
    const currency = '₹';
    const options = [];
    
    // Gather all options
    document.querySelectorAll('.comparison-option').forEach((option, index) => {
        const rate = parseFloat(option.querySelector('.compare-rate').value);
        const tenure = parseInt(option.querySelector('.compare-tenure').value);
        
        const monthlyRate = rate / 100 / 12;
        let emi, totalPayment, totalInterest;
        
        if (monthlyRate === 0) {
            emi = loanAmount / tenure;
            totalPayment = loanAmount;
            totalInterest = 0;
        } else {
            emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
            totalPayment = emi * tenure;
            totalInterest = totalPayment - loanAmount;
        }
        
        options.push({
            name: 'Option ' + (index + 1),
            rate: rate,
            tenure: tenure,
            emi: emi,
            totalPayment: totalPayment,
            totalInterest: totalInterest
        });
    });
    
    // Create CSV content
    let csvContent = "Loan Comparison Report\n";
    csvContent += "Generated by: DroneHub\n";
    csvContent += "Date: " + new Date().toLocaleDateString() + "\n\n";
    
    csvContent += "Base Loan Amount," + loanAmount.toFixed(2) + "," + currency + "\n\n";
    
    csvContent += "Comparison Results\n";
    csvContent += "Option,Interest Rate (%),Tenure (months),Monthly EMI,Total Interest,Total Payment,Currency\n";
    
    options.forEach(opt => {
        csvContent += opt.name + "," +
                     opt.rate + "," +
                     opt.tenure + "," +
                     opt.emi.toFixed(2) + "," +
                     opt.totalInterest.toFixed(2) + "," +
                     opt.totalPayment.toFixed(2) + "," +
                     currency + "\n";
    });
    
    // Download the file
    downloadCSV(csvContent, fileName + '.csv');
}

// Helper function to download CSV
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize based on calculator type
document.addEventListener('DOMContentLoaded', function() {
    const calculatorType = 'emi';
    
    if (calculatorType === 'emi') {
        syncInputs();
        calculateEMI();
    } else if (calculatorType === 'eligibility') {
        // Set up eligibility calculator listeners
        document.getElementById('monthlyIncome').addEventListener('input', calculateEligibility);
        document.getElementById('existingEmi').addEventListener('input', calculateEligibility);
        document.getElementById('eligibilityRate').addEventListener('input', calculateEligibility);
        document.getElementById('eligibilityTenure').addEventListener('input', calculateEligibility);
        document.getElementById('foir').addEventListener('input', calculateEligibility);
        
        calculateEligibility();
    } else if (calculatorType === 'prepayment') {
        // Initialize prepayment calculator
        document.getElementById('prepayOutstanding').addEventListener('input', calculatePrepayment);
        document.getElementById('prepayRate').addEventListener('input', calculatePrepayment);
        document.getElementById('prepayTenure').addEventListener('input', calculatePrepayment);
        document.getElementById('prepayAmount').addEventListener('input', calculatePrepayment);
        document.getElementById('prepayOption').addEventListener('change', calculatePrepayment);
        
        calculatePrepayment();
    } else if (calculatorType === 'balance-transfer') {
        // Initialize balance transfer calculator
        calculateBalanceTransfer();
    } else if (calculatorType === 'part-payment') {
        // Initialize part payment calculator
        calculatePartPayment();
    }
});

// Prepayment Calculator Functions
function calculatePrepayment() {
    const outstanding = parseFloat(document.getElementById('prepayOutstanding').value);
    const rate = parseFloat(document.getElementById('prepayRate').value);
    const tenure = parseInt(document.getElementById('prepayTenure').value);
    const prepayAmount = parseFloat(document.getElementById('prepayAmount').value);
    const option = document.getElementById('prepayOption').value;
    
    const monthlyRate = rate / 100 / 12;
    
    // Calculate current EMI
    let currentEMI;
    if (monthlyRate === 0) {
        currentEMI = outstanding / tenure;
    } else {
        currentEMI = outstanding * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
    }
    
    // Calculate original total interest
    const originalTotal = currentEMI * tenure;
    const originalInterest = originalTotal - outstanding;
    
    // New outstanding after prepayment
    const newOutstanding = outstanding - prepayAmount;
    
    let newEMI, newTenure, newTotal, newInterest, savings;
    
    if (option === 'reduce-tenure') {
        // Keep EMI same, reduce tenure
        newEMI = currentEMI;
        if (monthlyRate === 0) {
            newTenure = newOutstanding / currentEMI;
        } else {
            // Calculate new tenure: n = log(EMI / (EMI - P*r)) / log(1+r)
            newTenure = Math.log(currentEMI / (currentEMI - newOutstanding * monthlyRate)) / Math.log(1 + monthlyRate);
        }
        newTenure = Math.ceil(newTenure);
        newTotal = currentEMI * newTenure;
        newInterest = newTotal - newOutstanding;
    } else {
        // Keep tenure same, reduce EMI
        newTenure = tenure;
        if (monthlyRate === 0) {
            newEMI = newOutstanding / tenure;
        } else {
            newEMI = newOutstanding * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
        }
        newTotal = newEMI * tenure;
        newInterest = newTotal - newOutstanding;
    }
    
    savings = originalInterest - newInterest;
    
    // Update display
    document.getElementById('prepaymentSavings').textContent = formatNumber(Math.round(savings));
    document.getElementById('currentEMI').textContent = formatNumber(Math.round(currentEMI));
    
    if (option === 'reduce-tenure') {
        document.getElementById('newEMITenure').textContent = newTenure + ' months';
        document.getElementById('tenureReduction').textContent = 'Tenure reduced by: ' + (tenure - newTenure) + ' months';
    } else {
        document.getElementById('newEMITenure').textContent = formatNumber(Math.round(newEMI));
        document.getElementById('tenureReduction').textContent = 'EMI reduced by: ' + formatNumber(Math.round(currentEMI - newEMI));
    }
    
    document.getElementById('originalInterest').textContent = formatNumber(Math.round(originalInterest));
    document.getElementById('newInterest').textContent = formatNumber(Math.round(newInterest));
    document.getElementById('interestSaved').textContent = formatNumber(Math.round(savings));
    document.getElementById('prepaymentDetails').style.display = 'block';
}

// Balance Transfer Calculator Functions
function calculateBalanceTransfer() {
    const outstanding = parseFloat(document.getElementById('btOutstanding').value);
    const currentRate = parseFloat(document.getElementById('btCurrentRate').value);
    const tenure = parseInt(document.getElementById('btTenure').value);
    const newRate = parseFloat(document.getElementById('btNewRate').value);
    const processingFeePercent = parseFloat(document.getElementById('btProcessingFee').value);
    
    const currentMonthlyRate = currentRate / 100 / 12;
    const newMonthlyRate = newRate / 100 / 12;
    
    // Calculate current EMI
    let currentEMI;
    if (currentMonthlyRate === 0) {
        currentEMI = outstanding / tenure;
    } else {
        currentEMI = outstanding * currentMonthlyRate * Math.pow(1 + currentMonthlyRate, tenure) / 
                    (Math.pow(1 + currentMonthlyRate, tenure) - 1);
    }
    
    // Calculate new EMI
    let newEMI;
    if (newMonthlyRate === 0) {
        newEMI = outstanding / tenure;
    } else {
        newEMI = outstanding * newMonthlyRate * Math.pow(1 + newMonthlyRate, tenure) / 
                 (Math.pow(1 + newMonthlyRate, tenure) - 1);
    }
    
    // Calculate totals
    const currentTotal = currentEMI * tenure;
    const newTotal = newEMI * tenure;
    const processingFee = outstanding * processingFeePercent / 100;
    
    const totalSavings = currentTotal - newTotal;
    const netSavings = totalSavings - processingFee;
    const emiReduction = currentEMI - newEMI;
    
    // Update display
    document.getElementById('btNetSavings').textContent = formatNumber(Math.round(netSavings));
    document.getElementById('btEmiReduction').textContent = formatNumber(Math.round(emiReduction));
    document.getElementById('btProcessingAmount').textContent = formatNumber(Math.round(processingFee));
    
    // Show recommendation
    const recommendationText = document.getElementById('btRecommendationText');
    if (netSavings > 0) {
        recommendationText.textContent = '✓ Recommended: You will save ' + formatNumber(Math.round(netSavings)) + ' even after processing fee';
        recommendationText.style.color = '#48bb78';
    } else {
        recommendationText.textContent = '✗ Not Recommended: Processing fee exceeds the interest savings';
        recommendationText.style.color = '#f56565';
    }
    document.getElementById('btRecommendation').style.display = 'block';
    
    // Update chart
    updateBalanceTransferChart(currentEMI, newEMI);
}

// Update Balance Transfer Chart
function updateBalanceTransferChart(currentEMI, newEMI) {
    const container = document.getElementById('btChartContainer');
    container.style.display = 'block';
    
    const ctx = document.getElementById('btChart').getContext('2d');
    
    if (window.btChartInstance) {
        window.btChartInstance.destroy();
    }
    
    window.btChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Current EMI', 'New EMI'],
            datasets: [{
                label: 'Monthly EMI',
                data: [currentEMI, newEMI],
                backgroundColor: ['#e53e3e', '#48bb78']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Part Payment Calculator Functions
function addPartPayment() {
    const container = document.getElementById('partPayments');
    const newEntry = document.createElement('div');
    newEntry.className = 'part-payment-entry mb-3';
    newEntry.innerHTML = `
        <div class="row">
            <div class="col-6">
                <label class="form-label">Payment After Month</label>
                <input type="number" class="form-control pp-month" 
                       value="24" min="1" max="360">
            </div>
            <div class="col-6">
                <label class="form-label">Payment Amount</label>
                <div class="input-group">
                    <input type="number" class="form-control pp-amount" 
                           value="50000" min="1000" max="1000000" step="1000">
                    <span class="input-addon">₹</span>
                </div>
            </div>
        </div>
    `;
    container.appendChild(newEntry);
}

function calculatePartPayment() {
    const loanAmount = parseFloat(document.getElementById('ppLoanAmount').value);
    const rate = parseFloat(document.getElementById('ppRate').value);
    const tenure = parseInt(document.getElementById('ppTenure').value);
    
    const monthlyRate = rate / 100 / 12;
    
    // Calculate original EMI
    let emi;
    if (monthlyRate === 0) {
        emi = loanAmount / tenure;
    } else {
        emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / 
             (Math.pow(1 + monthlyRate, tenure) - 1);
    }
    
    // Get all part payments
    const partPayments = [];
    document.querySelectorAll('.part-payment-entry').forEach(entry => {
        const month = parseInt(entry.querySelector('.pp-month').value);
        const amount = parseFloat(entry.querySelector('.pp-amount').value);
        if (month && amount) {
            partPayments.push({ month, amount });
        }
    });
    
    // Sort payments by month
    partPayments.sort((a, b) => a.month - b.month);
    
    // Calculate impact
    let balance = loanAmount;
    let totalInterest = 0;
    let actualTenure = 0;
    let totalPartPayments = 0;
    
    for (let month = 1; month <= tenure; month++) {
        if (balance <= 0) break;
        
        const interest = balance * monthlyRate;
        let principal = emi - interest;
        
        // Check for part payment this month
        const partPayment = partPayments.find(p => p.month === month);
        if (partPayment) {
            principal += partPayment.amount;
            totalPartPayments += partPayment.amount;
        }
        
        balance -= principal;
        totalInterest += interest;
        actualTenure = month;
        
        if (balance <= 0) break;
    }
    
    // Calculate original total interest without part payments
    const originalTotal = emi * tenure;
    const originalInterest = originalTotal - loanAmount;
    
    const savings = originalInterest - totalInterest;
    const tenureReduction = tenure - actualTenure;
    
    // Update display
    document.getElementById('ppTotalSavings').textContent = formatNumber(Math.round(savings));
    document.getElementById('ppInterestSaved').textContent = formatNumber(Math.round(savings));
    document.getElementById('ppTenureReduction').textContent = tenureReduction + ' months';
    
    document.getElementById('ppOriginalTotal').textContent = formatNumber(Math.round(originalTotal));
    document.getElementById('ppNewTotal').textContent = formatNumber(Math.round(loanAmount + totalInterest));
    document.getElementById('ppTotalPartPayments').textContent = formatNumber(Math.round(totalPartPayments));
    document.getElementById('ppDetails').style.display = 'block';
}

// Download functions for new calculators
function downloadPrepaymentExcel() {
    const siteName = 'DroneHub';
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const fileName = siteName + '_Prepayment_Calculator_' + dateStr;
    
    // Get values
    const outstanding = parseFloat(document.getElementById('prepayOutstanding').value);
    const rate = parseFloat(document.getElementById('prepayRate').value);
    const tenure = parseInt(document.getElementById('prepayTenure').value);
    const prepayAmount = parseFloat(document.getElementById('prepayAmount').value);
    const option = document.getElementById('prepayOption').value;
    
    // Create CSV content
    let csvContent = "Prepayment Calculator Report\n";
    csvContent += "Generated by: DroneHub\n";
    csvContent += "Date: " + new Date().toLocaleDateString() + "\n\n";
    
    csvContent += "Loan Details\n";
    csvContent += "Parameter,Value,Currency\n";
    csvContent += "Outstanding Amount," + outstanding.toFixed(2) + ",₹\n";
    csvContent += "Interest Rate," + rate + "%,\n";
    csvContent += "Remaining Tenure," + tenure + " months,\n";
    csvContent += "Prepayment Amount," + prepayAmount.toFixed(2) + ",₹\n";
    csvContent += "Prepayment Option," + option + ",\n\n";
    
    // Add results
    const savingsElement = document.getElementById('prepaymentSavings').textContent;
    const savings = savingsElement.replace(/[^0-9.-]/g, '');
    
    csvContent += "Results\n";
    csvContent += "Parameter,Value,Currency\n";
    csvContent += "Total Interest Saved," + savings + ",₹\n";
    
    downloadCSV(csvContent, fileName + '.csv');
}

function downloadBalanceTransferExcel() {
    const siteName = 'DroneHub';
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const fileName = siteName + '_Balance_Transfer_' + dateStr;
    
    // Similar implementation for balance transfer download
    let csvContent = "Balance Transfer Calculator Report\n";
    csvContent += "Generated by: DroneHub\n";
    csvContent += "Date: " + new Date().toLocaleDateString() + "\n\n";
    
    // Add your CSV content here
    
    downloadCSV(csvContent, fileName + '.csv');
}

function downloadPartPaymentExcel() {
    const siteName = 'DroneHub';
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const fileName = siteName + '_Part_Payment_' + dateStr;
    
    // Similar implementation for part payment download
    let csvContent = "Part Payment Calculator Report\n";
    csvContent += "Generated by: DroneHub\n";
    csvContent += "Date: " + new Date().toLocaleDateString() + "\n\n";
    
    // Add your CSV content here
    
    downloadCSV(csvContent, fileName + '.csv');
}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();