const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });


// Setup app and MySQL connection
const app = express();
const port = 3000;

// Setup storage engine for profile pic uploads using multer
const uploadDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

const caCert = fs.readFileSync(path.join(__dirname, process.env.DB_SSL_CA)); // Updated this line


const connection = mysql.createConnection({
    host: process.env.DB_HOST, // Your Aiven MySQL host from .env
    port: process.env.DB_PORT, // The port provided by Aiven from .env
    user: process.env.DB_USER, // Your Aiven user from .env
    password: process.env.DB_PASSWORD, // Your Aiven password from .env
    database: process.env.DB_NAME, // Your Aiven database name from .env
    ssl: {
      ca: caCert
    }
  });  

// Ensure the connection works
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database: ', err);
    } else {
        console.log('Connected to the database.');
    }
});

// Middleware

  // Configure nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'barclaysbanking00@gmail.com',
        pass: 'ixzp kjzm bezh ijuy' // Use your generated App Password
    }
});


app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    }
});

// In-memory store for OTPs
let otpStore = {};

// Endpoint to send OTP
app.post('/send-otp', (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP

  

    const mailOptions = {
        from: 'barclaysbanking00@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `\nYour OTP code is: ${otp}\n\nThank you!`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending OTP: ', error);
            return res.status(500).send('Failed to send OTP.');
        }
        otpStore[email] = otp; // Store OTP in memory for verification
        res.status(200).send('OTP sent to your email.');
    });
});

// Endpoint to verify OTP and display dashboard
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (otpStore[email] && otpStore[email].toString() === otp.toString()) {
        res.status(200).json({ redirectTo: `/dashboard?email=${email}` });  // Pass the email as a query parameter
    } else {
        res.status(400).send('Invalid OTP.');
    }
});



app.get('/dashboard', (req, res) => {
    // Fetch user data based on session or token, if you're using one
    const email = req.query.email;  // You could pass email as a query parameter

    const query = 'SELECT * FROM UserAccount WHERE email = ?';
    connection.query(query, [email], (err, results) => {
        if (err || results.length === 0) {
            res.status(500).send('User data not found.');
        } else {
            const userData = results[0];
            const dashboardHtml = `
               <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barclays Banking Dashboard</title>
    <link rel="stylesheet" href="Style.css">
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <img class="profilepic" src="${userData.profile_pic}"
            alt="profilepic" srcset="">
    </div>

    <!-- Profile Popup -->
    <div class="profile-popup" id="profilePopup">
        <img src="${userData.profile_pic}" alt="Profile Image">
        <h4>${userData.name}</h4>
        <p>Account No: ${userData.account_number}</p>
        <p>UPI Id: ${userData.upi_id}</p>
        <p>Email: ${userData.email}</p>
        <a href="Index.html" style="text-decoration: none;"><button class="log-out-btn" onclick="logout()">Log Out</button></a>
    </div>

    <!-- Rest of your HTML content -->


    <header class="navbar">

        <nav>
            <ul>
                <li><a href="#" id="homeLink">Home</a></li>
                <input type="hidden" name="email" value="${userData.email}">
                <li><a href="Services.html?email=${userData.email}">Services</a></li>
                <li><a href="ePaylLite.html?email=${userData.email}">ePay Lite</a></li>
                <li><a href="donations.html?email=${userData.email}">Donations</a></li>
                <li><a href="Privacy-policies.html?email=${userData.email}">Privacy Policies</a></li>
                <li><a href="about.html?email=${userData.email}">About</a></li>
                <li><a href="Terms.html?email=${userData.email}">Terms & Conditions</a></li>
                <li><a href="Sign-up.html?email=${userData.email}">Apply for New Barclays Account</a></li>
                <li><a href="Barclays-Loan.html?email=${userData.email}">Barclays Loans</a></li>
            </ul>
        </nav>
    </header>

    <div class="wpanel_marquee">
        <p>Customers can now make the GST payment using INB with extended time up to 23.00 hours.
            &nbsp;&nbsp;|&nbsp;&nbsp; ACCOUNT OPENING IS NOW AVAILABLE ON Barclays - <a href="Login-page.html"
                style="color: red;text-decoration: none;">Click
                here</a> &nbsp;&nbsp;|&nbsp;&nbsp; Mandatory Profile password change after 365 days introduced for added
            security. &nbsp;&nbsp;|&nbsp;&nbsp; Call us toll free on 1890 5434 and 5544 2222 and get a wide range of
            services through Barclays Contact Centre. &nbsp;&nbsp;|&nbsp;&nbsp; Barclays never asks for your
            Card/PIN/OTP/CVV
            details on phone, message or email. Please do not click on links received on your email or mobile asking
            your Bank/Card details.</p>
    </div>



    <!-- Quick Links Section -->
    <div class="quick-links2">
        <div><br></div>
        <nav id="quicksec">
            <ul>
                <li><a href="#" onclick="showATMService()"><i class="fas fa-credit-card"></i> ATM Card Services</a></li>
                <li><a href="#" onclick="checkBalance()"><i class="fas fa-balance-scale"></i> Check Balance</a></li>
                <li><a href="#" onclick="sendMoney()"><i class="fas fa-money-check-alt"></i> Send Money</a></li>
                <li><a href="#" onclick="withdrawBalance()"><i class="fas fa-arrow-alt-circle-down"></i>
                        Withdraw/Debit</a></li>
                <li><a href="#" onclick="addBalance()"><i class="fas fa-plus-circle"></i> Add Money/Deposit</a></li>
            </ul>
        </nav>
    </div>


    <!-- Banking Sections -->
    <section class="banking-section2" id="atmServiceSection">
        <h2>ATM Card Limit/Channel/Usage Change</h2>
        <div class="card-details2">
            <table>
                <thead>
                    <tr>
                        <th>Card Number</th>
                        <th>Card Holder Name</th>
                        <th>Card Status</th>
                        <th>Expiry Date</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><input type="radio" name="cardSelection" value="card1"> ${userData.atm_number}</td>
                        <td>${userData.name}</td>
                        <td>ACTIVE</td>
                        <td>31-10-XXXX</td>
                    </tr>
                    <!-- Add more rows here if needed -->
                </tbody>
            </table>
        </div>

        <div class="card-actions2">
            <div>
                <div class="form-group2">
                    <label for="selectedCardNumber2">Selected Card Number</label>
                    <input type="text" id="selectedCardNumber2" name="selectedCardNumber2" value="XXXXXXXXXXXXXX"
                        readonly>
                </div>

                <div class="form-group2">
                    <label for="serviceType2">Select Services</label>
                    <select id="serviceType2" name="serviceType2">
                        <option value="limitChange">Change Usage Type</option>
                        <option value="channelLimit">Change Channel Limit</option>
                        <option value="usageLimit">Change Usage Limit</option>
                    </select>
                </div>

                <div class="form-group2">
                    <button onclick="atmsubmit()" type="submit" class="submit-btn2">Submit</button>
                    <button onclick="atmcancel()" type="button" class="cancel-btn2">Cancel</button>
                </div>
            </div>
        </div>
    </section>



    <section class="banking-section2" id="sendmoneySection">
        <h2>Send Money</h2>
        <div class="card-details2">
        </div>

        <div class="card-actions2">
          <form action="/send-money" method="post">
    <input type="hidden" name="email" value="${userData.email}">
                <div class="form-group2">
                    <label for="selectedCardNumber2">Enter UPI Number</label>
                    <input type="text" id="selectedCardNumber2" name="upiId" required>
                </div>

                <div class="form-group2">
                    <label id="amounts" for="amount">Amount</label>
                    <input type="number" id="amount" name="amount" required>
                </div>

                <div class="form-group2">
                    <label for="serviceType2">From Account</label>
                    <select id="serviceType2" name="serviceType2">
                        <option value="limitChange">barclays@${userData.account_number}</option>
                    </select>
                </div>

                <div class="form-group2">
                    <button type="submit" class="submit-btn2">Send</button>
                    <button type="button" class="cancel-btn2">Cancel</button>
                </div>
            </form>
        </div>
    </section>



    <section class="banking-section2" id="checkaccountSection">
        <h2> Check Balance</h2>
        <div class="card-details2">
            <table>
                <thead>
                    <tr>
                        <th>Account Number</th>
                        <th>Account Holder Name</th>
                        <th>Balance</th>
                        <th>Transactions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${userData.account_number}</td>
                        <td>${userData.name}</td>
                        <td>₹${userData.balance}</td>
                        <td><a href="#">click here</a></td>
                    </tr>
                    <!-- Add more rows here if needed -->
                </tbody>
            </table>
        </div>

        <div class="card-actions2">
        </div>
    </section>




    <!-- Check Balance Section -->
   <section class="banking-section2 hidden" id="withdrawBalance2">
        <h2>Withdraw/Debit</h2>
        <div class="balance-details2">
            <p>Your current account balance is: <strong style="color: rgb(0, 171, 0);">₹${userData.balance}</strong></p>
            <!-- Withdraw and Add Money Options -->
            <div class="balance-actions2">
                <form action="/withdraw-money" method="post" class="action-form2">
                    <input type="hidden" name="email" value="${userData.email}">
                    <div class="form-group2">
                        <label for="withdrawAmount2">Withdraw Amount:</label>
                        <input type="number" id="withdrawAmount2" name="amount" placeholder="Enter amount">
                    </div>
                    <div class="form-group2" style="display: flex;justify-content: center;">
                        <button type="submit" class="withdraw-btn2">Withdraw</button>
                    </div>
                </form>
            </div>
        </div>
    </section>

    <section class="banking-section2 hidden" id="addBalance3">
        <h2>Add Money/Deposit</h2>
        <div class="balance-details2">
            <p>Your current account balance is: <strong style="color: rgb(0, 171, 0);">₹${userData.balance}</strong></p>
            <!-- Withdraw and Add Money Options -->
            <div class="balance-actions2">
                <form action="/add-money" method="post" class="action-form2">
                    <input type="hidden" name="email" value="${userData.email}">
                    <div class="form-group2">
                        <label for="addMoneyAmount2">Add Money:</label>
                        <input type="number" id="addMoneyAmount2" name="amount" placeholder="Enter amount">
                    </div>
                    <div class="form-group2" style="display: flex;justify-content: center;">
                        <button type="submit" class="add-money-btn2">Add Money</button>
                    </div>
                </form>
            </div>
        </div>
    </section>



  <!-- More Useful Links Section -->
    <div class="useful-links">
        
        <h2>Online Banking Securities</h2>
        <p class="new">
            Barclays offers a secure online banking platform that prioritizes the safety of your financial transactions. 
            With advanced encryption technology, you can confidently manage your accounts, transfer funds, and 
            access various banking services from the comfort of your home. Barclays also provides robust security 
            measures, including two-factor authentication, to protect against unauthorized access. Furthermore, 
            the bank continuously monitors transactions for suspicious activity, ensuring your account is safe. 
            With features like alerts for unusual transactions and the ability to lock your card instantly, 
            Barclays makes online banking not only convenient but also secure. The integration of securities 
            services allows customers to invest and manage their portfolios seamlessly online, giving them 
            comprehensive control over their finances. Whether you're using your mobile device or desktop, 
            Barclays ensures that your online banking experience is secure and efficient.
        </p>
        <h2>How to Use</h2>
        <div class="how-to-use">
            <p>
                Using Barclays online banking is a straightforward process designed for user convenience. To get started, 
                you need to register for online banking by visiting the Barclays website. Click on the "New User Registration" button 
                and follow the prompts to create your account. You’ll need to provide personal information such as your 
                name, email address, and account details for verification purposes. After registration, you will receive 
                a confirmation email that allows you to set up your account. 
    
                Once you have your login credentials, visit the Barclays online banking dashboard and log in with your 
                username and password. The dashboard provides easy navigation to various banking services, including 
                checking your balance and making fund transfers.
    
                For enhanced security, auto enabled two-factor authentication, which adds an extra layer of 
                protection to your account. This feature requires a verification code sent to your registered mobile 
                number during login. Additionally, regularly monitor your account activity and report any suspicious 
                transactions to Barclays immediately.
    
                To use the investment services, navigate to the securities section where you can view available options 
                and make transactions. Barclays provides tools and resources to help you make informed investment decisions. 
                Take advantage of their research and analytics tools to track your investments and explore new opportunities. 
                Whether you’re managing personal finances or investing for the future, Barclays online banking offers 
                a user-friendly platform that prioritizes security and convenience.
            </p>
        </div>
        <h2>More Useful Links</h2>
        <ul>
            <li><a href="/download-block-atm-card">Block ATM Card</a></li>
            <li><a href="/download-doorstep-banking">Doorstep Banking</a></li>
            <li><a href="/download-barclays-general-insurance">Barclays General Insurance Document Download</a></li>
            <li><a href="/download-nri-services">NRI Services</a></li>
            <li><a href="/download-barclays-mutual-fund">Barclays Mutual Fund</a></li>
            <li><a href="/download-barclays-life-insurance">Barclays Life Insurance</a></li>
            <li><a href="/download-barclays-securities">Barclays Securities</a></li>
        </ul>
    
    </div>

    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>

   <script>
    // Show the ATM Service Section initially
    document.getElementById('atmServiceSection').style.display = 'block'; 
    document.getElementById('addBalance3').style.display = 'none';
    document.getElementById('withdrawBalance2').style.display = 'none';
    document.getElementById('sendmoneySection').style.display = 'none'; 
    document.getElementById('checkaccountSection').style.display = 'none'; 

    // Function to show the ATM service section
    function showATMService() {
        document.getElementById('atmServiceSection').style.display = 'block'; 
        document.getElementById('addBalance3').style.display = 'none';
        document.getElementById('withdrawBalance2').style.display = 'none';
        document.getElementById('sendmoneySection').style.display = 'none'; 
        document.getElementById('checkaccountSection').style.display = 'none'; 
    }

    // Function to add balance
    function addBalance() {
        document.getElementById('atmServiceSection').style.display = 'none'; 
        document.getElementById('addBalance3').style.display = 'block';
        document.getElementById('withdrawBalance2').style.display = 'none';
        document.getElementById('sendmoneySection').style.display = 'none'; 
        document.getElementById('checkaccountSection').style.display = 'none'; 
    }

    // Function to withdraw balance
    function withdrawBalance() {
        document.getElementById('atmServiceSection').style.display = 'none'; 
        document.getElementById('addBalance3').style.display = 'none';
        document.getElementById('withdrawBalance2').style.display = 'block';
        document.getElementById('sendmoneySection').style.display = 'none'; 
        document.getElementById('checkaccountSection').style.display = 'none'; 
    }

    // Function to check balance
    function checkBalance() {
        document.getElementById('atmServiceSection').style.display = 'none'; 
        document.getElementById('addBalance3').style.display = 'none';
        document.getElementById('withdrawBalance2').style.display = 'none';
        document.getElementById('sendmoneySection').style.display = 'none'; 
        document.getElementById('checkaccountSection').style.display = 'block'; 
    }

    // Function to send money
    function sendMoney() {
        document.getElementById('atmServiceSection').style.display = 'none'; 
        document.getElementById('addBalance3').style.display = 'none';
        document.getElementById('withdrawBalance2').style.display = 'none';
        document.getElementById('sendmoneySection').style.display = 'block'; 
        document.getElementById('checkaccountSection').style.display = 'none'; 
    }

    // Profile popup toggle
    const profilePic = document.querySelector('.profilepic');
    const profilePopup = document.getElementById('profilePopup');

    profilePic.addEventListener('click', function () {
        profilePopup.style.display = (profilePopup.style.display === 'none' || profilePopup.style.display === '') ? 'block' : 'none';
    });

    // Close the popup when clicking outside
    window.addEventListener('click', function (e) {
        if (!profilePopup.contains(e.target) && !profilePic.contains(e.target)) {
            profilePopup.style.display = 'none';
        }
    });

    // Log out function
    function logout() {
        alert('Logging out...');
        // Add actual log-out logic here
    }

    function atmcancel() {
    alert("The processing has been canceled.");
}

function atmsubmit() {
    alert("The ATM service has been changed.");
}
document.getElementById('homeLink').addEventListener('click', function() {
    const email = document.querySelector('input[name="email"]').value;
    window.location.href = '/dashboard?email=${email}';
});
</script>
</body>

</html> `;
            res.send(dashboardHtml);  // Send the dashboard HTML
        }
    });
});


app.get('/Email-valid.html', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
</head>
<body id="login-page">
    <div class="varify-box">
    <center> <h2>Email Varification </h2></center>  
    <br> 
        <form id="loginForm">
            <div class="user-box">
                <input type="text" id="email" name="email" required>
                <label>Email ID</label>
            </div>
            <div class="user-box" id="otpBox" style="display: none;">
                <input type="number" id="otp" name="otp" required>
                <label>OTP</label>
            </div>

            <button type="button" id="sendOtpBtn" class="login-btn" onclick="sendOtp()">Send OTP</button>
            <button type="button" id="verifyOtpBtn" class="login-btn" style="display: none;" onclick="verifyOtp()">Verify OTP</button>
            <p id="statusMessage" style="color: #888; display: none;">Please wait...</p> 
        </form>
    </div>
    <script>
        function sendOtp() {
            const email = document.getElementById("email").value;
            const sendOtpBtn = document.getElementById("sendOtpBtn");
            const statusMessage = document.getElementById("statusMessage");

            if (email) {
                // Show status message and disable Send OTP button
                sendOtpBtn.style.display = "none";
                statusMessage.style.display = "block"; // Show "Please wait..." message

                fetch('/send-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                })
                .then(response => {
                    if (response.ok) {
                        alert('OTP has been sent to your email. Please check your inbox.');
                        document.getElementById("otpBox").style.display = "block"; // Show OTP input box
                        statusMessage.style.display = "none"; // Hide status message
                        document.getElementById("verifyOtpBtn").style.display = "inline"; // Show verify OTP button
                    } else {
                        alert('Failed to send OTP. Please try again.');
                        sendOtpBtn.style.display = "inline";
                        statusMessage.style.display = "none"; // Hide status message
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred. Please try again later.');
                    sendOtpBtn.style.display = "inline";
                    statusMessage.style.display = "none"; // Hide status message
                });
            } else {
                alert('Please enter your email ID.');
            }
        }

        // Function to verify OTP
        function verifyOtp() {
    const email = document.getElementById("email").value; // Get email for verification
    const otp = document.getElementById("otp").value;

    fetch('/verify-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, otp: otp }) // Include email in the request
    })
    .then(response => response.json())  // Expect a JSON response with a redirect URL
    .then(data => {
        if (data.redirectTo) {
            window.location.href = data.redirectTo;  // Redirect to dashboard
        } else {
            alert('Invalid OTP. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again later.');
    });
}
    </script>
</body>
</html>`);
});

// Serve the HTML file for signup
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barclays Banking Customer</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
  

    <div class="wpanel_marquee">
        <p>Customers can now make the GST payment using INB with extended time up to 23.00 hours.
            &nbsp;&nbsp;|&nbsp;&nbsp; ACCOUNT OPENING IS NOW AVAILABLE ON Barclays - <a href="Login-page.html" style="color: red;text-decoration: none;">Click
                here</a> &nbsp;&nbsp;|&nbsp;&nbsp; Mandatory Profile password change after 365 days introduced for added
            security. &nbsp;&nbsp;|&nbsp;&nbsp; Call us toll free on 1890 5434 and 5544 2222 and get a wide range of
            services through Barclays Contact Centre. &nbsp;&nbsp;|&nbsp;&nbsp; Barclays never asks for your Card/PIN/OTP/CVV
            details on phone, message or email. Please do not click on links received on your email or mobile asking
            your Bank/Card details.</p>
    </div>


    <!-- Banking Sections -->
    <section class="main-content">
        <div class="banking-section">
            <i class="fas fa-user-circle fa-3x"></i>
            <h2>Personal Banking</h2>
            <a href="Login-page.html" ><button class="login-btn">Login</button></a>
            <div class="info-icons">
                <a href="Sign-up.html">New User Registration</a>
                <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Customer Care</a>
                <p style="color:  #ff0606;margin: 6px;">Barclay's internet banking portal provides personal banking services that gives you complete control over all your banking demands online.</p>
            </div>
        </div>
        <div class="banking-section">
            <i class="fas fa-suitcase fa-3x"></i>
            <h2>Corporate Banking</h2>
            <a href="Login-page.html" ><button class="login-btn">Login</button></a>
            <div class="info-icons">
                <a href="Sign-up.html">New User Registration</a>
                <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Customer Care</a>
                <p style="color:  #f90808;margin: 6px;">Corporate Banking application to administer and manage non personal accounts online.</p>
            </div>
        </div>
       
    </section>
    
    <!-- More Useful Links Section -->
    <div class="useful-links">
        
        <h2>Online Banking Securities</h2>
        <p class="new">
            Barclays offers a secure online banking platform that prioritizes the safety of your financial transactions. 
            With advanced encryption technology, you can confidently manage your accounts, transfer funds, and 
            access various banking services from the comfort of your home. Barclays also provides robust security 
            measures, including two-factor authentication, to protect against unauthorized access. Furthermore, 
            the bank continuously monitors transactions for suspicious activity, ensuring your account is safe. 
            With features like alerts for unusual transactions and the ability to lock your card instantly, 
            Barclays makes online banking not only convenient but also secure. The integration of securities 
            services allows customers to invest and manage their portfolios seamlessly online, giving them 
            comprehensive control over their finances. Whether you're using your mobile device or desktop, 
            Barclays ensures that your online banking experience is secure and efficient.
        </p>
        <h2>How to Use</h2>
        <div class="how-to-use">
            <p>
                Using Barclays online banking is a straightforward process designed for user convenience. To get started, 
                you need to register for online banking by visiting the Barclays website. Click on the "New User Registration" button 
                and follow the prompts to create your account. You’ll need to provide personal information such as your 
                name, email address, and account details for verification purposes. After registration, you will receive 
                a confirmation email that allows you to set up your account. 
    
                Once you have your login credentials, visit the Barclays online banking dashboard and log in with your 
                username and password. The dashboard provides easy navigation to various banking services, including 
                checking your balance and making fund transfers.
    
                For enhanced security, auto enabled two-factor authentication, which adds an extra layer of 
                protection to your account. This feature requires a verification code sent to your registered mobile 
                number during login. Additionally, regularly monitor your account activity and report any suspicious 
                transactions to Barclays immediately.
    
                To use the investment services, navigate to the securities section where you can view available options 
                and make transactions. Barclays provides tools and resources to help you make informed investment decisions. 
                Take advantage of their research and analytics tools to track your investments and explore new opportunities. 
                Whether you’re managing personal finances or investing for the future, Barclays online banking offers 
                a user-friendly platform that prioritizes security and convenience.
            </p>
        </div>
        <h2>More Useful Links</h2>
        <ul>
            <li><a href="/download-block-atm-card">Block ATM Card</a></li>
            <li><a href="/download-doorstep-banking">Doorstep Banking</a></li>
            <li><a href="/download-barclays-general-insurance">Barclays General Insurance Document Download</a></li>
            <li><a href="/download-nri-services">NRI Services</a></li>
            <li><a href="/download-barclays-mutual-fund">Barclays Mutual Fund</a></li>
            <li><a href="/download-barclays-life-insurance">Barclays Life Insurance</a></li>
            <li><a href="/download-barclays-securities">Barclays Securities</a></li>
        </ul>
    
    </div>

    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
          <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
</body>

</html>`);
});
app.get('/Index.html', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barclays Banking Customer</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
  

    <div class="wpanel_marquee">
        <p>Customers can now make the GST payment using INB with extended time up to 23.00 hours.
            &nbsp;&nbsp;|&nbsp;&nbsp; ACCOUNT OPENING IS NOW AVAILABLE ON Barclays - <a href="Login-page.html" style="color: red;text-decoration: none;">Click
                here</a> &nbsp;&nbsp;|&nbsp;&nbsp; Mandatory Profile password change after 365 days introduced for added
            security. &nbsp;&nbsp;|&nbsp;&nbsp; Call us toll free on 1890 5434 and 5544 2222 and get a wide range of
            services through Barclays Contact Centre. &nbsp;&nbsp;|&nbsp;&nbsp; Barclays never asks for your Card/PIN/OTP/CVV
            details on phone, message or email. Please do not click on links received on your email or mobile asking
            your Bank/Card details.</p>
    </div>


    <!-- Banking Sections -->
    <section class="main-content">
        <div class="banking-section">
            <i class="fas fa-user-circle fa-3x"></i>
            <h2>Personal Banking</h2>
            <a href="Login-page.html" ><button class="login-btn">Login</button></a>
            <div class="info-icons">
                <a href="Sign-up.html">New User Registration</a>
                <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Customer Care</a>
                <p style="color:  #ff0606;margin: 6px;">Barclay's internet banking portal provides personal banking services that gives you complete control over all your banking demands online.</p>
            </div>
        </div>
        <div class="banking-section">
            <i class="fas fa-suitcase fa-3x"></i>
            <h2>Corporate Banking</h2>
            <a href="Login-page.html" ><button class="login-btn">Login</button></a>
            <div class="info-icons">
                <a href="Sign-up.html">New User Registration</a>
                <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Customer Care</a>
                <p style="color:  #f90808;margin: 6px;">Corporate Banking application to administer and manage non personal accounts online.</p>
            </div>
        </div>
       
    </section>
    
    <!-- More Useful Links Section -->
    <div class="useful-links">
        
        <h2>Online Banking Securities</h2>
        <p class="new">
            Barclays offers a secure online banking platform that prioritizes the safety of your financial transactions. 
            With advanced encryption technology, you can confidently manage your accounts, transfer funds, and 
            access various banking services from the comfort of your home. Barclays also provides robust security 
            measures, including two-factor authentication, to protect against unauthorized access. Furthermore, 
            the bank continuously monitors transactions for suspicious activity, ensuring your account is safe. 
            With features like alerts for unusual transactions and the ability to lock your card instantly, 
            Barclays makes online banking not only convenient but also secure. The integration of securities 
            services allows customers to invest and manage their portfolios seamlessly online, giving them 
            comprehensive control over their finances. Whether you're using your mobile device or desktop, 
            Barclays ensures that your online banking experience is secure and efficient.
        </p>
        <h2>How to Use</h2>
        <div class="how-to-use">
            <p>
                Using Barclays online banking is a straightforward process designed for user convenience. To get started, 
                you need to register for online banking by visiting the Barclays website. Click on the "New User Registration" button 
                and follow the prompts to create your account. You’ll need to provide personal information such as your 
                name, email address, and account details for verification purposes. After registration, you will receive 
                a confirmation email that allows you to set up your account. 
    
                Once you have your login credentials, visit the Barclays online banking dashboard and log in with your 
                username and password. The dashboard provides easy navigation to various banking services, including 
                checking your balance and making fund transfers.
    
                For enhanced security, auto enabled two-factor authentication, which adds an extra layer of 
                protection to your account. This feature requires a verification code sent to your registered mobile 
                number during login. Additionally, regularly monitor your account activity and report any suspicious 
                transactions to Barclays immediately.
    
                To use the investment services, navigate to the securities section where you can view available options 
                and make transactions. Barclays provides tools and resources to help you make informed investment decisions. 
                Take advantage of their research and analytics tools to track your investments and explore new opportunities. 
                Whether you’re managing personal finances or investing for the future, Barclays online banking offers 
                a user-friendly platform that prioritizes security and convenience.
            </p>
        </div>
        <h2>More Useful Links</h2>
        <ul>
            <li><a href="/download-block-atm-card">Block ATM Card</a></li>
            <li><a href="/download-doorstep-banking">Doorstep Banking</a></li>
            <li><a href="/download-barclays-general-insurance">Barclays General Insurance Document Download</a></li>
            <li><a href="/download-nri-services">NRI Services</a></li>
            <li><a href="/download-barclays-mutual-fund">Barclays Mutual Fund</a></li>
            <li><a href="/download-barclays-life-insurance">Barclays Life Insurance</a></li>
            <li><a href="/download-barclays-securities">Barclays Securities</a></li>
        </ul>
    
    </div>

    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
</body>

</html>`);
});
app.get('/Login-page.html', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login account</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
</head>
<body id="login-page">
    <div class="login-box">
        <h2>Login to <h2 class="login-barclays">Barclays</h2></h2>
        <form action="/login-data" method="post" id="loginForm">
            <div class="user-box">
                <input type="text" id="username" name="username" required>
                <label>Username</label>
            </div>

            <div class="user-box">
                <input type="text" id="email" name="email" required>
                <label>Email Id</label>
            </div>

            <div class="user-box">
                <input type="password" id="password" name="password" required> 
                <label>Password</label> 
            </div>
            
           
            <div class="remember-me">
                <input type="checkbox" id="rememberMe">
                <label for="rememberMe">Remember me</label>
                <a href="Email-valid.html" class="forgot-password">Forgot Password?</a>
            </div>
            <button type="submit" id="loginBtn" class="login-btn">Log In</button>

            <div class="new-user">
                <span>New User?</span>
                <a href="Sign-up.html" class="sign-up-link">Create an Account</a>
            </div>
        </form>
    </div>


    <script>
        const loginForm = document.getElementById('loginForm');

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent the default form submission

            const formData = new FormData(loginForm);
            const formObject = Object.fromEntries(formData.entries());

            const response = await fetch('/login-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formObject),
            });

            if (response.ok) {
                const data = await response.json();
                window.location.href = data.redirectTo; // Redirect to the dashboard
            } else {
                const errorMessage = await response.text();
                alert(errorMessage); // Display error message
            }
        });
    </script>
</body>
</html>`);
});
app.get('/Sign-up.html', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
</head>

<body class=".sign-body">
    <div class="containerx">
        <h2 class="title">User Driven Registration - New User</h2>
        <p class="mandatory">Mandatory fields are marked with an asterisk (*)</p>
        <form action="/sign-up-data" method="POST" enctype="multipart/form-data">
            <!-- Name -->
            <div class="form-group">
                <label for="name">Name *</label>
                <input type="text" id="name" name="name" placeholder="Your Full Name" required>
                <small>(Please enter your full name)</small>
            </div>
        
            <!-- Username -->
            <div class="form-group">
                <label for="username">Username *</label>
                <input type="text" id="username" name="username" placeholder="username123!" required>
                <small>(Username must be lowercase, contain a special character, a number, and at least 8 characters long)</small>
            </div>
        
            <!-- Account Number -->
            <div class="form-group">
                <label for="account-number">Account Number *</label>
                <input type="text" id="account-number" name="account-number" placeholder="000000300014" required>
                <small>(Account Number is available in your passbook and/or statement of account)</small>
            </div>
        
            <!-- Routing Code -->
            <div class="form-group">
                <label for="routing-code">Routing Code *</label>
                <input type="text" id="routing-code" name="routing-code" placeholder="00437" required>
                <small>(Routing Code must be numbers only)</small>
            </div>
        
            <!-- SWIFT Code -->
            <div class="form-group">
                <label for="swift-code">SWIFT Code *</label>
                <input type="text" id="swift-code" name="swift-code" placeholder="ABCDINBBXXX" required>
                <small>(SWIFT Code must contain alphabets only)</small>
            </div>
        
            <!-- Email ID -->
            <div class="form-group">
                <label for="email-id">Email ID *</label>
                <input type="email" id="email-id" name="email-id" placeholder="example@domain.com" required>
            </div>
        
            <!-- Password -->
            <div class="form-group">
                <label for="password">Password *</label>
                <input type="password" id="password" name="password" placeholder="Enter Password" required>
                <small>(Password must be at least 6 characters long and contain numbers)</small>
            </div>
        
            <!-- Repeat Password -->
            <div class="form-group">
                <label for="repeat-password">Repeat Password *</label>
                <input type="password" id="repeat-password" name="repeat-password" placeholder="Repeat Password" required>
                <small>(Passwords must match)</small>
            </div>
        
            <!-- Country -->
            <div class="form-group">
                <label for="country">Country *</label>
                <select id="country" name="country">
                    <option value="india">India</option>
                    <option value="usa">USA</option>
                    <option value="canada">Canada</option>
                </select>
            </div>
        <!-- Profile Picture Upload -->
<div class="form-group">
    <label for="profile-pic">Profile Picture *</label>
    <input type="file" id="profile-pic" name="profile-pic" accept="image/*" required>
    <small>(Please upload a profile picture in JPG, PNG, or GIF format)</small>
</div>
            <!-- Facility Required -->
            <div class="form-group">
                <label for="facility">Facility Required *</label>
                <select id="facility" name="facility">
                    <option value="full">Full Transaction Rights</option>
                    <option value="limited">Limited Transaction Rights</option>
                </select>
            </div>
        
            <!-- Terms and Conditions -->
            <div class="form-group2">
                <input type="checkbox" id="terms" name="terms">
                <label for="terms" class="terms">By creating an account, you agree to Barclay Bank’s Terms of Service and Privacy Policy.</label>
            </div>
        
            <!-- Submit Button -->
            <button type="submit" class="submit-btn">Submit</button>
        </form>
    </div>

    <script>
  function validateForm(event) {
    // Get all required fields
    const requiredFields = document.querySelectorAll('[required]');
    let allFilled = true;

    // Additional checks for specific fields
    const name = document.getElementById('name').value;
    const username = document.getElementById('username').value;
    const accountNumber = document.getElementById('account-number').value;
    const routingCode = document.getElementById('routingCode').value;
    const swiftCode = document.getElementById('swiftCode').value;
    const email = document.getElementById('emailId').value;
    const password = document.getElementById('password').value;
    const repeatPassword = document.getElementById('repeatPassword').value;
    const profilePic = document.getElementById('profilePic');
    const termsCheckbox = document.getElementById('terms');

    // Clear any previous errors
    document.querySelectorAll('input').forEach(input => {
        input.style.border = "";
    });

    // Validate each field and set allFilled = false if any validation fails
    if (name.trim() === "") {
        allFilled = false;
        document.getElementById('name').style.border = "2px solid red";
        console.log("Name is required.");
    }

    const usernamePattern = /^(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.*[a-z]).{8,}$/;
    if (!usernamePattern.test(username)) {
        allFilled = false;
        document.getElementById('username').style.border = "2px solid red";
        console.log("Invalid username.");
    }

    if (!/^\d{12}$/.test(accountNumber)) {
        allFilled = false;
        document.getElementById('account-number').style.border = "2px solid red";
        console.log("Account number must be 12 digits.");
    }

    if (!/^\d+$/.test(routingCode)) {
        allFilled = false;
        document.getElementById('routingCode').style.border = "2px solid red";
        console.log("Routing code must contain only numbers.");
    }

    if (!/^[A-Za-z]+$/.test(swiftCode)) {
        allFilled = false;
        document.getElementById('swiftCode').style.border = "2px solid red";
        console.log("SWIFT code must contain only alphabets.");
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        allFilled = false;
        document.getElementById('emailId').style.border = "2px solid red";
        console.log("Invalid email address.");
    }

    if (!/^(?=.*\d).{6,}$/.test(password)) {
        allFilled = false;
        document.getElementById('password').style.border = "2px solid red";
        console.log("Password must contain numbers and be at least 6 characters long.");
    }

    if (password !== repeatPassword) {
        allFilled = false;
        document.getElementById('repeatPassword').style.border = "2px solid red";
        console.log("Passwords do not match.");
    }

    if (!profilePic.files.length) {
        allFilled = false;
        document.getElementById('profilePic').style.border = "2px solid red";
        console.log("Profile picture is required.");
    }

    if (!termsCheckbox.checked) {
        allFilled = false;
        termsCheckbox.parentElement.style.border = "2px solid red";
        console.log("You must agree to the terms.");
    }

    if (!allFilled) {
        event.preventDefault(); // Stop form submission
    }
}

// Add event listener on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form');
    form.addEventListener('submit', validateForm);
});
    </script>

</body>

</html>`);
});

app.get('/Style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'Style.css'));
});

// Handle form submission
app.post('/sign-up-data', upload.single('profile-pic'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded or upload failed.');
    }

    const { name, username, password, 'account-number': accountNumber, 'email-id': email } = req.body;
    const profilePicPath = 'uploads/' + req.file.filename;

    // Generate ATM number (16 digits) and UPI ID
    const atmNumber = generateRandomNumber(16);
    const upiId = username.replace(/\s/g, '') + '@barclays';
    const balance = '0';  // Initial balance is 0

    // Insert the data into the MySQL database
    const sql = `INSERT INTO UserAccount (name, username, password, account_number, email, profile_pic, upi_id, balance, atm_number)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [name, username, password, accountNumber, email, profilePicPath, upiId, balance, atmNumber];

    connection.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error inserting data into database: ', err);
            res.status(500).send('Server Error');
        } else {
            res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Varify Email</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
</head>
<body id="login-page">
    <div class="varify-box">
    <center> <h2>Email Varification </h2></center>  
    <br> 
        <form id="loginForm">
            <div class="user-box">
                <input type="text" id="email" name="email" required>
                <label>Email ID</label>
            </div>
            <div class="user-box" id="otpBox" style="display: none;">
                <input type="number" id="otp" name="otp" required>
                <label>OTP</label>
            </div>

            <button type="button" id="sendOtpBtn" class="login-btn" onclick="sendOtp()">Send OTP</button>
            <button type="button" id="verifyOtpBtn" class="login-btn" style="display: none;" onclick="verifyOtp()">Verify OTP</button>
            <p id="statusMessage" style="color: #888; display: none;">Please wait...</p> 
        </form>
    </div>
    <script>
        function sendOtp() {
            const email = document.getElementById("email").value;
            const sendOtpBtn = document.getElementById("sendOtpBtn");
            const statusMessage = document.getElementById("statusMessage");

            if (email) {
                // Show status message and disable Send OTP button
                sendOtpBtn.style.display = "none";
                statusMessage.style.display = "block"; // Show "Please wait..." message

                fetch('/send-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                })
                .then(response => {
                    if (response.ok) {
                        alert('OTP has been sent to your email. Please check your inbox.');
                        document.getElementById("otpBox").style.display = "block"; // Show OTP input box
                        statusMessage.style.display = "none"; // Hide status message
                        document.getElementById("verifyOtpBtn").style.display = "inline"; // Show verify OTP button
                    } else {
                        alert('Failed to send OTP. Please try again.');
                        sendOtpBtn.style.display = "inline";
                        statusMessage.style.display = "none"; // Hide status message
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred. Please try again later.');
                    sendOtpBtn.style.display = "inline";
                    statusMessage.style.display = "none"; // Hide status message
                });
            } else {
                alert('Please enter your email ID.');
            }
        }

        // Function to verify OTP
        function verifyOtp() {
    const email = document.getElementById("email").value; // Get email for verification
    const otp = document.getElementById("otp").value;

    fetch('/verify-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, otp: otp }) // Include email in the request
    })
    .then(response => response.json())  // Expect a JSON response with a redirect URL
    .then(data => {
        if (data.redirectTo) {
            window.location.href = data.redirectTo;  // Redirect to dashboard
        } else {
            alert('Invalid OTP. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again later.');
    });
}
    </script>
</body>
</html>`);
        }
    });
});

// Generate random ATM number
function generateRandomNumber(length) {
    let atmNumber = '';
    for (let i = 0; i < length; i++) {
        atmNumber += Math.floor(Math.random() * 10);
    }
    return atmNumber;
}

app.post('/login-data', (req, res) => {
    const { username, email, password } = req.body;

    // Check if username and password match
    const sql = `SELECT * FROM UserAccount WHERE username = ? AND email = ? AND password = ?`;
    connection.query(sql, [username, email, password], (err, results) => {
        if (err) {
            console.error('Error querying database: ', err);
            return res.status(500).send('Server error.');
        }

        if (results.length > 0) {
            // Successful login
            const userEmail = results[0].email; // Get user email
            res.status(200).json({ redirectTo: `/dashboard?email=${userEmail}` }); // Redirect to dashboard
        } else {
            // Invalid username/password
            res.status(401).send('Invalid username or password.');
        }
    });
});


app.post('/add-money', (req, res) => {
    const { email, amount } = req.body;

    // Update balance in database
    const sql = `UPDATE UserAccount SET balance = balance + ? WHERE email = ?`;
    connection.query(sql, [amount, email], (err, results) => {
        if (err) {
            console.error('Error updating balance: ', err);
            return res.status(500).send('Server error.');
        }

        // Assuming you have the user's details (name and current balance) from the database
        const userSql = `SELECT name, balance FROM UserAccount WHERE email = ?`;
        connection.query(userSql, [email], (userErr, userResults) => {
            if (userErr || userResults.length === 0) {
                console.error('Error fetching user details: ', userErr);
                return res.status(500).send('Server error.');
            }

            const user = userResults[0];

            // Mail options
            const mailOptions = {
                from: 'barclaysbanking00@gmail.com',
                to: email,
                subject: 'Money deposit',
                text: `Dear ${user.name},\n\nRs.${amount} has been deposited to your account. Your current balance is now Rs.${user.balance}.\n\nThank you for using our service!`
            };

            // Send email notification
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email: ', error);
                    return res.status(500).send('Failed to send email notification.');
                }
                console.log('Email sent: ' + info.response);
                
                // Send confirmation response
                res.send(`<!DOCTYPE html>
                    <html lang="en">
                    
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Transaction Confirmation</title>
                            <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"> <!-- Link to Font Awesome -->
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                            }
                    
                            .container {
                                text-align: center;
                            }
                    
                            .checkmark-circle {
                                width: 100px;
                                height: 100px;
                                border-radius: 50%;
                                border: 2px dashed #3a8b51f0; /* Adjust color to match image */
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                margin-bottom: 20px;
                                background-color: white; /* Optional: add background for better visibility */
                                position: relative;
                            }
                    
                            .checkmark {
                                color: #6bf72a; /* Green color for the checkmark */
                                font-size: 48px; /* Adjust size as needed */
                                opacity: 0; /* Start invisible */
                                transform: scale(0); /* Start scaled down */
                                animation: checkmark-animation 2.0s forwards; /* Trigger animation */
                            }
                    
                            @keyframes checkmark-animation {
                                0% {
                                    opacity: 0;
                                    transform: scale(0);
                                }
                                50% {
                                    opacity: 1;
                                    transform: scale(1.2); /* Slightly scale up */
                                }
                                100% {
                                    opacity: 1;
                                    transform: scale(1); /* Set to original size */
                                }
                            }
                    
                            h1 {
                                color: #76b852; /* Adjust color to match image */
                                font-size: 24px;
                            }
                    
                            p {
                                color: #a9a9a9; /* Adjust color to match image */
                                font-size: 16px;
                            }
                    
                            /* Style for the 'Done' button */
                            .done-btn {
                                padding: 10px 20px;
                                font-size: 16px;
                                color: white;
                                background-color: #007bff; /* Blue background */
                                border: 2px solid #007bff; /* Blue border */
                                border-radius: 2px; /* 2px border radius */
                                cursor: pointer;
                                margin-top: 20px;
                                text-decoration: none;
                                display: inline-block;
                            }
                    
                            .done-btn:hover {
                                background-color: #0056b3; /* Darker blue on hover */
                                border-color: #0056b3;
                            }
                        </style>
                    </head>
                    
                    <body>
                        <div class="container">
                            <center>
                                <div class="checkmark-circle">
                                    <i class="fas fa-check checkmark"></i>
                                </div>
                            </center>
                            <h1>Payment Completed!</h1>
                            <p>You can verify your account balance</p>
                            <button class="done-btn" id="doneBtn">Done</button>
                        </div>
                        <script>
                            document.getElementById('doneBtn').addEventListener('click', function() {
                                // Redirect to the dashboard using GET method with email as query parameter
                                window.location.href = '/dashboard?email=${email}';
                            });
                        </script>
                    </body>
                    </html>`);
            });
        });
    });
});

// Endpoint to withdraw money from the account
app.post('/withdraw-money', (req, res) => {
    const { email, amount } = req.body;

    // First, check current balance
    connection.query('SELECT balance FROM UserAccount WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).send('Server error.');
        }

        const currentBalance = results[0].balance;

        // Ensure sufficient balance
        if (currentBalance < amount) {
            return res.status(400).send('Insufficient balance.');
        }

        // Update balance in database
        const sql = `UPDATE UserAccount SET balance = balance - ? WHERE email = ?`;
        connection.query(sql, [amount, email], (err, results) => {
            if (err) {
                console.error('Error updating balance: ', err);
                return res.status(500).send('Server error.');
            }

            // Fetch user details after updating balance
            const userSql = `SELECT name, balance FROM UserAccount WHERE email = ?`;
            connection.query(userSql, [email], (userErr, userResults) => {
                if (userErr || userResults.length === 0) {
                    console.error('Error fetching user details: ', userErr);
                    return res.status(500).send('Server error.');
                }

                const user = userResults[0];

                // Mail options
                const mailOptions = {
                    from: 'barclaysbanking00@gmail.com',
                    to: email,
                    subject: 'Money Debit',
                    text: `Dear ${user.name},\n\nRs.${amount} has been withdrawn from your account. Your current balance is now Rs.${user.balance}.\n\nThank you for using our service!`
                };

                // Send email notification
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email: ', error);
                        return res.status(500).send('Failed to send email notification.');
                    }
                    console.log('Email sent: ' + info.response);

                    // Send confirmation response
                    res.send(`<!DOCTYPE html>
                    <html lang="en">
                    
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Transaction Confirmation</title>
                            <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"> <!-- Link to Font Awesome -->
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                            }
                    
                            .container {
                                text-align: center;
                            }
                    
                            .checkmark-circle {
                                width: 100px;
                                height: 100px;
                                border-radius: 50%;
                                border: 2px dashed #3a8b51f0; /* Adjust color to match image */
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                margin-bottom: 20px;
                                background-color: white; /* Optional: add background for better visibility */
                                position: relative;
                            }
                    
                            .checkmark {
                                color: #6bf72a; /* Green color for the checkmark */
                                font-size: 48px; /* Adjust size as needed */
                                opacity: 0; /* Start invisible */
                                transform: scale(0); /* Start scaled down */
                                animation: checkmark-animation 2.0s forwards; /* Trigger animation */
                            }
                    
                            @keyframes checkmark-animation {
                                0% {
                                    opacity: 0;
                                    transform: scale(0);
                                }
                                50% {
                                    opacity: 1;
                                    transform: scale(1.2); /* Slightly scale up */
                                }
                                100% {
                                    opacity: 1;
                                    transform: scale(1); /* Set to original size */
                                }
                            }
                    
                            h1 {
                                color: #76b852; /* Adjust color to match image */
                                font-size: 24px;
                            }
                    
                            p {
                                color: #a9a9a9; /* Adjust color to match image */
                                font-size: 16px;
                            }
                    
                            /* Style for the 'Done' button */
                            .done-btn {
                                padding: 10px 20px;
                                font-size: 16px;
                                color: white;
                                background-color: #007bff; /* Blue background */
                                border: 2px solid #007bff; /* Blue border */
                                border-radius: 2px; /* 2px border radius */
                                cursor: pointer;
                                margin-top: 20px;
                                text-decoration: none;
                                display: inline-block;
                            }
                    
                            .done-btn:hover {
                                background-color: #0056b3; /* Darker blue on hover */
                                border-color: #0056b3;
                            }
                        </style>
                    </head>
                    
                    <body>
                        <div class="container">
                            <center>
                                <div class="checkmark-circle">
                                    <i class="fas fa-check checkmark"></i>
                                </div>
                            </center>
                            <h1>Withdrawal Successfull!</h1>
                            <p>You can verify your account balance !</p>
                            <button class="done-btn" id="doneBtn">Done</button>
                        </div>
                        <script>
                            document.getElementById('doneBtn').addEventListener('click', function() {
                                // Redirect to the dashboard using GET method with email as query parameter
                                window.location.href = '/dashboard?email=${email}';
                            });
                        </script>
                    </body>
                    </html>`);
                });
            });
        });
    });
});

// Endpoint to send money
app.post('/send-money', (req, res) => {
    const { email, upiId, amount } = req.body;

    // Ensure 'amount' is a number
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).send('Invalid amount.');
    }

    // First, check if the UPI ID exists
    connection.query('SELECT balance, account_number, email, name, upi_id FROM UserAccount WHERE upi_id = ?', [upiId], (err, results) => {
        if (err) {
            return res.status(500).send('Server error.');
        }

        if (results.length === 0) {
            return res.status(400).send('UPI ID not found.');
        }

        const recipient = results[0];
        const recipientBalance = parseFloat(recipient.balance);

        // Now, check the sender's balance and get sender details
        connection.query('SELECT balance, account_number, name, upi_id FROM UserAccount WHERE email = ?', [email], (err, results) => {
            if (err || results.length === 0) {
                return res.status(500).send('Server error.');
            }

            const sender = results[0];
            const senderBalance = parseFloat(sender.balance);

            // Ensure sufficient balance
            if (senderBalance < numericAmount) {
                return res.status(400).send('Insufficient balance.');
            }

            // Update balances
            const sqlUpdateSender = `UPDATE UserAccount SET balance = balance - ? WHERE email = ?`;
            const sqlUpdateRecipient = `UPDATE UserAccount SET balance = balance + ? WHERE upi_id = ?`;

            connection.query(sqlUpdateSender, [numericAmount, email], (err) => {
                if (err) {
                    return res.status(500).send('Server error.');
                }

                connection.query(sqlUpdateRecipient, [numericAmount, upiId], (err) => {
                    if (err) {
                        return res.status(500).send('Server error.');
                    }

                    // Prepare email notifications
                    const senderMailOptions = {
                        from: 'barclaysbanking00@gmail.com',
                        to: email,
                        subject: 'Money Sent',
                        text: `Dear ${sender.name},\n\nRs.${numericAmount} has been sent to ${recipient.account_number} from ${sender.upi_id}. Your current balance is now Rs.${senderBalance - numericAmount}.\n\nThank you for using our service!`
                    };

                    const recipientMailOptions = {
                        from: 'verana864@gmail.com',
                        to: recipient.email,
                        subject: 'Money Received',
                        text: `Dear ${recipient.name},\n\nRs.${numericAmount} has been deposited to your account (${recipient.account_number}) from ${sender.upi_id}. Your current balance is now Rs.${recipientBalance + numericAmount}.\n\nThank you for using our service!`
                    };

                    // Send email notifications
                    transporter.sendMail(senderMailOptions, (error, info) => {
                        if (error) {
                            console.error('Error sending email to sender: ', error);
                            return res.status(500).send('Failed to send email notification to sender.');
                        }
                        console.log('Email sent to sender: ' + info.response);

                        transporter.sendMail(recipientMailOptions, (error, info) => {
                            if (error) {
                                console.error('Error sending email to recipient: ', error);
                                return res.status(500).send('Failed to send email notification to recipient.');
                            }
                            console.log('Email sent to recipient: ' + info.response);

                            // Send confirmation response
                            res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaction Confirmation</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"> <!-- Link to Font Awesome -->
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
        }
        .checkmark-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 2px dashed #3a8b51f0; /* Adjust color to match image */
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
            background-color: white; /* Optional: add background for better visibility */
            position: relative;
        }
        .checkmark {
            color: #6bf72a; /* Green color for the checkmark */
            font-size: 48px; /* Adjust size as needed */
            opacity: 0; /* Start invisible */
            transform: scale(0); /* Start scaled down */
            animation: checkmark-animation 2.0s forwards; /* Trigger animation */
        }
        @keyframes checkmark-animation {
            0% {
                opacity: 0;
                transform: scale(0);
            }
            50% {
                opacity: 1;
                transform: scale(1.2); /* Slightly scale up */
            }
            100% {
                opacity: 1;
                transform: scale(1); /* Set to original size */
            }
        }
        h1 {
            color: #76b852; /* Adjust color to match image */
            font-size: 24px;
        }
        p {
            color: #a9a9a9; /* Adjust color to match image */
            font-size: 16px;
        }
        /* Style for the 'Done' button */
        .done-btn {
            padding: 10px 20px;
            font-size: 16px;
            color: white;
            background-color: #007bff; /* Blue background */
            border: 2px solid #007bff; /* Blue border */
            border-radius: 2px; /* 2px border radius */
            cursor: pointer;
            margin-top: 20px;
            text-decoration: none;
            display: inline-block;
        }
        .done-btn:hover {
            background-color: #0056b3; /* Darker blue on hover */
            border-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <center>
            <div class="checkmark-circle">
                <i class="fas fa-check checkmark"></i>
            </div>
        </center>
        <h1>Transfer Completed!</h1>
        <p>You can verify your account balance !</p>
        <button class="done-btn" id="doneBtn">Done</button>
    </div>
    <script>
        document.getElementById('doneBtn').addEventListener('click', function() {
            // Redirect to the dashboard using GET method with email as query parameter
            window.location.href = '/dashboard?email=${email}';
        });
    </script>
</body>
</html>`);
                        });
                    });
                });
            });
        });
    });
});




app.get('/about.html', (req, res) => {
    const email = req.query.email;

    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Barclays Banking</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
   <header class="navbar">

        <nav>
            <ul>
                <li><a href="#" id="homeLink">Home</a></li>
                <input type="hidden" name="email" value="${email}">
                <li><a href="Services.html?email=${email}">Services</a></li>
                <li><a href="ePaylLite.html?email=${email}">ePay Lite</a></li>
                <li><a href="donations.html?email=${email}">Donations</a></li>
                <li><a href="Privacy-policies.html?email=${email}">Privacy Policies</a></li>
                <li><a href="about.html?email=${email}">About</a></li>
              <li><a href="Terms.html?email=${email}">Terms & Conditions</a></li>
                <li><a href="Sign-up.html?email=${email}">Apply for New Barclays Account</a></li>
                <li><a href="Barclays-Loan.html?email=${email}">Barclays Loans</a></li>
            </ul>
        </nav>
    </header>


    <!-- Add more div -->
    <div class="about-section">
        <h2>About Barclays Bank</h2>
        <p>Barclays Bank has a rich history dating back to 1690, when it was founded in London. Over the years, we have evolved into a leading global financial services provider, committed to helping individuals and businesses achieve their financial goals.</p>

        <h3>Our Mission</h3>
        <p>Our mission is to empower people and businesses to achieve their ambitions by providing innovative financial solutions and exceptional service. We strive to build long-term relationships with our customers based on trust and transparency.</p>

        <h3>Our Vision</h3>
        <p>We envision a world where everyone has access to the financial resources they need to succeed. We aim to lead the way in sustainable banking, ensuring that our operations positively impact the communities we serve.</p>

        <h3>Our Values</h3>
        <ul>
            <li><i class="fas fa-check-circle"></i> Integrity: We act with honesty and uphold the highest ethical standards.</li>
            <li><i class="fas fa-check-circle"></i> Customer Focus: We prioritize our customers’ needs and deliver outstanding service.</li>
            <li><i class="fas fa-check-circle"></i> Innovation: We embrace change and continuously seek better solutions.</li>
            <li><i class="fas fa-check-circle"></i> Sustainability: We are committed to responsible banking and environmental stewardship.</li>
        </ul>

        <h3>Our History</h3>
        <p>From our beginnings in a small shop in London, we have grown to serve millions of customers worldwide. Our expansion into various financial services, including retail banking, investment banking, and wealth management, reflects our adaptability and commitment to meet diverse customer needs.</p>

        <h3>Contact Us</h3>
        <p>If you have any questions or would like to know more about our services, please feel free to <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">contact our support team</a>.</p>
    </div>

   
    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
    <script>

  document.getElementById('homeLink').addEventListener('click', function(event) {
        event.preventDefault();  // Prevent default navigation
        const email = document.querySelector('input[name="email"]').value;  // Get email from hidden input
        window.location.href = '/dashboard?email=' + encodeURIComponent(email);  // Redirect to dashboard with email
    });
    </script>
</body>

</html>`);
});




app.get('/Services.html', (req, res) => {
    const email = req.query.email;

    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barclays Banking Services</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
   <header class="navbar">

        <nav>
            <ul>
                <li><a href="#" id="homeLink">Home</a></li>
                <input type="hidden" name="email" value="${email}">
                <li><a href="Services.html?email=${email}">Services</a></li>
                <li><a href="ePaylLite.html?email=${email}">ePay Lite</a></li>
                <li><a href="donations.html?email=${email}">Donations</a></li>
                <li><a href="Privacy-policies.html?email=${email}">Privacy Policies</a></li>
                <li><a href="about.html?email=${email}">About</a></li>
              <li><a href="Terms.html?email=${email}">Terms & Conditions</a></li>
                <li><a href="Sign-up.html?email=${email}">Apply for New Barclays Account</a></li>
                <li><a href="Barclays-Loan.html?email=${email}">Barclays Loans</a></li>
            </ul>
        </nav>
    </header>

    <!-- Add more div -->
    
    <section class="service-section">
        <div class="container">
            <div class="image-section">
                <img src="uploads/service.jpg" alt="Barclays Services"> <!-- Add your image here -->
            </div>
            <div class="content-section">
                <h2>Barclays Services</h2>
                <p>
                    At Barclays, we offer a range of services designed to make your banking experience seamless and efficient. Whether you're looking to open a new account, send or add money, or utilize our ATM services, we have you covered. Our commitment to customer satisfaction means that we provide a secure and user-friendly platform for all your banking needs.
                </p>
                <p>
                    Here’s what you can expect from our services:
                </p>
                <ul>
                    <li><i class="fas fa-check-circle"></i> New Account Open: Easily set up a new account online.</li>
                    <li><i class="fas fa-check-circle"></i> Send Money: Quickly transfer funds to friends and family.</li>
                    <li><i class="fas fa-check-circle"></i> Add Money: Conveniently deposit funds into your account.</li>
                    <li><i class="fas fa-check-circle"></i> ATM Service: Access cash anytime at our ATMs nationwide.</li>
                    <li><i class="fas fa-check-circle"></i> And more: Explore additional services tailored to your needs.</li>
                </ul>

            </div>
        </div>
    </section>
    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
     <script>

  document.getElementById('homeLink').addEventListener('click', function(event) {
        event.preventDefault();  // Prevent default navigation
        const email = document.querySelector('input[name="email"]').value;  // Get email from hidden input
        window.location.href = '/dashboard?email=' + encodeURIComponent(email);  // Redirect to dashboard with email
    });
    </script>
</body>

</html>`);
});


app.get('/ePaylLite.html', (req, res) => {
    const email = req.query.email;

    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ePaylite</title>
    <link rel="stylesheet" href="Style.css">
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
    <header class="navbar">

        <nav>
            <ul>
                <li><a href="#" id="homeLink">Home</a></li>
                <input type="hidden" name="email" value="${email}">
                <li><a href="Services.html?email=${email}">Services</a></li>
                <li><a href="ePaylLite.html?email=${email}">ePay Lite</a></li>
                <li><a href="donations.html?email=${email}">Donations</a></li>
                <li><a href="Privacy-policies.html?email=${email}">Privacy Policies</a></li>
                <li><a href="about.html?email=${email}">About</a></li>
               <li><a href="Terms.html?email=${email}">Terms & Conditions</a></li>
                <li><a href="Sign-up.html?email=${email}">Apply for New Barclays Account</a></li>
                <li><a href="Barclays-Loan.html?email=${email}">Barclays Loans</a></li>
            </ul>
        </nav>
    </header>
    <!-- Add more div -->
    
    <section class="epaylite-section">
        <div class="container">
            <div class="image-section">
                <img src="uploads/-banking.jpg" alt="EpayLite in Barclays"> <!-- Add your image here -->
            </div>
            <div class="content-section">
                <h2>Check EpayLite in Barclays</h2>
                <p>
                    Barclays Bank is excited to introduce EpayLite, a simplified and secure way to manage your online payments. Whether you're an individual making everyday transactions or a business handling larger payments, EpayLite offers a seamless experience that prioritizes security and efficiency. With our innovative platform, you can process payments quickly and with confidence, knowing that Barclays' trusted technology is ensuring that every transaction is safeguarded.
                </p>
                <ul>
                    <li><i class="fas fa-check-circle"></i> Simple, secure, and fast payment processing.</li>
                    <li><i class="fas fa-check-circle"></i> Support for multiple currencies and international transactions.</li>
                    <li><i class="fas fa-check-circle"></i> Real-time tracking and detailed transaction reports.</li>
                    <li><i class="fas fa-check-circle"></i> Low transaction fees for both local and global payments.</li>
                    <li><i class="fas fa-check-circle"></i> 24/7 customer support for all payment-related inquiries.</li>
                </ul>
                
            </div>
        </div>
    </section>
    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
      <script>

  document.getElementById('homeLink').addEventListener('click', function(event) {
        event.preventDefault();  // Prevent default navigation
        const email = document.querySelector('input[name="email"]').value;  // Get email from hidden input
        window.location.href = '/dashboard?email=' + encodeURIComponent(email);  // Redirect to dashboard with email
    });
    </script>
</body>

</html>`);
});




app.get('/donations.html', (req, res) => {
    const email = req.query.email;

    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barclays Banking Donations</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
    <header class="navbar">

        <nav>
            <ul>
                <li><a href="#" id="homeLink">Home</a></li>
                <input type="hidden" name="email" value="${email}">
                <li><a href="Services.html?email=${email}">Services</a></li>
                <li><a href="ePaylLite.html?email=${email}">ePay Lite</a></li>
                <li><a href="donations.html?email=${email}">Donations</a></li>
                <li><a href="Privacy-policies.html?email=${email}">Privacy Policies</a></li>
                <li><a href="about.html?email=${email}">About</a></li>
                <li><a href="Terms.html?email=${email}">Terms & Conditions</a></li>
                <li><a href="Sign-up.html?email=${email}">Apply for New Barclays Account</a></li>
                <li><a href="Barclays-Loan.html?email=${email}">Barclays Loans</a></li>
            </ul>
        </nav>
    </header>
    <!-- Add more div -->
    
     <section class="service-section">
        <div class="container">
            <div class="image-section">
                <img src="uploads/Donation.jpg" alt="Donations with Barclays"> <!-- Add your image here -->
            </div>
            <div class="content-section">
                <h2>Donations with Barclays</h2>
                <p>
                    Barclays Bank is dedicated to facilitating charitable donations that make a difference in communities around the world. By donating with us, you contribute to various impactful projects, from local community support to international disaster relief. Every donation, regardless of size, plays a crucial role in bringing about positive change.
                </p>
                <p>
                    We believe in transparency and accountability, ensuring that your contributions are handled with care and reach those in need effectively. With Barclays, you can expect:
                </p>
                <ul>
                    <li><i class="fas fa-check-circle"></i> Secure and transparent donation processes.</li>
                    <li><i class="fas fa-check-circle"></i> Contributions to verified charities and projects.</li>
                    <li><i class="fas fa-check-circle"></i> Support for both local and global initiatives.</li>
                    <li><i class="fas fa-check-circle"></i> Regular updates on how your donations are used.</li>
                    <li><i class="fas fa-check-circle"></i> Dedicated support for all donation-related queries.</li>
                </ul>
            </div>
        </div>
    </section>
    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
      <script>

  document.getElementById('homeLink').addEventListener('click', function(event) {
        event.preventDefault();  // Prevent default navigation
        const email = document.querySelector('input[name="email"]').value;  // Get email from hidden input
        window.location.href = '/dashboard?email=' + encodeURIComponent(email);  // Redirect to dashboard with email
    });
    </script>
</body>

</html>`);
});



app.get('/Privacy-policies.html', (req, res) => {
    const email = req.query.email;

    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policies</title>
    <link rel="stylesheet" href="Style.css">
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
    <header class="navbar">

        <nav>
            <ul>
                <li><a href="#" id="homeLink">Home</a></li>
                <input type="hidden" name="email" value="${email}">
                <li><a href="Services.html?email=${email}">Services</a></li>
                <li><a href="ePaylLite.html?email=${email}">ePay Lite</a></li>
                <li><a href="donations.html?email=${email}">Donations</a></li>
                <li><a href="Privacy-policies.html?email=${email}">Privacy Policies</a></li>
                <li><a href="about.html?email=${email}">About</a></li>
                <li><a href="Terms.html?email=${email}">Terms & Conditions</a></li>
                <li><a href="Sign-up.html?email=${email}">Apply for New Barclays Account</a></li>
                <li><a href="Barclays-Loan.html?email=${email}">Barclays Loans</a></li>
            </ul>
        </nav>
    </header>
    <!-- Add more div -->
    
     <!-- Add more div -->
    <div class="privacy-policies">
        <h2>Privacy Policies</h2>
        <p>Your privacy is important to us. At Barclays Bank, we are committed to protecting your personal information and ensuring that your data is handled responsibly.</p>
    
        <h3>1. Information We Collect</h3>
        <p>We may collect personal information about you when you use our services, including:</p>
        <ul>
            <li><i class="fas fa-check-circle"></i> Identification details (e.g., name, address, date of birth)</li>
            <li><i class="fas fa-check-circle"></i> Contact information (e.g., email address, phone number)</li>
            <li><i class="fas fa-check-circle"></i> Financial information (e.g., account numbers, transaction history)</li>
        </ul>
    
        <h3>2. How We Use Your Information</h3>
        <p>We may use your information for the following purposes:</p>
        <ul>
            <li><i class="fas fa-check-circle"></i> To provide you with our banking services</li>
            <li><i class="fas fa-check-circle"></i> To communicate with you about your account</li>
            <li><i class="fas fa-check-circle"></i> To comply with legal obligations and regulations</li>
        </ul>
    
        <h3>3. Data Security</h3>
        <p>We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the internet or electronic storage is 100% secure.</p>
    
        <h3>4. Your Rights</h3>
        <p>You have the right to:</p>
        <ul>
            <li><i class="fas fa-check-circle"></i> Access the personal information we hold about you</li>
            <li><i class="fas fa-check-circle"></i> Request correction of any inaccurate or incomplete information</li>
            <li><i class="fas fa-check-circle"></i> Request the deletion of your personal information under certain circumstances</li>
        </ul>
    
        <h3>5. Changes to This Policy</h3>
        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on our website. Your continued use of our services after any modifications to the Privacy Policy constitutes your acceptance of the revised terms.</p>
    
        <h3>Contact Us</h3>
        <p>If you have any questions or concerns about our Privacy Policies, please <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">contact our support team</a>.</p>
    </div>
    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
      <script>

  document.getElementById('homeLink').addEventListener('click', function(event) {
        event.preventDefault();  // Prevent default navigation
        const email = document.querySelector('input[name="email"]').value;  // Get email from hidden input
        window.location.href = '/dashboard?email=' + encodeURIComponent(email);  // Redirect to dashboard with email
    });
    </script>
</body>

</html>`);
});


app.get('/Terms.html', (req, res) => {
    const email = req.query.email;

    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms & Conditions</title>
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="Style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
    <header class="navbar">

        <nav>
            <ul>
                <li><a href="#" id="homeLink">Home</a></li>
                <input type="hidden" name="email" value="${email}">
                <li><a href="Services.html?email=${email}">Services</a></li>
                <li><a href="ePaylLite.html?email=${email}">ePay Lite</a></li>
                <li><a href="donations.html?email=${email}">Donations</a></li>
                <li><a href="Privacy-policies.html?email=${email}">Privacy Policies</a></li>
                <li><a href="about.html?email=${email}">About</a></li>
                <li><a href="Terms.html?email=${email}">Terms & Conditions</a></li>
                <li><a href="Sign-up.html?email=${email}">Apply for New Barclays Account</a></li>
                <li><a href="Barclays-Loan.html?email=${email}">Barclays Loans</a></li>
            </ul>
        </nav>
    </header>
    <!-- Add more div -->
    
     <!-- Add more div -->
   <div class="terms-and-conditions">
        <h2>Terms and Conditions</h2>
        <p>Welcome to the Barclays Banking service. By accessing our services, you agree to the following terms and conditions:</p>
        
        <h3>1. Acceptance of Terms</h3>
        <p>By using our services, you confirm that you accept these terms and conditions. If you do not agree, please do not use our services.</p>
        
        <h3>2. Changes to Terms</h3>
        <p>We reserve the right to modify these terms at any time. Any changes will be effective immediately upon posting on this page.</p>
        
        <h3>3. Account Security</h3>
        <p>It is your responsibility to maintain the confidentiality of your account information and to notify us immediately of any unauthorized use of your account.</p>
        
        <h3>4. Limitation of Liability</h3>
        <p>Barclays Bank will not be liable for any direct, indirect, or consequential damages arising out of or in connection with your use of our services.</p>
        
        <h3>5. Governing Law</h3>
        <p>These terms and conditions are governed by the laws of the jurisdiction in which Barclays operates.</p>

        <p>For more details, please contact our support team.</p>
    </div>

   
    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
      <script>

  document.getElementById('homeLink').addEventListener('click', function(event) {
        event.preventDefault();  // Prevent default navigation
        const email = document.querySelector('input[name="email"]').value;  // Get email from hidden input
        window.location.href = '/dashboard?email=' + encodeURIComponent(email);  // Redirect to dashboard with email
    });
    </script>
</body>

</html>`);
});



app.get('/Barclays-Loan.html', (req, res) => {
    const email = req.query.email;

    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barclays Loan</title>
    <link rel="stylesheet" href="Style.css">
        <link rel="icon" href="uploads/Logo.png" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <!-- SBI Logo and Navbar Section -->
    <div class="logo">
        <img src="uploads/Logo.png" alt="Barclays Logo">
        <h2>BARCLAYS <sub class="onlinebank">Online Banking Service <sup class="onlinebank">TM</sup></sub></h2>
        <div class="profilepic"></div>
    </div>
    <header class="navbar">

        <nav>
            <ul>
                <li><a href="#" id="homeLink">Home</a></li>
                <input type="hidden" name="email" value="${email}">
                <li><a href="Services.html?email=${email}">Services</a></li>
                <li><a href="ePaylLite.html?email=${email}">ePay Lite</a></li>
                <li><a href="donations.html?email=${email}">Donations</a></li>
                <li><a href="Privacy-policies.html?email=${email}">Privacy Policies</a></li>
                <li><a href="about.html?email=${email}">About</a></li>
               <li><a href="Terms.html?email=${email}">Terms & Conditions</a></li>
                <li><a href="Sign-up.html?email=${email}">Apply for New Barclays Account</a></li>
                <li><a href="Barclays-Loan.html?email=${email}">Barclays Loans</a></li>
            </ul>
        </nav>
    </header>
    <!-- Add more div -->
    
     <!-- Add more div -->
   <section class="service-section">
        <div class="container">
            <div class="image-section">
                <img src="uploads/loan.jpg" alt="EpayLite in Barclays"> 
            </div>
            <div class="content-section">
                <h2>Barclays Loan</h2>
                <p>
                    Barclays Bank offers a variety of loan options tailored to meet your financial needs. Whether you're looking to purchase your dream home, fund your education, or expand your business, Barclays has the right solution for you. Our loans come with competitive interest rates and flexible repayment options, ensuring that you can find a plan that works for your budget.
                </p>
                <p>
                    We understand that securing a loan is a significant decision, which is why we are committed to providing transparent information and dedicated support throughout the process. With Barclays, you can expect:
                </p>
                <ul>
                    <li><i class="fas fa-check-circle"></i> Home Loans for purchasing or refinancing your home.</li>
                    <li><i class="fas fa-check-circle"></i> Education Loans to help you achieve your academic goals.</li>
                    <li><i class="fas fa-check-circle"></i> Business Loans to support your entrepreneurial ambitions.</li>
                    <li><i class="fas fa-check-circle"></i> Personal Loans for any other financial needs.</li>
                    <li><i class="fas fa-check-circle"></i> Quick and easy online application process.</li>
                </ul>
            
            </div>
        </div>
    </section>
    <!-- Footer Section -->
    <footer>
        <div class="footer-content">
            <img src="uploads/Ad.jpg" alt="PSB Doorstep Banking">
           <p>If you face any problem related to Barclays online banking, then you can visit our bank or contact our dedicated customer service team at <a href="mailto:barclaysbanking00@gmail.com?subject=Write your queries&body=">Barclays Customer Service</a>.</p>
        </div>
    </footer>
      <script>

  document.getElementById('homeLink').addEventListener('click', function(event) {
        event.preventDefault();  // Prevent default navigation
        const email = document.querySelector('input[name="email"]').value;  // Get email from hidden input
        window.location.href = '/dashboard?email=' + encodeURIComponent(email);  // Redirect to dashboard with email
    });
    </script>
</body>

</html>`);
});


// Route for downloading Block ATM Card PDF
app.get('/download-block-atm-card', (req, res) => {
    const file = path.join(uploadDir, 'download-block-atm-card.pdf');
    res.download(file, 'block-atm-card.pdf', (err) => {
        if (err) {
            console.error('File download error:', err);
            res.status(404).send('File not found.');
        }
    });
});

// Route for downloading Doorstep Banking PDF
app.get('/download-doorstep-banking', (req, res) => {
    const file = path.join(uploadDir, 'download-doorstep-banking.pdf'); // Ensure this file exists
    res.download(file, 'doorstep-banking.pdf', (err) => {
        if (err) {
            console.error('File download error:', err);
            res.status(404).send('File not found.');
        }
    });
});

// Route for downloading Barclays General Insurance Document PDF
app.get('/download-barclays-general-insurance', (req, res) => {
    const file = path.join(uploadDir, 'download-barclays-general-insurance.pdf'); // Ensure this file exists
    res.download(file, 'barclays-general-insurance.pdf', (err) => {
        if (err) {
            console.error('File download error:', err);
            res.status(404).send('File not found.');
        }
    });
});

// Route for downloading NRI Services PDF
app.get('/download-nri-services', (req, res) => {
    const file = path.join(uploadDir, 'download-nri-services.pdf'); // Ensure this file exists
    res.download(file, 'nri-services.pdf', (err) => {
        if (err) {
            console.error('File download error:', err);
            res.status(404).send('File not found.');
        }
    });
});

// Route for downloading Barclays Mutual Fund PDF
app.get('/download-barclays-mutual-fund', (req, res) => {
    const file = path.join(uploadDir, 'download-barclays-mutual-fund.pdf'); // Ensure this file exists
    res.download(file, 'barclays-mutual-fund.pdf', (err) => {
        if (err) {
            console.error('File download error:', err);
            res.status(404).send('File not found.');
        }
    });
});

// Route for downloading Barclays Life Insurance PDF
app.get('/download-barclays-life-insurance', (req, res) => {
    const file = path.join(uploadDir, 'download-barclays-life-insurance.pdf'); // Ensure this file exists
    res.download(file, 'barclays-life-insurance.pdf', (err) => {
        if (err) {
            console.error('File download error:', err);
            res.status(404).send('File not found.');
        }
    });
});

// Route for downloading Barclays Securities PDF
app.get('/download-barclays-securities', (req, res) => {
    const file = path.join(uploadDir, 'download-barclays-securities.pdf'); // Ensure this file exists
    res.download(file, 'barclays-securities.pdf', (err) => {
        if (err) {
            console.error('File download error:', err);
            res.status(404).send('File not found.');
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
